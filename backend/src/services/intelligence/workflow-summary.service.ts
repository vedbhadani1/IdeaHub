import prisma from '../../config/db';
import { AppError } from '../../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../infrastructure/observability/logger';
import { eventBus, INTERNAL_EVENTS } from '../events/internal.emitter';
import { config } from '../../config/env.config';
import Groq from 'groq-sdk';

// Lazy singleton — avoids crashing if the key is missing at boot
let _groq: Groq | null = null;
function getGroqClient(): Groq {
  if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');
  if (!_groq) _groq = new Groq({ apiKey: config.GROQ_API_KEY });
  return _groq;
}

const MAX_COMMENTS_FOR_CONTEXT = 20;
const MAX_CONTEXT_TOKENS_ESTIMATE = 3000;

export interface WorkflowSummaryResult {
  summary: string;
  keyPoints: string[];
  risks: string[];
  nextActions: string[];
}

export class WorkflowSummaryService {
  // In-memory locking mechanism to prevent parallel generations for the same post
  private inFlightSummaries = new Map<number, Promise<WorkflowSummaryResult>>();

  /**
   * Prepares a bounded context object for future LLM summarization.
   * STRICT CONTEXT BOUNDING: Prevents massive prompt sizes and AI cost explosions.
   */
  public async buildSummaryContext(postId: number): Promise<{ context: string, post: any }> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          take: MAX_COMMENTS_FOR_CONTEXT // Truncate long threads
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Only grab recent transitions
        }
      }
    });

    if (!post) {
      throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'NOT_FOUND');
    }

    // Build deterministic text chunk
    let context = `Workflow Title: ${post.title}\n`;
    context += `Description: ${post.description.substring(0, 1000)}\n`; // Cap description
    context += `Status: ${post.status}\n\n`;

    context += `--- Recent Comments ---\n`;
    for (const comment of post.comments.reverse()) { // oldest first among the newest 20
      context += `[${comment.createdAt.toISOString()}] User ${comment.authorId}: ${comment.content.substring(0, 300)}\n`;
    }

    context += `\n--- Recent Transitions ---\n`;
    for (const log of post.auditLogs.reverse()) {
      context += `[${log.createdAt.toISOString()}] Action: ${log.actionType}\n`;
    }

    // Heuristic token safety check (approx 4 chars per token)
    if (context.length > MAX_CONTEXT_TOKENS_ESTIMATE * 4) {
      context = context.substring(0, MAX_CONTEXT_TOKENS_ESTIMATE * 4) + '\n...[TRUNCATED FOR AI SAFETY]';
    }

    return { context, post };
  }

  /**
   * Wrapper to deduplicate rapid parallel requests using an in-memory Promise map.
   */
  public async generateSummaryIdempotent(postId: number): Promise<WorkflowSummaryResult> {
    if (this.inFlightSummaries.has(postId)) {
      logger.info({ postId }, 'Summary generation already in-flight. Attaching to existing promise.');
      return this.inFlightSummaries.get(postId)!;
    }

    const generationPromise = this._generateSummaryInternal(postId);
    this.inFlightSummaries.set(postId, generationPromise);

    try {
      return await generationPromise;
    } finally {
      this.inFlightSummaries.delete(postId);
    }
  }

  /**
   * Strictly idempotent generator that checks the cache before invoking the Grok API.
   * Returns a structured JSON summary.
   */
  private async _generateSummaryInternal(postId: number): Promise<WorkflowSummaryResult> {
    let metrics = await prisma.workflowMetrics.findUnique({ where: { postId } });
    if (!metrics) {
      metrics = await prisma.workflowMetrics.create({
        data: {
          postId,
          slaStatus: 'HEALTHY',
          totalTimeBlocked: 0
        }
      });
    }

    const { context, post } = await this.buildSummaryContext(postId);

    // CACHE CHECK: If generatedAt is >= post.updatedAt, the cache is fresh!
    if (
      metrics.aiSummaryCache && 
      metrics.aiSummaryGeneratedAt && 
      metrics.aiSummaryGeneratedAt.getTime() >= post.updatedAt.getTime()
    ) {
      logger.info({ postId }, 'Returning CACHED AI Summary (idempotent skip).');
      this.emitSummary(postId, metrics.aiSummaryCache as any);
      return metrics.aiSummaryCache as any;
    }

    logger.info({ postId }, 'Cache miss or stale. Generating new AI Summary via Groq...');

    // PING GROQ
    let result: WorkflowSummaryResult;
    try {
      const groq = getGroqClient();

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert workflow analyst. Summarize the provided context and strictly return JSON only in this exact format:
{
  "summary": "2-3 sentences explaining the core issue and current state",
  "keyPoints": ["point 1", "point 2"],
  "risks": ["risk 1 if any"],
  "nextActions": ["action 1"]
}
Do not include markdown blocks. Just raw JSON.`
          },
          {
            role: 'user',
            content: `Please analyze this workflow:\n\n${context}`
          }
        ]
      });

      let rawContent = completion.choices?.[0]?.message?.content || '{}';

      // Clean markdown wrappers if the model still emits them
      rawContent = rawContent.replace(/^```json/m, '').replace(/```$/m, '').trim();
      result = JSON.parse(rawContent);

      // Validate structure heuristically
      if (!result.summary || !Array.isArray(result.keyPoints)) {
        throw new Error('Invalid JSON structure returned by Groq');
      }

    } catch (err) {
      logger.error({ err }, 'Groq API or JSON parse failed. Engaging graceful downgrade.');
      // Graceful fallback — never crash the worker
      result = {
        summary: 'AI summarization is currently unavailable. Please review the comments manually.',
        keyPoints: [],
        risks: [],
        nextActions: []
      };
    }

    // Persist to DB if it was a real generation
    if (result.keyPoints.length > 0) {
      await prisma.workflowMetrics.update({
        where: { postId },
        data: {
          aiSummaryCache: result as any,
          aiSummaryGeneratedAt: new Date()
        }
      });
    }

    this.emitSummary(postId, result);
    return result;
  }

  private emitSummary(postId: number, summary: WorkflowSummaryResult) {
    // Notify frontend, which will be protected by websocket room logic
    eventBus.emit(INTERNAL_EVENTS.POST_UPDATED, { 
      postId, 
      aiSummary: summary // frontend will listen to post updates and consume this
    });
  }
}

export const workflowSummaryService = new WorkflowSummaryService();

import prisma from '../../config/db';
import { AppError } from '../../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../infrastructure/observability/logger';
import { eventBus, INTERNAL_EVENTS } from '../events/internal.emitter';
import { config } from '../../config/env.config';

const MAX_COMMENTS_FOR_CONTEXT = 20;
const MAX_CONTEXT_TOKENS_ESTIMATE = 3000;

export interface WorkflowSummaryResult {
  summary: string;
  keyPoints: string[];
  risks: string[];
  nextActions: string[];
}

export class WorkflowSummaryService {
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
   * Strictly idempotent generator that checks the cache before invoking the Grok API.
   * Returns a structured JSON summary.
   */
  public async generateSummaryIdempotent(postId: number): Promise<WorkflowSummaryResult> {
    const metrics = await prisma.workflowMetrics.findUnique({ where: { postId } });
    if (!metrics) {
      throw new AppError('Workflow metrics not found', StatusCodes.NOT_FOUND, 'NOT_FOUND');
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

    logger.info({ postId }, 'Cache miss or stale. Generating new AI Summary via Grok...');

    // PING GROK
    let result: WorkflowSummaryResult;
    try {
      const apiKey = process.env.GROK_API_KEY;
      if (!apiKey) throw new Error('GROK_API_KEY is not configured');

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-2-latest',
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
Do not include markdown blocks like \`\`\`json. Just raw JSON.`
            },
            {
              role: 'user',
              content: `Please analyze this workflow:\n\n${context}`
            }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Grok API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let rawContent = data.choices?.[0]?.message?.content || '{}';
      
      // Attempt to clean if the model still returns markdown wrappers
      rawContent = rawContent.replace(/^```json/m, '').replace(/```$/m, '').trim();
      result = JSON.parse(rawContent);

      // Validate structure heuristically
      if (!result.summary || !Array.isArray(result.keyPoints)) {
        throw new Error('Invalid JSON structure returned by Grok');
      }

    } catch (err) {
      logger.error({ err }, 'Grok API or JSON parse failed. Engaging graceful downgrade.');
      // Graceful fallback
      result = {
        summary: "AI summarization is currently unavailable. Please review the comments manually.",
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

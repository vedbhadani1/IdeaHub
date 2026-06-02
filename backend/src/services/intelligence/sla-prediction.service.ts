import prisma from '../../config/db';
import { WorkflowStatus, SLAStatus } from '@prisma/client';
import { logger } from '../../infrastructure/observability/logger';

export interface SLARiskPrediction {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  breachProbability: number; // 0.0 to 1.0
  reasons: string[];
}

/**
 * Predictive SLA Breach Detection.
 * 
 * Predicts breaches BEFORE they happen.
 * Initially bounded to deterministic heuristics and rules.
 * DO NOT introduce black-box ML models here until the deterministic baseline is proven.
 */
export class SlaPredictionService {
  /**
   * Evaluates the SLA risk for a specific post.
   */
  public async predictPostRisk(postId: number): Promise<SLARiskPrediction> {
    const metrics = await prisma.workflowMetrics.findUnique({
      where: { postId },
      include: { post: true }
    });

    if (!metrics || !metrics.post || metrics.post.status === WorkflowStatus.DONE) {
      return { riskLevel: 'LOW', breachProbability: 0.0, reasons: [] };
    }

    const reasons: string[] = [];
    let riskScore = 0;

    // Rule 1: High Blocked Duration
    if (metrics.totalTimeBlocked > 86400) { // > 1 day blocked
      riskScore += 0.4;
      reasons.push('High historical blocked duration (>24h).');
    }

    // Rule 2: Active stagnation
    if (metrics.currentStatusStartedAt) {
      const activeDurationHours = (Date.now() - metrics.currentStatusStartedAt.getTime()) / (1000 * 60 * 60);
      if (activeDurationHours > 48) {
        riskScore += 0.3;
        reasons.push('Workflow stagnating in current status (>48h).');
      }
    }

    // Rule 3: Reassignment instability (Heuristic: high totalTimeTodo but currently in progress means it bounced)
    if (metrics.totalTimeInTodo > 172800) { // > 2 days in TODO overall
      riskScore += 0.2;
      reasons.push('High initial assignment delay.');
    }

    // Cap at 0.99
    riskScore = Math.min(riskScore, 0.99);

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let newSlaStatus: SLAStatus = SLAStatus.HEALTHY;

    if (riskScore >= 0.7) {
      riskLevel = 'HIGH';
      newSlaStatus = SLAStatus.BREACHED;
    } else if (riskScore >= 0.4) {
      riskLevel = 'MEDIUM';
      newSlaStatus = SLAStatus.AT_RISK;
    }

    logger.debug({ postId, riskLevel, riskScore, newSlaStatus }, 'SLA Risk Predicted');

    if (metrics.slaStatus !== newSlaStatus) {
      await prisma.workflowMetrics.update({
        where: { postId },
        data: { slaStatus: newSlaStatus }
      });
      // Optionally emit a websocket event here or in an eventbus
      import('../events/internal.emitter').then(({ eventBus, INTERNAL_EVENTS }) => {
        eventBus.emit(INTERNAL_EVENTS.POST_UPDATED, { postId, changes: { slaStatus: newSlaStatus } });
      });
    }

    return {
      riskLevel,
      breachProbability: riskScore,
      reasons
    };
  }
}

export const slaPredictionService = new SlaPredictionService();

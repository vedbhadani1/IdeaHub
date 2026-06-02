import prisma from '../../config/db';
import { logger } from '../../infrastructure/observability/logger';

export interface AssignmentRecommendation {
  recommendedAssignee: { id: number; name: string };
  score: number; // 0.0 to 1.0
  reasons: string[];
}

/**
 * Intelligent Assignment Engine.
 * 
 * STRICT GOVERNANCE CONSTRAINT:
 * This service is ADVISORY ONLY. It must NEVER automatically mutate the
 * workflow assignee without explicit human approval.
 */
export class AssignmentRecommendationService {
  /**
   * Recommends the best assignee for a post within a department.
   */
  public async recommendAssignee(departmentId: number): Promise<AssignmentRecommendation | null> {
    // 1. Fetch all users in department
    const users = await prisma.user.findMany({
      where: { departmentId },
      select: { id: true, name: true }
    });

    if (users.length === 0) return null;

    // 2. Fetch active workloads
    const activeTasks = await prisma.post.groupBy({
      by: ['assigneeId'],
      where: {
        departmentId,
        assigneeId: { in: users.map(u => u.id) },
        status: { notIn: ['DONE', 'BACKLOG'] }
      },
      _count: { id: true }
    });

    const workloadMap = new Map<number, number>();
    for (const task of activeTasks) {
      if (task.assigneeId) workloadMap.set(task.assigneeId, task._count.id);
    }

    // 3. Score candidates (Lowest workload wins for now)
    let bestCandidateId = users[0].id;
    let lowestWorkload = workloadMap.get(bestCandidateId) || 0;

    for (const user of users) {
      const currentWorkload = workloadMap.get(user.id) || 0;
      if (currentWorkload < lowestWorkload) {
        lowestWorkload = currentWorkload;
        bestCandidateId = user.id;
      }
    }

    const reasons = [
      `Selected based on lowest active workload (${lowestWorkload} active tasks).`
    ];

    logger.debug({ departmentId, recommendedAssigneeId: bestCandidateId }, 'Assignment Recommended');

    const bestUser = users.find(u => u.id === bestCandidateId)!;

    return {
      recommendedAssignee: { id: bestUser.id, name: bestUser.name },
      score: 0.85, // Deterministic confidence
      reasons
    };
  }
}

export const assignmentRecommendationService = new AssignmentRecommendationService();

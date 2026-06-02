import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { assignmentRecommendationService } from '../services/intelligence/assignment-recommendation.service';
import { aiQueue } from '../jobs/queues.config';
import prisma from '../config/db';

/* ---------- RECOMMEND ASSIGNEE ---------- */
export const recommendAssignee = async (req: Request, res: Response) => {
  const departmentId = Number(req.params.departmentId);

  if (isNaN(departmentId)) {
    throw new AppError('Invalid department ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  const recommendation = await assignmentRecommendationService.recommendAssignee(departmentId);

  if (!recommendation) {
    return successResponse(res, 'No recommendation available', null);
  }

  return successResponse(res, 'Assignment recommendation generated', recommendation);
};

/* ---------- TRIGGER WORKFLOW SUMMARY ---------- */
export const triggerSummary = async (req: Request, res: Response) => {
  const postId = Number(req.params.postId);

  if (isNaN(postId)) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  // Check if post exists and user has access to its department
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { departmentId: true, updatedAt: true }
  });

  if (!post) {
    throw new AppError('Post not found', StatusCodes.NOT_FOUND, 'NOT_FOUND');
  }

  // Basic RBAC/Scope check: if post is in a department, user must be in it or be Admin
  if (post.departmentId && req.user!.role !== 'ADMIN' && req.user!.role !== 'FOUNDER' && (req.user as any).departmentId !== post.departmentId) {
    throw new AppError('Forbidden', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  // Check if we can instantly return a cached version without queuing
  const metrics = await prisma.workflowMetrics.findUnique({ where: { postId } });
  if (
    metrics?.aiSummaryCache && 
    metrics.aiSummaryGeneratedAt && 
    metrics.aiSummaryGeneratedAt.getTime() >= post.updatedAt.getTime()
  ) {
    return successResponse(res, 'Summary retrieved from cache', metrics.aiSummaryCache);
  }

  // Deduplicate triggers by postId
  await aiQueue.add('generate-summary', { postId }, {
    jobId: `summary-${postId}-${post.updatedAt.getTime()}`,
  });

  return successResponse(res, 'Summary generation queued', null, {}, StatusCodes.ACCEPTED);
};

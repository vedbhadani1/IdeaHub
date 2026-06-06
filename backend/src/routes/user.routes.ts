import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { successResponse } from '../utils/response.util';
import { AppError } from '../utils/AppError';
import prisma from '../config/db';
import { StatusCodes } from 'http-status-codes';

const router = Router();

/* ---------- GET USER PROFILE ---------- */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) throw new AppError('Invalid user ID', StatusCodes.BAD_REQUEST);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });

  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND);

  return successResponse(res, 'User retrieved', user);
});

/* ---------- GET USER POSTS (ALL STATUSES) ---------- */
router.get('/:id/posts', authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) throw new AppError('Invalid user ID', StatusCodes.BAD_REQUEST);

  const posts = await prisma.post.findMany({
    where: { authorId: id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      status: true,
      priority: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      department: { select: { id: true, name: true, slug: true } },
      reactions: true,
      attachments: true,
      _count: { select: { comments: true, reactions: true } },
    },
  });

  return successResponse(res, 'User posts retrieved', posts);
});

export default router;

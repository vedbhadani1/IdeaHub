import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { FeedCardDTO, CommentDTO, mapToFeedCardDTO, mapToCommentDTO } from '../dtos/feed.dto';
import { CursorObj, buildPaginatedResult, encodeCursor, decodeCursor } from '../utils/pagination.util';

export type PaginatedFeedResult = {
  items: FeedCardDTO[];
  nextCursor?: string | null;
  hasMore: boolean;
};

export type PaginatedCommentResult = {
  items: CommentDTO[];
  nextCursor?: string;
  hasMore: boolean;
};

export class FeedService {
  /**
   * Fetch the main chronological post feed
   */
  public async getFeed(params: {
    cursor?: string;
    limit?: number;
    category?: any;
    status?: any;
    priority?: any;
    assigneeId?: number;
    authorId?: number;
    departmentId?: number;
    search?: string;
  }): Promise<PaginatedFeedResult> {
    const { cursor: nextCursor, limit = 20, category, status, priority, assigneeId, authorId, departmentId, search } = params;

    const cursorObj = nextCursor ? decodeCursor(nextCursor) : undefined;
    if (nextCursor && !cursorObj) throw new AppError('Invalid nextCursor format', 400);

    const where: any = {};
    if (category) where.category = category;
    if (status && status !== 'ALL') {
      where.status = status;
    } else if (status !== 'ALL') {
      // By default, exclude archived/completed posts from the main feed
      where.status = { not: 'DONE' };
    }
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (authorId) where.authorId = authorId;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const maxLimit = Math.min(limit, 50);

    const items = await prisma.post.findMany({
      where,
      take: maxLimit + 1,
      skip: cursorObj ? 1 : 0,
      cursor: cursorObj
        ? {
            createdAt_id: {
              createdAt: cursorObj.createdAt,
              id: Number(cursorObj.id),
            },
          }
        : undefined,
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
        departmentId: true,
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
        department: {
          select: { id: true, name: true, slug: true },
        },
        workflowMetrics: {
          select: { slaStatus: true, totalTimeBlocked: true },
        },
        _count: {
          select: { comments: true, reactions: true },
        },
      },
    });

    const hasMore = items.length > maxLimit;
    const paginatedItems = hasMore ? items.slice(0, maxLimit) : items;
    const nextCursorString =
      paginatedItems.length > 0
        ? encodeCursor({
            createdAt: paginatedItems[paginatedItems.length - 1].createdAt,
            id: paginatedItems[paginatedItems.length - 1].id,
          })
        : null;

    return {
      items: paginatedItems.map(mapToFeedCardDTO as any),
      nextCursor: nextCursorString,
      hasMore,
    };
  }

  /**
   * Fetch top-level comments for a specific post
   */
  public async getPostComments(postId: number, cursorStr: string | undefined, limit: number): Promise<PaginatedCommentResult> {
    const cursor = cursorStr ? decodeCursor(cursorStr) : undefined;
    const args: any = {
      where: { postId, parentId: null },
      take: limit + 1,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true } },
        _count: { select: { replies: true } },
      }
    };

    if (cursor) {
      args.cursor = {
        createdAt_id: {
          createdAt: cursor.createdAt,
          id: Number(cursor.id),
        },
      };
      args.skip = 1;
    }

    const comments = await prisma.comment.findMany(args);

    const paginated = buildPaginatedResult(comments, limit, (c: any) => ({ createdAt: c.createdAt, id: c.id }));

    return {
      items: paginated.results.map(mapToCommentDTO as any),
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    };
  }

  /**
   * Fetch replies for a specific comment
   */
  public async getCommentReplies(parentId: number, cursorStr: string | undefined, limit: number): Promise<PaginatedCommentResult> {
    const cursor = cursorStr ? decodeCursor(cursorStr) : undefined;
    const args: any = {
      where: { parentId },
      take: limit + 1,
      orderBy: [
        { createdAt: 'asc' }, // Usually replies are ascending (oldest first)
        { id: 'asc' }
      ],
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true } },
        _count: { select: { replies: true } },
      }
    };

    if (cursor) {
      args.cursor = {
        createdAt_id: {
          createdAt: cursor.createdAt,
          id: Number(cursor.id),
        },
      };
      args.skip = 1;
    }

    const replies = await prisma.comment.findMany(args);

    const paginated = buildPaginatedResult(replies, limit, (c: any) => ({ createdAt: c.createdAt, id: c.id }));

    return {
      items: paginated.results.map(mapToCommentDTO as any),
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    };
  }
}

export const feedService = new FeedService();

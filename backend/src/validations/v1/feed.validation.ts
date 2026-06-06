import { z } from 'zod';
import { decodeCursor } from '../../utils/pagination.util';

// Reusable limit schema ensuring we don't fetch more than 50 at a time
export const feedLimitSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => {
    const num = Number(val);
    if (isNaN(num) || num < 1) return 20; // Default
    if (num > 50) return 50; // Hard max limit
    return num;
  });

// Schema for the opaque base64 cursor token
export const cursorSchema = z.string().optional().transform((val, ctx) => {
  if (!val) return undefined;
  
  const decoded = decodeCursor(val);
  if (!decoded) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid cursor format',
    });
    return z.NEVER;
  }
  
  return decoded;
});

export const getFeedSchema = z.object({
  query: z.object({
    cursor: cursorSchema,
    limit: feedLimitSchema,
    category: z.enum(['BUG', 'IMPROVEMENT', 'SUGGESTION', 'FEATURE', 'IDEA', 'DISCUSSION']).optional(),
    status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE', 'ALL']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    search: z.string().optional(), // Left in for now, ILIKE search
    assigneeId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    authorId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
  }).strict()
});

export const getCommentsSchema = z.object({
  query: z.object({
    cursor: cursorSchema,
    limit: feedLimitSchema,
  }).strict(),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Post ID must be numeric').transform(Number)
  }).strict()
});

export const getRepliesSchema = z.object({
  query: z.object({
    cursor: cursorSchema,
    limit: feedLimitSchema,
  }).strict(),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Comment ID must be numeric').transform(Number)
  }).strict()
});

// ── User ──────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'FOUNDER' | 'FRONTEND' | 'BACKEND' | 'DEVOPS' | 'AI_ML';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  _count?: { posts: number; comments: number };
}

// ── Post ──────────────────────────────────────────────
export type PostCategory =
  | 'BUG'
  | 'IMPROVEMENT'
  | 'SUGGESTION'
  | 'FEATURE'
  | 'IDEA'
  | 'DISCUSSION';

export type PostStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Reaction {
  id: number;
  emoji: string;
  userId: number;
  postId?: number;
  commentId?: number;
}

export interface Attachment {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
}

export interface Post {
  id: number;
  title: string;
  description: string;
  category: PostCategory;
  status: PostStatus;
  priority: Priority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: User;
  authorId: number;
  assignee?: User;
  assigneeId?: number;
  reactions: Reaction[];
  comments?: Comment[];
  attachments?: Attachment[];
  _count?: { comments: number; reactions?: number };
}

// ── Comment ───────────────────────────────────────────
export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  author: User;
  postId: number;
  parentId?: number;
  reactions: Reaction[];
  replies?: Comment[];
}

// ── Notification ──────────────────────────────────────
export interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId: number;
}

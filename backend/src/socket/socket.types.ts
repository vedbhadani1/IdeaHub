export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  WORKFLOW_STATUS_CHANGED: 'workflow:statusChanged',
  DEPARTMENT_POST_CREATED: 'department:postCreated',
  TIMELINE_NEW: 'timeline:new', // Phase 4A
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

export type NotificationSocketDTO = {
  id: number;
  type: 'MENTION' | 'ASSIGNMENT' | 'COMMENT_REPLY' | 'POST_UPDATE';
  metadata: any | null; 
  createdAt: Date;
  readAt: Date | null;
  actorId: number | null;
  postId: number | null;
  commentId: number | null;
};

// Activity Timeline DTO (Never expose raw AuditLog)
export type ActivityTimelineDTO = {
  id: string;
  actionType: string;
  entityType: string;
  metadata: any;
  createdAt: Date;
  actor: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
};

export interface ServerToClientEvents {
  [SOCKET_EVENTS.NOTIFICATION_NEW]: (payload: NotificationSocketDTO) => void;
  [SOCKET_EVENTS.WORKFLOW_STATUS_CHANGED]: (payload: { postId: number, status: string, departmentId: number | null, assigneeId: number | null }) => void;
  [SOCKET_EVENTS.DEPARTMENT_POST_CREATED]: (payload: { postId: number, departmentId: number }) => void;
  [SOCKET_EVENTS.TIMELINE_NEW]: (payload: ActivityTimelineDTO & { departmentId: number | null }) => void;
}

// Events the client can send to the server
export interface ClientToServerEvents {
  // Empty for now until we add collaborative features or chat
}

// Internal inter-server events (for Redis adapters later)
export interface InterServerEvents {
  ping: () => void;
}

// Attached to the socket instance upon successful auth
export interface SocketData {
  userId: number;
}

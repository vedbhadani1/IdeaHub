import { eventBus, INTERNAL_EVENTS } from '../services/events/internal.emitter';
import { emitToUser, emitToDepartment } from './io';
import { SOCKET_EVENTS, NotificationSocketDTO } from './socket.types';

export const initializeSocketEventHandlers = () => {
  
  eventBus.subscribe(
    INTERNAL_EVENTS.NOTIFICATION_CREATED, 
    ({ userId, notification }: { userId: number; notification: NotificationSocketDTO }) => {
      // Fire and forget: Emit the lightweight DTO to the specific user's room
      emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
    }
  );

  eventBus.subscribe(
    INTERNAL_EVENTS.POST_UPDATED,
    async (payload: { postId: number; departmentId: number | null; assigneeId: number | null; actorId: number; changes: any; auditLog?: any; aiSummary?: any }) => {
      // 1. Broadcast scoped state changes to the department
      if (payload.departmentId) {
        emitToDepartment(payload.departmentId, SOCKET_EVENTS.WORKFLOW_STATUS_CHANGED, {
          postId: payload.postId,
          status: payload.changes.status || payload.changes.assigneeId,
          departmentId: payload.departmentId,
          assigneeId: payload.assigneeId,
        });
      }
      
      // 2. Also notify the assignee explicitly
      if (payload.assigneeId) {
        emitToUser(payload.assigneeId, SOCKET_EVENTS.WORKFLOW_STATUS_CHANGED, {
          postId: payload.postId,
          status: payload.changes.status || payload.changes.assigneeId,
          departmentId: payload.departmentId,
          assigneeId: payload.assigneeId,
        });
      }

      // 3. Emit Timeline DTO if an audit log was generated
      if (payload.auditLog && payload.departmentId) {
        // Fetch actor details for DTO
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient(); // ideally pass this via DI or import, keeping it simple here
        const actor = await prisma.user.findUnique({ where: { id: payload.actorId }, select: { id: true, name: true, avatarUrl: true } });

        if (actor) {
          const timelineDTO = {
            id: payload.auditLog.id,
            actionType: payload.auditLog.actionType,
            entityType: payload.auditLog.entityType,
            metadata: payload.auditLog.metadata,
            createdAt: payload.auditLog.createdAt,
            actor,
            departmentId: payload.departmentId
          };
          emitToDepartment(payload.departmentId, SOCKET_EVENTS.TIMELINE_NEW, timelineDTO);
        }
      }

      // 4. Emit AI Summary
      if (payload.aiSummary) {
        // Find department ID if not provided directly
        let targetDepartmentId = payload.departmentId;
        if (!targetDepartmentId) {
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient();
          const post = await prisma.post.findUnique({ where: { id: payload.postId }, select: { departmentId: true } });
          targetDepartmentId = post?.departmentId;
        }

        if (targetDepartmentId) {
          emitToDepartment(targetDepartmentId, SOCKET_EVENTS.WORKFLOW_SUMMARY_GENERATED, {
            postId: payload.postId,
            aiSummary: payload.aiSummary
          });
        }
      }
    }
  );
};

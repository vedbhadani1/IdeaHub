import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.config';
import { setIo } from './io';
import prisma from '../config/db';
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from './socket.types';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient, redisSubClient } from '../infrastructure/redis/redis.client';
import { logger } from '../infrastructure/observability/logger';

export const initializeSocketServer = (httpServer: http.Server) => {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    adapter: createAdapter(redisClient, redisSubClient),
  });

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      // Extract from auth object or fallback to standard headers
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: number };
      
      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid payload'));
      }

      // Attach user to socket
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token invalid or expired'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;

    // Securely join the deterministic user room.
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    // Phase 5B: Explicitly fetch user from DB to verify department authorization and RBAC permissions.
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true, role: true }
      });

      if (user?.departmentId) {
        // Enforce RBAC on WebSocket Level
        const { authorizationService } = require('../services/authorization.service');
        const hasDeptView = await authorizationService.hasPermission(user.role, 'department.view');
        
        if (hasDeptView) {
          socket.join(`department:${user.departmentId}`);
        }
      }
    } catch (err) {
      console.error('Failed to authorize department room join', err);
    }

    socket.on('disconnect', () => {
      // Memory Leak Prevention
      socket.removeAllListeners();
    });
  });

  // Store the io instance functionally
  setIo(io);

  return io;
};

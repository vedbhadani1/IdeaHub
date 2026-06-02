import { Server } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from './socket.types';

// The initialized socket.io instance
let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

export const setIo = (serverIo: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
  io = serverIo;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

/**
 * Functional wrapper to emit an event to a specific user's room.
 * This completely decouples emitting logic from the heavy server instance.
 */
export const emitToUser = <Ev extends keyof ServerToClientEvents>(
  userId: number,
  event: Ev,
  ...args: Parameters<ServerToClientEvents[Ev]>
) => {
  if (!io) return; // Fail gracefully if socket server isn't up
  io.to(`user:${userId}`).emit(event, ...args);
};

export const emitToDepartment = <Ev extends keyof ServerToClientEvents>(
  departmentId: number,
  event: Ev,
  ...args: Parameters<ServerToClientEvents[Ev]>
) => {
  if (!io) return;
  io.to(`department:${departmentId}`).emit(event, ...args);
};

import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
// We extract the base URL from API_URL by removing /api or /v1 etc.
const BASE_URL = API_URL.replace(/\/api.*$/, '');

export const socket: Socket = io(BASE_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

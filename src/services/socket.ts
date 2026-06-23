import { io, Socket } from 'socket.io-client';
import { env } from '@/core/config/env';

let socket: Socket | null = null;

function getSocketUrl(): string {
  const base = env.EXPO_PUBLIC_API_BASE_URL;
  return base.replace(/\/api\/?$/, '');
}

export function conectarSocket(token?: string): Socket {
  if (socket?.connected) return socket;

  socket = io(getSocketUrl(), {
    transports: ['websocket'],
    autoConnect: true,
    ...(token ? { auth: { token } } : {}),
  });

  socket.on('connect', () => {
    console.log('[Socket] Conectado:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Desconectado:', reason);
  });

  socket.on('connect_error', (err) => {
    console.log('[Socket] Error de conexión:', err.message);
  });

  return socket;
}

export function getSocket(): Socket {
  if (!socket) throw new Error('[Socket] No conectado — llama conectarSocket primero');
  return socket;
}

export function desconectarSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

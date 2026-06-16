import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { env } from '@/core/config/env';
import type { ChatMessage } from '../domain/chat.entity';

export interface OnlineUser {
  socketId: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface ChatHookResult {
  messages: ChatMessage[];
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  usersOnline: number;
  sendMessage: (text: string) => void;
  notification: string | null;
  clearNotification: () => void;
}

function getSocketUrl(): string {
  const base = env.EXPO_PUBLIC_API_BASE_URL;
  return base.replace(/\/api\/?$/, '');
}

export function useChat(): ChatHookResult {
  const user = useAuthStore((s) => s.user);
  const username = user?.fullName?.trim() || user?.email?.split('@')[0] || 'Usuario';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = getSocketUrl();
    const socket: Socket = io(socketUrl, {
      autoConnect: true,
      transports: ['websocket'],
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('usuario-conectado', { nombre: user?.fullName || '', email: user?.email || '', rol: user?.role || '' });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('mensaje-recibido', (payload: { text: string; from: string; timestamp: string }) => {
      // Evitar duplicados: si el mensaje es propio, ya fue agregado optimísticamente en sendMessage
      if (payload.from === username) return;
      setMessages((prev) => [...prev, { ...payload, isOwn: false }]);
    });

    socket.on('usuarios-online', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socket.on('usuario-conectado', (data: { username: string }) => {
      setNotification(`${data.username} se unió al chat`);
    });

    socket.on('usuario-desconectado', (data: { username: string }) => {
      setNotification(`${data.username} abandonó el chat`);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('mensaje-recibido');
      socket.off('usuarios-online');
      socket.off('usuario-conectado');
      socket.off('usuario-desconectado');
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [username]);

  const sendMessage = useCallback((text: string) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !text.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = { text: text.trim(), from: username, timestamp, isOwn: true };

    socket.emit('enviar-mensaje', { text: text.trim(), from: username, timestamp });
    setMessages((prev) => [...prev, message]);
  }, [username]);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    messages,
    isConnected,
    onlineUsers,
    usersOnline: onlineUsers.length,
    sendMessage,
    notification,
    clearNotification,
  };
}

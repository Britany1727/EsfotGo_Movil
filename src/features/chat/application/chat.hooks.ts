import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { env } from '@/core/config/env';
import type { ChatMessage } from '../domain/chat.entity';
import { ChatRepository } from '../infrastructure/chat.repository';
import { NotificationService } from '@/core/notifications/notification.service';

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
    let historyLoaded = false;

    const loadHistory = async () => {
      try {
        const history = await ChatRepository.getMessages('general');
        if (history.length > 0 && !historyLoaded) {
          const mapped: ChatMessage[] = history.map((m) => ({
            text: m.content,
            from: m.senderName,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOwn: m.senderName === username,
          }));
          setMessages(mapped);
          historyLoaded = true;
          console.log(`[useChat] Historial cargado: ${mapped.length} mensajes`);
        }
      } catch {
        console.log('[useChat] No se pudo cargar el historial vía REST');
      }
    };

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
      if (!historyLoaded) loadHistory();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('reconnect', () => {
      console.log('[useChat] Reconectado — recargando historial');
      historyLoaded = false;
      loadHistory();
    });

    socket.on('chat-history', (history: { text: string; from: string; timestamp: string }[]) => {
      if (historyLoaded) return;
      const mapped: ChatMessage[] = history.map((m) => ({
        text: m.text,
        from: m.from,
        timestamp: m.timestamp,
        isOwn: m.from === username,
      }));
      setMessages(mapped);
      historyLoaded = true;
      console.log(`[useChat] Historial cargado vía socket: ${mapped.length} mensajes`);
    });

    socket.on('mensaje-recibido', (payload: { text: string; from: string; timestamp: string }) => {
      if (payload.from === username) return;
      setMessages((prev) => [...prev, { ...payload, isOwn: false }]);
      NotificationService.sendLocal('Chat General', `${payload.from}: ${payload.text}`);
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
      socket.off('reconnect');
      socket.off('chat-history');
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
    const role = user?.role;
    if (role !== 'administrador' && role !== 'gestor' && role !== 'docente') return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = { text: text.trim(), from: username, timestamp, isOwn: true };

    socket.emit('enviar-mensaje', { text: text.trim(), from: username, timestamp });
    ChatRepository.sendMessage('general', username, text.trim());
    setMessages((prev) => [...prev, message]);
  }, [username, user?.role]);

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

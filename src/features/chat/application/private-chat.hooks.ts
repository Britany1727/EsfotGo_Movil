import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { httpClient } from '@/services/http-client';
import { env } from '@/core/config/env';
import { PrivateChatRepository } from '../infrastructure/private-chat.repository';
import type { PrivateMessage, Conversation } from '../domain/private-message.entity';

function getSocketUrl(): string {
  const base = env.EXPO_PUBLIC_API_BASE_URL;
  return base.replace(/\/api\/?$/, '');
}

export function usePrivateChat(conversationId: string | null) {
  const user = useAuthStore((s) => s.user);
  const username = user?.fullName?.trim() || user?.email?.split('@')[0] || 'Usuario';

  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const socket: Socket = io(getSocketUrl(), {
      autoConnect: true,
      transports: ['websocket'],
      forceNew: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { conversationId, username });
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('private-message', (msg: PrivateMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('previous-messages', (msgs: PrivateMessage[]) => {
      setMessages(msgs);
    });

    return () => {
      socket.emit('leave-room', { conversationId });
      socket.disconnect();
    };
  }, [conversationId, username]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !socketRef.current || !conversationId || !user) return;
      socketRef.current.emit('private-message', {
        conversationId,
        senderId: user.id,
        senderName: username,
        text: text.trim(),
      });
    },
    [conversationId, user, username],
  );

  return { messages, isConnected, sendMessage };
}

interface ChatUser {
  _id: string;
  nombre: string;
  apellido?: string;
  email: string;
  rol: string;
}

export function useUserList() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      httpClient.get<any[]>('/estudiantes').then((r) => (r.data ?? []) as any[]),
      httpClient.get<any[]>('/docentes').then((r) => (r.data ?? []) as any[]),
    ]).then(([estRes, docRes]) => {
      const est = (estRes || []).map((u: any) => ({
        _id: u._id ?? '',
        nombre: u.nombre ?? '',
        apellido: u.apellido,
        email: u.email ?? '',
        rol: 'estudiante',
      }));
      const doc = (docRes || []).map((u: any) => ({
        _id: u._id ?? '',
        nombre: u.nombre ?? '',
        apellido: u.apellido,
        email: u.email ?? '',
        rol: 'docente',
      }));
      setUsers([...doc, ...est]);
    }).catch(() => {
      // Silently handle — user list is non-critical
    }).finally(() => setLoading(false));
  }, []);

  const getConversation = useCallback(async (targetId: string) => {
    return PrivateChatRepository.getOrCreateConversation(
      useAuthStore.getState().user?.id ?? '',
      targetId,
    );
  }, []);

  return { users, loading, getConversation };
}

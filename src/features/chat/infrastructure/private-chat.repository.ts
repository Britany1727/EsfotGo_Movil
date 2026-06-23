import { httpClient } from '@/services/http-client';
import type { Conversation, PrivateMessage } from '../domain/private-message.entity';

const BASE = '/chat';

export const PrivateChatRepository = {
  async getOrCreateConversation(
    userId: string,
    targetId: string,
  ): Promise<Conversation> {
    console.log('[PrivateChatRepo] Creando/obteniendo conversacion:', userId, '<->', targetId);
    const { data, error } = await httpClient.post<Conversation>(
      `${BASE}/conversation`,
      { participantIds: [userId, targetId] },
    );
    if (error || !data) {
      console.log('[PrivateChatRepo] Error en getOrCreateConversation:', error);
      throw new Error(error ?? 'Error al crear conversacion');
    }
    console.log('[PrivateChatRepo] Conversacion obtenida:', data._id);
    return data;
  },

  async getMessages(conversationId: string): Promise<PrivateMessage[]> {
    const { data, error } = await httpClient.get<PrivateMessage[]>(
      `${BASE}/conversation/${conversationId}/messages`,
    );
    if (error) {
      console.log('[PrivateChatRepo] Error cargando mensajes:', error);
      return [];
    }
    console.log(`[PrivateChatRepo] ${(data ?? []).length} mensajes cargados para ${conversationId}`);
    return data ?? [];
  },

  async getConversations(): Promise<Conversation[]> {
    const { data, error } = await httpClient.get<Conversation[]>(
      `${BASE}/conversations`,
    );
    if (error) {
      console.log('[PrivateChatRepo] Error cargando conversaciones:', error);
      return [];
    }
    return data ?? [];
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    text: string,
  ): Promise<PrivateMessage> {
    const { data, error } = await httpClient.post<PrivateMessage>(
      `${BASE}/private-message`,
      { conversationId, senderId, senderName, text },
    );
    if (error || !data) {
      console.log('[PrivateChatRepo] Error enviando mensaje privado:', error);
      throw new Error(error ?? 'Error al enviar mensaje');
    }
    return data;
  },
};

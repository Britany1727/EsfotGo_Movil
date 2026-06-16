import { httpClient } from '@/services/http-client';
import type { Conversation, PrivateMessage } from '../domain/private-message.entity';

const BASE = '/chat';

export const PrivateChatRepository = {
  async getOrCreateConversation(
    userId: string,
    targetId: string,
  ): Promise<Conversation> {
    const { data, error } = await httpClient.post<Conversation>(
      `${BASE}/conversation`,
      { participantIds: [userId, targetId] },
    );
    if (error || !data) throw new Error(error ?? 'Error al crear conversacion');
    return data;
  },

  async getMessages(conversationId: string): Promise<PrivateMessage[]> {
    const { data, error } = await httpClient.get<PrivateMessage[]>(
      `${BASE}/conversation/${conversationId}/messages`,
    );
    if (error) throw new Error(error);
    return data ?? [];
  },

  async getConversations(): Promise<Conversation[]> {
    const { data, error } = await httpClient.get<Conversation[]>(
      `${BASE}/conversations`,
    );
    if (error) throw new Error(error);
    return data ?? [];
  },
};

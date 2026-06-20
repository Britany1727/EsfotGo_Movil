import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { PrivateChatRepository } from '../infrastructure/private-chat.repository';
import type { Conversation } from '../domain/private-message.entity';
import { LightTheme as T, Typography, Sizes, Shadows } from '@/constants/design-system';
import { MessageCircle, ChevronRight } from 'lucide-react-native';

interface Props {
  onSelectConversation: (conversationId: string, userName: string) => void;
}

export function ConversationsList({ onSelectConversation }: Props) {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const convs = await PrivateChatRepository.getConversations();
      setConversations(convs);
    } catch (err) {
      console.log('[ConversationsList] Error cargando conversaciones:', (err as Error)?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyArt}>
          <MessageCircle size={36} strokeWidth={1.5} color={T.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>Sin conversaciones</Text>
        <Text style={styles.emptySub}>
          Inicia un chat desde la Lista de Contactos
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => {
        const otherParticipantId = item.participantIds.find((id) => id !== user?.id);
        const otherName = otherParticipantId
          ? (item.participantNames?.[otherParticipantId] ?? 'Usuario')
          : 'Usuario';

        return (
          <Pressable
            style={styles.convCard}
            onPress={() => onSelectConversation(item._id, otherName)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.convInfo}>
              <Text style={styles.convName} numberOfLines={1}>{otherName}</Text>
              {item.lastMessage && (
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              )}
            </View>
            <ChevronRight size={18} strokeWidth={1.8} color={T.textTertiary} />
          </Pressable>
        );
      }}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Sizes.paddingXl,
    gap: 12,
  },
  emptyArt: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { ...Typography.h4, color: T.textSecondary },
  emptySub: {
    ...Typography.caption, color: T.textTertiary,
    textAlign: 'center', maxWidth: 240,
  },
  list: { paddingHorizontal: Sizes.paddingMd, paddingTop: 8 },
  convCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: Sizes.radiusLg, padding: 14, gap: 12,
    marginBottom: 8,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: T.primary },
  convInfo: { flex: 1, gap: 3 },
  convName: { ...Typography.body, fontWeight: '700', color: T.textPrimary },
  lastMsg: { ...Typography.caption, color: T.textSecondary },
});

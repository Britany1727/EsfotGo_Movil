import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { useChat } from '../application/chat.hooks';
import type { ChatMessage } from '../domain/chat.entity';
import { useAuthStore } from '@/store/auth.store';
import { LightTheme as T, Typography, Sizes, Shadows } from '@/constants/design-system';
import { Send, MessageCircle, Inbox, Users } from 'lucide-react-native';
import { ConversationsList } from './conversations-list';
import { PrivateChatList } from './private-chat-list';
import { PrivateChatRoom } from './private-chat-room';

type ChatTab = 'inbox' | 'global' | 'contacts';

export function ChatScreen() {
  const user = useAuthStore((s) => s.user);
  const username = user?.fullName?.trim() || user?.email?.split('@')[0] || 'Usuario';
  const canSend = user?.role === 'administrador' || user?.role === 'gestor' || user?.role === 'docente';

  const { messages, isConnected, usersOnline, sendMessage, notification, clearNotification } = useChat();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const notifOpacity = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  const [activeTab, setActiveTab] = useState<ChatTab>('global');
  const [privateRoom, setPrivateRoom] = useState<{ conversationId: string; userName: string } | null>(null);

  const pulseAnimStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));
  const notifAnimStyle = useAnimatedStyle(() => ({
    opacity: notifOpacity.value,
  }));

  useEffect(() => {
    if (isConnected) {
      pulseOpacity.value = withRepeat(
        withTiming(0.3, { duration: 1000 }),
        -1,
        true,
      );
      return () => cancelAnimation(pulseOpacity);
    } else {
      pulseOpacity.value = 0.35;
    }
  }, [isConnected, pulseOpacity]);

  useEffect(() => {
    if (notification) {
      notifOpacity.value = withTiming(1, { duration: 200 }, () => {
        notifOpacity.value = withDelay(3000, withTiming(0, { duration: 400 }, () => {
          clearNotification();
        }));
      });
    }
  }, [notification, notifOpacity, clearNotification]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  }, [inputText, sendMessage]);

  const handleSelectConversation = useCallback(
    (conversationId: string, userName: string) => {
      setPrivateRoom({ conversationId, userName });
    },
    [],
  );

  const handleBackFromRoom = useCallback(() => {
    setPrivateRoom(null);
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !item.isOwn && (!prevMessage || prevMessage.from !== item.from);
    const showName = !item.isOwn && (!prevMessage || prevMessage.from !== item.from);

    return (
      <View style={[styles.msgRow, item.isOwn && styles.msgRowOwn]}>
        {!item.isOwn && (
          <View style={styles.avatarCol}>
            {showAvatar && (
              <View style={styles.msgAvatar}>
                <Text style={styles.msgAvatarText}>
                  {item.from.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.msgBubble, item.isOwn ? styles.msgBubbleOwn : styles.msgBubbleOther]}>
          {showName && (
            <Text style={styles.msgFrom}>{item.from}</Text>
          )}
          <Text style={[styles.msgText, item.isOwn && styles.msgTextOwn]}>
            {item.text}
          </Text>
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, item.isOwn && styles.msgTimeOwn]}>
              {item.timestamp}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [messages]);

  if (privateRoom) {
    return (
      <PrivateChatRoom
        conversationId={privateRoom.conversationId}
        userName={privateRoom.userName}
        onBack={handleBackFromRoom}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Chat ESFOT</Text>
            <View style={styles.statusRow}>
              <Animated.View style={[styles.onlineDot, { opacity: isConnected ? undefined : 0.35 }, isConnected ? styles.onlineDotActive : styles.onlineDotOff, pulseAnimStyle]} />
              <Text style={styles.statusText}>
                {isConnected ? `${usersOnline} en línea` : 'Conectando...'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'inbox' && styles.tabActive]}
          onPress={() => { setActiveTab('inbox'); setPrivateRoom(null); }}
        >
          <Inbox size={14} strokeWidth={2} color={activeTab === 'inbox' ? '#FFFFFF' : T.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.tabTextActive]}>
            Mis Mensajes
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'global' && styles.tabActive]}
          onPress={() => { setActiveTab('global'); setPrivateRoom(null); }}
        >
          <MessageCircle size={14} strokeWidth={2} color={activeTab === 'global' ? '#FFFFFF' : T.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>
            Chat General
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'contacts' && styles.tabActive]}
          onPress={() => { setActiveTab('contacts'); setPrivateRoom(null); }}
        >
          <Users size={14} strokeWidth={2} color={activeTab === 'contacts' ? '#FFFFFF' : T.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>
            Contactos
          </Text>
        </Pressable>
      </View>

      {activeTab === 'inbox' && (
        <ConversationsList onSelectConversation={handleSelectConversation} />
      )}

      {activeTab === 'global' && (
        <>
          {notification && (
            <Animated.View style={[styles.notifBanner, notifAnimStyle]}>
              <Text style={styles.notifText}>{notification}</Text>
            </Animated.View>
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyArt}>
                  <MessageCircle size={36} strokeWidth={1.5} color={T.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>No hay mensajes aún</Text>
                <Text style={styles.emptySub}>¡Sé el primero en escribir!</Text>
              </View>
            }
            removeClippedSubviews
            maxToRenderPerBatch={15}
            windowSize={7}
            initialNumToRender={20}
          />

          {canSend ? (
            <View style={styles.inputBar}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Escribe un mensaje..."
                  placeholderTextColor={T.inputPlaceholder}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  blurOnSubmit
                />
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnOff]}
                onPress={handleSend}
                disabled={!inputText.trim()}
                activeOpacity={0.8}
              >
                <Send size={18} color={inputText.trim() ? '#FFFFFF' : T.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.readOnlyBar}>
              <Text style={styles.readOnlyText}>
                Solo docentes y administradores pueden enviar mensajes
              </Text>
            </View>
          )}
        </>
      )}

      {activeTab === 'contacts' && (
        <PrivateChatList onSelectUser={handleSelectConversation} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  header: {
    paddingHorizontal: Sizes.paddingMd,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 14,
    backgroundColor: T.surfaceGlass,
    borderBottomWidth: 1, borderBottomColor: T.divider,
    ...Shadows.sm,
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: T.primaryMuted, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: T.primaryLight + '30',
  },
  headerAvatarText: { fontSize: 18, fontWeight: '800', color: T.primary },
  headerTextWrap: { flex: 1 },
  headerTitle: { ...Typography.h4, color: T.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineDotActive: { backgroundColor: T.success },
  onlineDotOff: { backgroundColor: T.textTertiary },
  statusText: { fontSize: 12, color: T.textSecondary },
  notifBanner: {
    backgroundColor: T.infoBg, paddingVertical: 8, paddingHorizontal: Sizes.paddingMd,
    borderBottomWidth: 1, borderBottomColor: T.cardBorder,
  },
  notifText: { fontSize: 12, color: T.info, textAlign: 'center' },
  msgList: { padding: Sizes.paddingMd, gap: 4, flexGrow: 1 },
  msgRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 6 },
  msgRowOwn: { justifyContent: 'flex-end' },
  avatarCol: { width: 32, marginRight: 8 },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.primaryMuted, justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  msgAvatarText: { fontSize: 11, fontWeight: '700', color: T.primary },
  msgBubble: {
    maxWidth: '72%', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.cardBorder,
    borderBottomLeftRadius: 4, ...Shadows.xs,
  },
  msgBubbleOwn: {
    backgroundColor: T.primary, borderColor: T.primary,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 4,
    ...Shadows.sm, shadowColor: T.primary, shadowOpacity: 0.25,
  },
  msgBubbleOther: {},
  msgFrom: { fontSize: 11, fontWeight: '700', color: T.accent, marginBottom: 3, marginTop: -2 },
  msgText: { fontSize: 15, color: T.textPrimary, lineHeight: 21 },
  msgTextOwn: { color: '#FFFFFF' },
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 3 },
  msgTime: { fontSize: 10, color: T.textTertiary },
  msgTimeOwn: { color: 'rgba(255,255,255,0.55)' },
  empty: { alignItems: 'center', paddingTop: 120 },
  emptyArt: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: T.surfaceBorder, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { ...Typography.h4, color: T.textSecondary },
  emptySub: { ...Typography.caption, color: T.textTertiary, marginTop: 6 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: Sizes.paddingSm, paddingTop: Sizes.paddingSm,
    backgroundColor: T.surfaceGlass, borderTopWidth: 1,
    borderTopColor: T.divider, ...Shadows.md,
  },
  inputWrap: {
    flex: 1, backgroundColor: T.inputBg, borderRadius: 24,
    borderWidth: 1.5, borderColor: T.inputBorder,
  },
  input: {
    paddingHorizontal: 18, paddingVertical: 11,
    fontSize: 15, color: T.inputText, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.primary, justifyContent: 'center', alignItems: 'center',
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.35,
  },
  sendBtnOff: { backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.cardBorder },
  readOnlyBar: {
    padding: 14,
    backgroundColor: T.warningBg,
    borderTopWidth: 1,
    borderTopColor: T.divider,
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 12, color: T.textSecondary, textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Sizes.paddingMd,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 5,
    borderRadius: Sizes.radiusSm,
    backgroundColor: T.inputBg,
  },
  tabActive: { backgroundColor: T.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: T.textSecondary },
  tabTextActive: { color: '#FFFFFF' },
});

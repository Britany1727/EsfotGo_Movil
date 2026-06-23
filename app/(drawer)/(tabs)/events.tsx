import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, Modal,
  Pressable, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  FadeInDown,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, CalendarDays } from 'lucide-react-native';
import { useInfiniteEvents } from '@/features/events/application/event.hooks';
import { EventCardSkeleton } from '@/features/events/presentation/event-skeleton';
import { EventForm } from '@/features/events/presentation/event-form';
import { EventDetailModal } from '@/features/events/presentation/event-detail';
import type { Event, EventDateFilter } from '@/features/events/domain/event.entity';
import { GlassInput } from '@/shared/components/premium';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { CategoryChip, type Category } from '@/components/ui/CategoryChip';
import { EventCard } from '@/components/ui/EventCard';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/constants/roles';

const SKELETONS = 3;

const DATE_FILTERS: Category[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'proximos', label: 'Proximos' },
  { key: 'este_mes', label: 'Este mes' },
  { key: 'pasados', label: 'Pasados' },
];

export default function EventsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const canCreate = user && hasPermission(user.role, 'create:events');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventDateFilter>('todos');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);

  const {
    data: events,
    setSearch: doSearch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    totalCount,
    error,
  } = useInfiniteEvents(search || undefined, filter);

  if (error) console.log('[EventsScreen] Error cargando eventos:', (error as Error)?.message ?? error);

  const scrollY = useSharedValue(0);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollY.value = e.nativeEvent.contentOffset.y;
  }, [scrollY]);

  const handleEventPress = useCallback((event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailEvent(event);
  }, []);

  const handleEditFromDetail = useCallback((event: Event) => {
    setDetailEvent(null);
    setEditEvent(event);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowCreateModal(false);
    setEditEvent(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Event }) => (
      <EventCard event={item} onPress={handleEventPress} />
    ),
    [handleEventPress]
  );

  const keyFn = useCallback((item: Event) => item.id, []);

  return (
    <View style={styles.root}>
      <GlassHeader
        scrollY={scrollY}
        onAvatarPress={() => router.push('/profile' as any)}
        onMenuPress={() => (navigation.getParent() as any)?.openDrawer()}
      />

      <FlashList
        data={events}
        renderItem={renderItem as any}
        keyExtractor={keyFn as any}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Eventos</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{totalCount}</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Descubre lo que esta pasando en el campus
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100)} style={styles.searchWrap}>
              <GlassInput
                icon={<Search size={18} strokeWidth={2} color={T.textTertiary} />}
                placeholder="Buscar eventos..."
                value={search}
                onChangeText={(t: string) => {
                  setSearch(t);
                  doSearch(t);
                }}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150)} style={styles.filterWrap}>
              <CategoryChip
                categories={DATE_FILTERS}
                activeKey={filter}
                onSelect={(key) => setFilter(key as EventDateFilter)}
              />
            </Animated.View>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={T.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skels}>
              {Array.from({ length: SKELETONS }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <CalendarDays size={52} strokeWidth={1.2} color={T.textTertiary} />
              <Text style={styles.emptyText}>No se encontraron eventos</Text>
              <Text style={styles.emptySubtext}>
                Intenta con otros filtros o terminos de busqueda
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={T.primary}
            colors={[T.primary]}
            progressViewOffset={60}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {canCreate && (
        <FloatingActionButton onPress={() => setShowCreateModal(true)} bottom={insets.bottom + 96} right={20} />
      )}

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Crear evento</Text>
            <Pressable
              onPress={handleCloseForm}
              style={styles.modalCloseBtn}
            >
              <X size={18} strokeWidth={2.2} color={T.textSecondary} />
            </Pressable>
          </View>
          <EventForm onClose={handleCloseForm} />
        </View>
      </Modal>

      <Modal
        visible={!!editEvent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar evento</Text>
            <Pressable
              onPress={handleCloseForm}
              style={styles.modalCloseBtn}
            >
              <X size={18} strokeWidth={2.2} color={T.textSecondary} />
            </Pressable>
          </View>
          {editEvent && <EventForm onClose={handleCloseForm} editEvent={editEvent} />}
        </View>
      </Modal>

      <Modal
        visible={!!detailEvent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailEvent(null)}
      >
        {detailEvent && (
          <EventDetailModal
            event={detailEvent}
            onClose={() => setDetailEvent(null)}
            onEdit={handleEditFromDetail}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  list: { paddingBottom: 100 },

  header: {
    paddingHorizontal: Sizes.paddingMd,
    paddingTop: 76,
    paddingBottom: Sizes.gapSm,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { ...Typography.h2, color: T.textPrimary },
  countBadge: {
    backgroundColor: T.primaryMuted,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: T.primary + '20',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.primary,
  },

  subtitle: { ...Typography.body, color: T.textSecondary },

  searchWrap: {
    paddingHorizontal: Sizes.paddingMd,
    paddingBottom: Sizes.gapSm,
  },

  filterWrap: { marginBottom: Sizes.gapMd },

  skels: { paddingHorizontal: Sizes.paddingMd, gap: Sizes.gapSm },

  footer: {
    alignItems: 'center',
    padding: Sizes.paddingMd,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: Sizes.paddingMd,
    gap: 10,
  },
  emptyText: { ...Typography.h4, color: T.textSecondary },
  emptySubtext: { ...Typography.bodySm, color: T.textTertiary, textAlign: 'center', maxWidth: 260 },

  modalContainer: { flex: 1, backgroundColor: T.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Sizes.paddingLg,
    paddingTop: Sizes.paddingLg,
    paddingBottom: Sizes.paddingMd,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
    backgroundColor: T.surface,
  },
  modalTitle: { ...Typography.h3, color: T.textPrimary },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

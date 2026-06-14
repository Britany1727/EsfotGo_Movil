import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import { useInfiniteEvents, useDeleteEvent } from '@/features/events/application/event.hooks';
import { EventForm } from './event-form';
import type { Event } from '@/features/events/domain/event.entity';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';
import { Edit2, Trash2, Calendar } from 'lucide-react-native';
import { AppCard } from '@/components/ui/app-card';
import { AppButton } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/empty-state';

export function EventsAdmin() {
  const { data: events, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, totalCount } = useInfiniteEvents();
  const deleteMutation = useDeleteEvent();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Event | null>(null);

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((event: Event) => {
    setEditTarget(event);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditTarget(null);
  }, []);

  const handleDelete = useCallback((event: Event) => {
    Alert.alert('Eliminar evento', `¿Eliminar "${event.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(event.id) },
    ]);
  }, [deleteMutation]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Eventos ({totalCount})</Text>
        <TouchableOpacity style={s.createBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Text style={s.createBtnText}>+ Crear</Text>
        </TouchableOpacity>
      </View>
      {isLoading && <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AppCard style={s.cardWrapper}>
            <View style={s.cardContent}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.cardMeta}>{item.location ?? 'Sin ubicación'} · {new Date(item.startDate).toLocaleDateString('es')}</Text>
            </View>
            <View style={s.actions}>
              <AppButton label="" variant="ghost" size="sm" icon={<Edit2 size={16} color={T.primary} />} onPress={() => handleEdit(item)} />
              <AppButton label="" variant="ghost" size="sm" icon={<Trash2 size={16} color={T.error} />} onPress={() => handleDelete(item)} />
            </View>
          </AppCard>
        )}
        contentContainerStyle={s.list}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        ListEmptyComponent={!isLoading ? <EmptyState icon={Calendar} title="No hay eventos" description="No se han encontrado eventos próximos." /> : null}
        removeClippedSubviews
      />

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{editTarget ? 'Editar evento' : 'Crear evento'}</Text>
          <TouchableOpacity onPress={handleCloseForm} style={s.modalCloseBtn}>
            <Text style={s.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        <EventForm
          onClose={handleCloseForm}
          onSuccess={() => refetch()}
          editEvent={editTarget ?? undefined}
        />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { ...Typography.h3, color: T.textPrimary },
  createBtn: {
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createBtnText: { fontSize: 13, fontWeight: '700', color: T.text },
  list: { paddingBottom: 40 },
  cardWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 14 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  cardMeta: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  modalTitle: { ...Typography.h3, color: T.textPrimary },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center' },
  modalCloseBtnText: { fontSize: 16, fontWeight: '700', color: T.textSecondary },
});

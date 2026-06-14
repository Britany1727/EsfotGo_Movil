import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity, Modal,
} from 'react-native';
import { useAulas } from '@/features/aulas/application/aulas.hooks';
import { useDeleteAula } from '@/features/aulas/application/aulas-admin.hooks';
import { AulaForm } from './aula-form';
import type { Aula } from '@/services/express/express-types';
import { LightTheme as T, Typography } from '@/constants/design-system';
import { Edit2, Trash2, DoorOpen } from 'lucide-react-native';
import { AppCard } from '@/components/ui/app-card';
import { AppButton } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/empty-state';

export function AulasAdmin() {
  const { data: aulas, isLoading, isRefetching, refetch } = useAulas();
  const deleteMutation = useDeleteAula();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Aula | null>(null);

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((aula: Aula) => {
    setEditTarget(aula);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditTarget(null);
  }, []);

  const handleDelete = useCallback((aula: Aula) => {
    Alert.alert('Eliminar aula', `¿Eliminar "${aula.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(aula._id),
      },
    ]);
  }, [deleteMutation]);

  const aulasList = aulas ?? [];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Aulas ({aulasList.length})</Text>
        <TouchableOpacity style={s.createBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Text style={s.createBtnText}>+ Crear</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 20 }} />
      )}

      <FlatList
        data={aulasList}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <AppCard style={s.cardWrapper}>
            <View style={s.cardContent}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.nombre}</Text>
              <Text style={s.cardMeta}>
                {item.ubicacion ?? 'Sin ubicación'}
                {item.capacidad ? `  ·  ${item.capacidad} personas` : ''}
              </Text>
              {item.estado && (
                <View style={[s.estadoBadge, item.estado === 'disponible' ? s.estadoDisponible : item.estado === 'ocupado' ? s.estadoOcupado : s.estadoMantenimiento]}>
                  <Text style={s.estadoText}>{item.estado}</Text>
                </View>
              )}
            </View>
            <View style={s.actions}>
              <AppButton label="" variant="ghost" size="sm" icon={<Edit2 size={16} color={T.primary} />} onPress={() => handleEdit(item)} />
              <AppButton label="" variant="ghost" size="sm" icon={<Trash2 size={16} color={T.error} />} onPress={() => handleDelete(item)} />
            </View>
          </AppCard>
        )}
        contentContainerStyle={s.list}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={DoorOpen}
              title="No hay aulas"
              description="No se han encontrado aulas registradas."
            />
          ) : null
        }
        removeClippedSubviews
      />

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{editTarget ? 'Editar aula' : 'Crear aula'}</Text>
          <TouchableOpacity onPress={handleCloseForm} style={s.modalCloseBtn}>
            <Text style={s.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        <AulaForm
          onClose={handleCloseForm}
          onSuccess={() => refetch()}
          editData={editTarget ?? undefined}
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
  estadoBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  estadoDisponible: { backgroundColor: 'rgba(48,209,88,0.15)' },
  estadoOcupado: { backgroundColor: 'rgba(255,69,58,0.15)' },
  estadoMantenimiento: { backgroundColor: 'rgba(255,214,10,0.15)' },
  estadoText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', color: T.textSecondary },
  actions: { flexDirection: 'row', gap: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  modalTitle: { ...Typography.h3, color: T.textPrimary },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center' },
  modalCloseBtnText: { fontSize: 16, fontWeight: '700', color: T.textSecondary },
});

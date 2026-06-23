import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTutorias, useTutoriaEnrollment } from '@/features/tutorias/application/tutorias.hooks';
import { TutoriaForm } from '@/features/tutorias/presentation/tutoria-form';
import type { Tutoria } from '@/features/tutorias/domain/tutoria.entity';
import { useAuthStore } from '@/store/auth.store';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';
import { Calendar, Clock, MapPin, Users, Edit2, Trash2, Search, X } from 'lucide-react-native';
import { AppCard } from '@/components/ui/app-card';
import { AppButton } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/empty-state';

const STATUS_CHIPS: { key: Tutoria['status'] | 'todas'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'programada', label: 'Programadas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'finalizada', label: 'Finalizadas' },
  { key: 'cancelada', label: 'Canceladas' },
];

const STATUS_COLORS: Record<Tutoria['status'], string> = { programada: '#1B6BB0', pendiente: '#059669', finalizada: '#6B7280', cancelada: '#DC2626' };

export default function TutoriasScreen() {
  const user = useAuthStore((s) => s.user);
  const isDocente = user?.role === 'docente';
  const isAdmin = user?.role === 'administrador';
  const isEstudiante = user?.role === 'estudiante';

  const { tutorias, isLoading, search, setSearch, statusFilter, setStatusFilter, ownerFilter, setOwnerFilter, createTutoria, updateTutoria, deleteTutoria, cancelTutoria } = useTutorias();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Tutoria | null>(null);
  const [mainTab, setMainTab] = useState<'explorar' | 'mis_tutorias'>('explorar');

  const filteredTutorias = tutorias.filter((t) => {
    if (mainTab === 'explorar') return true;
    if (isDocente) return t.createdBy === user?.id;
    return true;
  });

  const handleCreate = useCallback(async (input: Omit<Tutoria, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>) => {
    try {
      await createTutoria.mutateAsync(input);
      setShowForm(false);
    } catch (e) {
      Alert.alert('Error', (e as Error)?.message ?? 'No se pudo crear la tutoría');
    }
  }, [createTutoria]);
  const handleUpdate = useCallback(async (input: Omit<Tutoria, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>) => {
    if (!editTarget) return;
    try {
      await updateTutoria.mutateAsync({ id: editTarget.id, input });
      setEditTarget(null);
    } catch (e) {
      Alert.alert('Error', (e as Error)?.message ?? 'No se pudo actualizar la tutoría');
    }
  }, [editTarget, updateTutoria]);
  const handleDelete = useCallback((item: Tutoria) => {
    Alert.alert('Eliminar tutoría', `¿Eliminar "${item.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteTutoria.mutateAsync(item.id); } catch (e) { Alert.alert('Error', (e as Error)?.message ?? 'No se pudo eliminar'); }
      }},
    ]);
  }, [deleteTutoria]);

  const renderItem = useCallback(({ item }: { item: Tutoria }) => {
    const isPast = item.status === 'finalizada' || item.status === 'cancelada';
    const sc = STATUS_COLORS[item.status];
    const canEdit = isDocente || isAdmin;
    const canDelete = isAdmin || (isDocente && item.createdBy === user?.id);
    return (
      <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: 12 }}>
        <AppCard variant="glass" style={isPast && styles.cardPast}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: sc + '15' }]}><Text style={[styles.statusText, { color: sc }]}>{item.status}</Text></View>
            </View>
            <Text style={styles.subject}>{item.subject}</Text>
          </View>
          {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
          <View style={styles.meta}>
            {item.horarios && item.horarios.length > 0 ? item.horarios.map((h, i) => (
              <View style={styles.metaRow} key={i}><Calendar size={14} color={T.textSecondary} /><Text style={styles.metaItem}>{h.dia}  {h.horaInicio} - {h.horaFin}</Text></View>
            )) : (
              <View style={styles.metaRow}><Calendar size={14} color={T.textSecondary} /><Text style={styles.metaItem}>{item.date} · {item.time}</Text></View>
            )}
            <View style={styles.metaRow}><Clock size={14} color={T.textSecondary} /><Text style={styles.metaItem}>{item.duration} min</Text></View>
            {item.location && <View style={styles.metaRow}><MapPin size={14} color={T.textSecondary} /><Text style={styles.metaItem}>{item.location}</Text></View>}
            <View style={styles.metaRow}><Users size={14} color={T.textSecondary} /><Text style={styles.metaItem}>{item.enrolledCount}/{item.maxStudents} estudiantes</Text></View>
          </View>
          <View style={styles.actions}>
            {isEstudiante && item.status === 'programada' && <EnrollButton tutoriaId={item.id} />}
            {canEdit && item.status === 'programada' && <AppButton label="Editar" variant="ghost" size="sm" icon={<Edit2 size={14} color={T.primary} />} onPress={() => setEditTarget(item)} />}
            {canEdit && item.status === 'programada' && <AppButton label="Cancelar" variant="danger" size="sm" onPress={() => cancelTutoria.mutate(item.id)} />}
            {canDelete && <AppButton label="Eliminar" variant="danger" size="sm" icon={<Trash2 size={14} color={T.error} />} onPress={() => handleDelete(item)} />}
          </View>
        </AppCard>
      </Animated.View>
    );
  }, [isDocente, isAdmin, isEstudiante, user, cancelTutoria, handleDelete]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Tutorías</Text>
            <Text style={styles.subtitle}>Gestión de sesiones de tutoría</Text>
          </View>
          {(isDocente || isAdmin) && (
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
              <Text style={styles.createBtnText}>+ Crear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TextInput style={styles.search} placeholder="Buscar tutorias..." placeholderTextColor={T.inputPlaceholder} value={search} onChangeText={setSearch} />

      <View style={styles.ownerRow}>
        {(['todas', 'mis'] as const).map((key) => (
          <TouchableOpacity key={key} style={[styles.ownerChip, ownerFilter === key && styles.ownerChipActive]} onPress={() => setOwnerFilter(key)}>
            <Text style={[styles.ownerChipText, ownerFilter === key && styles.ownerChipTextActive]}>{key === 'todas' ? 'Explorar' : 'Mis Tutorias'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
        {STATUS_CHIPS.map((chip) => (
          <TouchableOpacity key={chip.key} style={[styles.chip, statusFilter === chip.key && styles.chipActive]} onPress={() => setStatusFilter(chip.key)}>
            <Text style={[styles.chipText, statusFilter === chip.key && styles.chipTextActive]}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />}

      <FlashList data={filteredTutorias} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon={Calendar} title="No se encontraron tutorías" description="Intenta cambiar los filtros o crea una nueva." />}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.modalCloseBtn}><X size={16} strokeWidth={2.2} color={T.textSecondary} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Crear tutoría</Text>
            <View style={{ width: 36 }} />
          </View>
          <TutoriaForm onSubmit={handleCreate} isLoading={createTutoria.isPending} />
        </View>
      </Modal>

      <Modal visible={!!editTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditTarget(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditTarget(null)} style={styles.modalCloseBtn}><X size={16} strokeWidth={2.2} color={T.textSecondary} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Editar tutoría</Text>
            <View style={{ width: 36 }} />
          </View>
          {editTarget && <TutoriaForm editData={editTarget} onSubmit={handleUpdate} isLoading={updateTutoria.isPending} />}
        </View>
      </Modal>
    </View>
  );
}

function EnrollButton({ tutoriaId }: { tutoriaId: string }) {
  const user = useAuthStore((s) => s.user);
  const { isEnrolled, isLoading, enroll, unenroll } = useTutoriaEnrollment(tutoriaId);
  if (!user) return null;
  return <AppButton variant={isEnrolled ? 'outline' : 'primary'} size="sm" label={isEnrolled ? '✓ Inscrito' : 'Inscribirse'} isLoading={isLoading || enroll.isPending || unenroll.isPending} onPress={() => isEnrolled ? unenroll.mutate() : enroll.mutate()} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  header: {
    paddingHorizontal: Sizes.paddingMd, paddingTop: 56, paddingBottom: 12,
    backgroundColor: T.surfaceGlass, borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...Typography.h2, color: T.textPrimary },
  subtitle: { ...Typography.bodySm, color: T.textSecondary, marginTop: 2 },
  createBtn: {
    backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    paddingHorizontal: 18, paddingVertical: 11,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  createBtnText: { ...Typography.caption, fontWeight: '700', color: '#FFFFFF' },

  search: {
    marginHorizontal: Sizes.paddingMd, marginTop: 12, marginBottom: 8,
    backgroundColor: T.surface, borderRadius: Sizes.radiusMd,
    padding: 14, fontSize: 14, color: T.textPrimary,
    borderWidth: 1.5, borderColor: T.cardBorder,
  },

  ownerRow: {
    flexDirection: 'row', marginHorizontal: Sizes.paddingMd, marginBottom: 8, gap: 8,
  },
  ownerChip: {
    flex: 1, maxHeight: 44, justifyContent: 'center',
    paddingVertical: 10, borderRadius: Sizes.radiusSm,
    backgroundColor: T.surfaceGlass, alignItems: 'center',
    borderWidth: 1.5, borderColor: T.cardBorder,
  },
  ownerChipActive: {
    backgroundColor: T.primaryMuted, borderColor: T.primary,
    ...Shadows.sm, shadowColor: T.primary, shadowOpacity: 0.15,
  },
  ownerChipText: { ...Typography.caption, fontWeight: '600', color: T.textSecondary },
  ownerChipTextActive: { color: T.primary },

  filterScroll: { maxHeight: 44, flexGrow: 0 },
  filters: { paddingHorizontal: Sizes.paddingMd, gap: 8, marginBottom: 8 },
  chip: {
    height: 36, justifyContent: 'center',
    backgroundColor: T.surfaceGlass, borderRadius: 20,
    paddingHorizontal: 14, borderWidth: 1, borderColor: T.cardBorder,
  },
  chipActive: { backgroundColor: T.primary, borderColor: T.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
  chipTextActive: { color: '#FFFFFF' },

  list: { padding: Sizes.paddingMd, paddingTop: 4, paddingBottom: 80 },
  cardPast: { opacity: 0.55 },
  cardHeader: { gap: 2 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  subject: { fontSize: 12, color: T.textSecondary },
  desc: { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginVertical: 6 },
  meta: { gap: 6, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaItem: { fontSize: 12, color: T.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: T.cardBorder, paddingTop: 10 },

  modalContainer: { flex: 1, backgroundColor: T.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Sizes.paddingMd, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: T.divider,
    backgroundColor: T.surfaceGlass,
  },
  modalTitle: { ...Typography.h4, color: T.textPrimary },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
  },
});

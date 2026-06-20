import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useExpressAuthStore } from '@/services/express/express-auth.store';
import { useManagedUsers } from '@/features/admin/application/user-management.hooks';
import { UserRow } from '@/features/admin/presentation/user-row';
import { UserFilters } from '@/features/admin/presentation/user-filters';
import { UserEditModal } from '@/features/admin/presentation/user-edit-modal';
import { UserCreateModal } from '@/features/admin/presentation/user-create-modal';
import { ConfirmDialog } from '@/features/admin/presentation/confirm-dialog';
import type { ManagedUser, CreateManagedUserInput } from '@/features/admin/domain/user-management.entity';
import { useAuthStore } from '@/store/auth.store';
import { ExpressLoginForm } from '@/features/admin/presentation/express-login-form';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { RoleGuard } from '@/core/guards/role.guard';
import { BusRoutesAdmin } from '@/features/polibus/presentation/bus-routes-admin';
import { EventsAdmin } from '@/features/events/presentation/events-admin';
import { Lock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { FilePicker } from '@/features/bulk-upload/presentation/file-picker';
import { PreviewTable } from '@/features/bulk-upload/presentation/preview-table';
import { UploadReport } from '@/features/bulk-upload/presentation/upload-report';
import { useBulkUpload } from '@/features/bulk-upload/application/bulk-upload.hooks';

export default function AdminUsersScreen() {
  const user = useAuthStore((s) => s.user);
  const expressUser = useExpressAuthStore((s) => s.expressUser);

  const {
    users,
    total,
    page,
    totalPages,
    isLoading,
    isError,
    filters,
    setSearch,
    setTypeFilter,
    setStatusFilter,
    setPage,
    updateUser,
    deleteUser,
    createUser,
    refresh,
  } = useManagedUsers();

  if (isError) console.log('[AdminScreen] Error cargando usuarios');

  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'polibus' | 'eventos' | 'carga'>('usuarios');
  const bulk = useBulkUpload();

  const handleEdit = useCallback((u: ManagedUser) => setEditTarget(u), []);
  const handleDelete = useCallback((u: ManagedUser) => setDeleteTarget(u), []);
  const handleToggleStatus = useCallback((u: ManagedUser) => {
    setTogglingId(u._id);
    updateUser.mutate(
      { user: u, updates: { status: u.status === 'activo' ? 'inactivo' : 'activo' } },
      { onSettled: () => setTogglingId(null) }
    );
  }, [updateUser]);
  const handleSaveEdit = useCallback((u: ManagedUser, updates: Partial<ManagedUser>) => {
    updateUser.mutateAsync({ user: u, updates }).then(() => setEditTarget(null));
  }, [updateUser]);
  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) { deleteUser.mutateAsync(deleteTarget).then(() => setDeleteTarget(null)); }
  }, [deleteTarget, deleteUser]);

  const handleCreateUser = useCallback(async (input: CreateManagedUserInput) => {
    await createUser.mutateAsync(input);
  }, [createUser]);

  return (
    <RoleGuard allowedRoles={['administrador', 'gestor']} fallback={
      <View style={styles.gate}>
        <Lock size={48} color={T.textSecondary} />
        <Text style={styles.gateTitle}>Acceso restringido</Text>
        <Text style={styles.gateDesc}>Esta sección solo está disponible para administradores.</Text>
      </View>
    }>
      { !expressUser ? (
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>Acceso Administrador</Text>
          <Text style={styles.authDesc}>
            Debes iniciar sesión como administrador en el sistema institucional para gestionar usuarios.
          </Text>
          <ExpressLoginForm role="admin" />
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.header}>
        <Text style={styles.title}>Panel Administrador</Text>
        <View style={styles.headerActions}>
          {activeTab === 'usuarios' && (
            <>
              <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)} activeOpacity={0.8}>
                <Text style={styles.createBtnText}>+ Crear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshBtn} onPress={refresh} activeOpacity={0.7}>
                <RefreshCw size={18} color={T.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'usuarios' && styles.tabActive]} onPress={() => setActiveTab('usuarios')}>
          <Text style={[styles.tabText, activeTab === 'usuarios' && styles.tabTextActive]}>Usuarios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'polibus' && styles.tabActive]} onPress={() => setActiveTab('polibus')}>
          <Text style={[styles.tabText, activeTab === 'polibus' && styles.tabTextActive]}>Polibus</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'eventos' && styles.tabActive]} onPress={() => setActiveTab('eventos')}>
          <Text style={[styles.tabText, activeTab === 'eventos' && styles.tabTextActive]}>Eventos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'carga' && styles.tabActive]} onPress={() => setActiveTab('carga')}>
          <Text style={[styles.tabText, activeTab === 'carga' && styles.tabTextActive]}>Carga</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'polibus' && <BusRoutesAdmin />}
      {activeTab === 'eventos' && <EventsAdmin />}
      {activeTab === 'carga' && (
        <View style={styles.bulkContainer}>
          {bulk.phase === 'error' && bulk.errorMessage && (
            <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{bulk.errorMessage}</Text></View>
          )}
          {bulk.phase === 'uploading' && (
            <View style={styles.uploadingBanner}>
              <ActivityIndicator color={T.primary} size="small" />
              <Text style={styles.uploadingText}>Enviando datos...</Text>
            </View>
          )}
          {(bulk.phase === 'idle' || bulk.phase === 'parsing' || bulk.phase === 'error') && (
            <FilePicker target={bulk.target} onTargetChange={bulk.setTarget} onPickFile={bulk.pickFile} isParsing={bulk.phase === 'parsing'} fileName={bulk.fileName} />
          )}
          {(bulk.phase === 'previewing' || bulk.phase === 'uploading') && (
            <PreviewTable rows={bulk.rows} validCount={bulk.validCount} invalidCount={bulk.invalidCount} onConfirm={bulk.upload} onCancel={bulk.reset} isUploading={bulk.phase === 'uploading'} />
          )}
          {bulk.phase === 'success' && bulk.result && (
            <UploadReport result={bulk.result} onReset={bulk.reset} />
          )}
        </View>
      )}
      {activeTab === 'usuarios' && (
        <View style={{ flex: 1, minHeight: 0 }}>

      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Error al cargar usuarios. Toca ↻ para reintentar.</Text>
        </View>
      )}

      {updateUser.isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Error al actualizar: {(updateUser.error as Error)?.message ?? 'Intenta de nuevo'}</Text>
        </View>
      )}

      {deleteUser.isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            Error al eliminar: {(deleteUser.error as Error)?.message ?? 'Intenta de nuevo'}
          </Text>
        </View>
      )}

      {createUser.isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            Error al crear: {(createUser.error as Error)?.message ?? 'Intenta de nuevo'}
          </Text>
        </View>
      )}

      <View style={styles.filtersContainer}>
        <UserFilters
          filters={filters}
          onSearchChange={setSearch}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
          total={total}
        />
      </View>

      {isLoading && (
        <ActivityIndicator size="large" color={T.primary} style={styles.loader} />
      )}

      <FlashList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <UserRow
            user={item}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            isToggling={togglingId === item._id}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No se encontraron usuarios</Text>
            </View>
          ) : null
        }
      />

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            onPress={() => setPage(page - 1)}
            disabled={page <= 1}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} strokeWidth={2} color={page <= 1 ? T.textMuted : T.primary} />
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            {page} de {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            onPress={() => setPage(page + 1)}
            disabled={page >= totalPages}
            activeOpacity={0.7}
          >
            <ChevronRight size={18} strokeWidth={2} color={page >= totalPages ? T.textMuted : T.primary} />
          </TouchableOpacity>
        </View>
      )}

      <UserEditModal
        visible={!!editTarget}
        user={editTarget}
        isLoading={updateUser.isPending}
        onSave={handleSaveEdit}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar usuario"
        message={`¿Estás seguro de eliminar a ${deleteTarget?.nombre} ${deleteTarget?.apellido ?? ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmStyle="danger"
        isLoading={deleteUser.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <UserCreateModal
        visible={showCreateModal}
        isLoading={createUser.isPending}
        onCreate={handleCreateUser}
        onClose={() => setShowCreateModal(false)}
      />
        </View>
      )}
        </View>
      )}
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.background,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Sizes.paddingMd, paddingTop: 56, paddingBottom: 12,
    backgroundColor: T.surfaceGlass,
    borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  createBtn: {
    backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    paddingHorizontal: 18, paddingVertical: 11,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.25,
  },
  createBtnText: {
    ...Typography.caption, fontWeight: '700', color: '#FFFFFF',
  },
  title: { ...Typography.h2, color: T.textPrimary },
  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: Sizes.paddingMd,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: T.divider,
    marginBottom: 12, gap: 6,
    backgroundColor: T.surfaceGlass,
  },
  tab: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: Sizes.radiusFull,
    backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.cardBorder,
  },
  tabActive: {
    backgroundColor: T.primary, borderColor: T.primary,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.25,
  },
  tabText: { ...Typography.caption, fontWeight: '600', color: T.textSecondary },
  tabTextActive: { color: '#FFFFFF' },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.surfaceGlass,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  refreshText: {
    fontSize: 18,
    color: T.primary,
  },
  errorBanner: {
    marginHorizontal: Sizes.paddingMd, marginBottom: 10,
    backgroundColor: T.errorBg, borderRadius: Sizes.radiusSm,
    padding: 12, borderLeftWidth: 3, borderLeftColor: T.error,
  },
  errorBannerText: { ...Typography.bodySm, color: T.error },
  filtersContainer: { paddingHorizontal: Sizes.paddingMd, paddingBottom: 10 },
  loader: { marginTop: 40 },
  list: { padding: Sizes.paddingMd, paddingTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { ...Typography.body, color: T.textSecondary },
  authContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: Sizes.paddingXl, backgroundColor: T.background, gap: 20,
  },
  authTitle: { ...Typography.h2, color: T.textPrimary },
  authDesc: {
    ...Typography.body, color: T.textSecondary,
    textAlign: 'center', maxWidth: 300, lineHeight: 22,
  },
  gate: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: Sizes.paddingXl, backgroundColor: T.background, gap: 16,
  },
  gateTitle: { ...Typography.h2, color: T.textPrimary },
  gateDesc: {
    ...Typography.body, color: T.textSecondary,
    textAlign: 'center', maxWidth: 280, lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 18, padding: 14,
    backgroundColor: T.surfaceGlass,
    borderTopWidth: 1, borderTopColor: T.divider,
  },
  pageBtn: {
    width: 42, height: 42, borderRadius: Sizes.radiusSm,
    backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageInfo: { ...Typography.bodySm, fontWeight: '600', color: T.textSecondary },
  bulkContainer: { flex: 1, padding: Sizes.paddingMd, gap: 16 },
  uploadingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.primaryMuted, borderRadius: Sizes.radiusSm,
    padding: 14, borderWidth: 1, borderColor: T.primary + '20',
  },
  uploadingText: { ...Typography.body, color: T.primary, fontWeight: '600' },
});

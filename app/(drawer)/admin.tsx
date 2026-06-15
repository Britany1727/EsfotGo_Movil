import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
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
import { DarkTheme as T } from '@/constants/design-system';
import { RoleGuard } from '@/core/guards/role.guard';
import { BusRoutesAdmin } from '@/features/polibus/presentation/bus-routes-admin';
import { EventsAdmin } from '@/features/events/presentation/events-admin';
import { AulasAdmin } from '@/features/aulas/presentation/aulas-admin';
import { Lock, RefreshCw } from 'lucide-react-native';
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
  const [activeTab, setActiveTab] = useState<'usuarios' | 'polibus' | 'eventos' | 'aulas' | 'carga'>('usuarios');
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
        <TouchableOpacity style={[styles.tab, activeTab === 'aulas' && styles.tabActive]} onPress={() => setActiveTab('aulas')}>
          <Text style={[styles.tabText, activeTab === 'aulas' && styles.tabTextActive]}>📚 Aulas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'carga' && styles.tabActive]} onPress={() => setActiveTab('carga')}>
          <Text style={[styles.tabText, activeTab === 'carga' && styles.tabTextActive]}>📤 Carga</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'polibus' && <BusRoutesAdmin />}
      {activeTab === 'eventos' && <EventsAdmin />}
      {activeTab === 'aulas' && <AulasAdmin />}
      {activeTab === 'carga' && (
        <View style={styles.bulkContainer}>
          {bulk.phase === 'error' && bulk.errorMessage && (
            <View style={styles.errorBanner}><Text style={styles.errorBannerText}>⚠ {bulk.errorMessage}</Text></View>
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
        <View style={{ flex: 1 }}>

      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Error al cargar usuarios. Toca ↻ para reintentar.</Text>
        </View>
      )}

      {updateUser.isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            Error al actualizar: {(updateUser.error as Error)?.message ?? 'Intenta de nuevo'}
          </Text>
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

      <FlatList
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
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
      />

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            onPress={() => setPage(page - 1)}
            disabled={page <= 1}
            activeOpacity={0.7}
          >
            <Text style={styles.pageBtnText}>←</Text>
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
            <Text style={styles.pageBtnText}>→</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createBtn: {
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.text,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: T.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.cardBorder,
    marginBottom: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: T.surface,
  },
  tabActive: {
    backgroundColor: T.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textSecondary,
  },
  tabTextActive: {
    color: T.text,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 18,
    color: T.primary,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: T.errorBg,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: T.error,
  },
  errorBannerText: {
    color: T.error,
    fontSize: 12,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loader: {
    marginTop: 20,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: T.textSecondary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.cardBorder,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: T.primary,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textSecondary,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: T.background,
    gap: 16,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textPrimary,
  },
  authDesc: {
    fontSize: 14,
    color: T.textSecondary,
    textAlign: 'center',
  },
  gate: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, backgroundColor: T.background, gap: 12,
  },
  gateIcon: { fontSize: 48 },
  gateTitle: { fontSize: 20, fontWeight: '700', color: T.textPrimary },
  gateDesc: { fontSize: 14, color: T.textSecondary, textAlign: 'center' },
  bulkContainer: { flex: 1, padding: 16, gap: 16 },
  uploadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,51,160,0.08)', borderRadius: 10, padding: 12 },
  uploadingText: { fontSize: 14, color: T.primary, fontWeight: '600' },
});

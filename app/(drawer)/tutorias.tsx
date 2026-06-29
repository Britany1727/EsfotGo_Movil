import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert, Image, Linking, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTutorias, useTutoriaEnrollment, useStudentEnrollments, useTeacherEnrollments } from '@/features/tutorias/application/tutorias.hooks';
import { TutoriaForm } from '@/features/tutorias/presentation/tutoria-form';
import type { Tutoria, Inscripcion, EnrollmentStatus } from '@/features/tutorias/domain/tutoria.entity';
import { ENROLLMENT_STATUS_COLORS, ENROLLMENT_STATUS_LABELS } from '@/features/tutorias/domain/tutoria.entity';
import { useAuthStore } from '@/store/auth.store';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';
import { Calendar, Clock, MapPin, Users, Edit2, Trash2, X, GraduationCap, Check, Ban, ChevronDown, ChevronRight, Mail, Phone, User } from 'lucide-react-native';
import { AppCard } from '@/components/ui/app-card';
import { AppButton } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/empty-state';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

const STATUS_CHIPS: { key: Tutoria['status'] | 'todas'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'programada', label: 'Programadas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'finalizada', label: 'Finalizadas' },
  { key: 'cancelada', label: 'Canceladas' },
];

const STATUS_COLORS: Record<Tutoria['status'], string> = { programada: '#1B6BB0', pendiente: '#059669', finalizada: '#6B7280', cancelada: '#DC2626' };

type StudentTab = 'explorar' | 'inscripciones';
type DocenteTab = 'mis_tutorias' | 'inscripciones_recibidas';
type DocenteInscripcionTab = 'solicitudes' | 'confirmadas';

interface EstudiantePerfil {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  imagen: string;
}

export default function TutoriasScreen() {
  const user = useAuthStore((s) => s.user);
  const isDocente = user?.role === 'docente';
  const isAdmin = user?.role === 'administrador';
  const isEstudiante = user?.role === 'estudiante';

  const { tutorias, isLoading, search, setSearch, statusFilter, setStatusFilter, ownerFilter, setOwnerFilter, createTutoria, updateTutoria, deleteTutoria, cancelTutoria, refetch: refetchTutorias, isRefetching } = useTutorias();
  const { enrollments: studentEnrollments, isLoading: studentEnrollmentsLoading, refetch: refetchStudentEnrollments, isRefetching: studentEnrollmentsRefetching } = useStudentEnrollments();
  const { enrollments: teacherEnrollments, isLoading: teacherEnrollmentsLoading, refetch: refetchTeacherEnrollments, isRefetching: teacherEnrollmentsRefetching, acceptEnrollment, rejectEnrollment } = useTeacherEnrollments();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Tutoria | null>(null);
  const [studentTab, setStudentTab] = useState<StudentTab>('explorar');
  const [docenteTab, setDocenteTab] = useState<DocenteTab>('mis_tutorias');
  const [docenteInscripcionTab, setDocenteInscripcionTab] = useState<DocenteInscripcionTab>('solicitudes');
  const [expandedTutoriaId, setExpandedTutoriaId] = useState<string | null>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<EstudiantePerfil | null>(null);

  const filteredTutorias = tutorias.filter((t) => {
    if (isEstudiante) return true;
    if (ownerFilter === 'mis' && user) return t.createdBy === user.id;
    return true;
  });

  const groupedTeacherEnrollments = useMemo(() => {
    const filtered = teacherEnrollments.filter((e) => {
      if (docenteInscripcionTab === 'solicitudes') return e.estado === 'pendiente';
      return e.estado === 'aceptado';
    });
    const groups: Record<string, { tutoria: { _id: string; titulo: string; horarios: { dia: string; horaInicio: string; horaFin: string }[]; oficina: string }; estudiantes: Inscripcion[] }> = {};
    for (const e of filtered) {
      const info = typeof e.tutoria_id === 'object' && e.tutoria_id !== null
        ? e.tutoria_id as { _id: string; titulo: string; horarios: { dia: string; horaInicio: string; horaFin: string }[]; informacion: string; oficina: string }
        : null;
      const key = info?._id ?? (typeof e.tutoria_id === 'string' ? e.tutoria_id : 'unknown');
      if (!groups[key]) {
        groups[key] = {
          tutoria: { _id: key, titulo: info?.titulo ?? 'Tutoría', horarios: info?.horarios ?? [], oficina: info?.oficina ?? '' },
          estudiantes: [],
        };
      }
      groups[key].estudiantes.push(e);
    }
    return Object.values(groups);
  }, [teacherEnrollments, docenteInscripcionTab]);

  const handleCreate = useCallback(async (input: Omit<Tutoria, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>) => {
    try {
      await createTutoria.mutateAsync(input);
      setShowForm(false);
      Toast.show({ type: 'success', text1: 'Creada', text2: 'Tutoría creada exitosamente' });
    } catch (e) {
      Alert.alert('Error', (e as Error)?.message ?? 'No se pudo crear la tutoría');
    }
  }, [createTutoria]);

  const handleUpdate = useCallback(async (input: Omit<Tutoria, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>) => {
    if (!editTarget) return;
    try {
      await updateTutoria.mutateAsync({ id: editTarget.id, input });
      setEditTarget(null);
      Toast.show({ type: 'success', text1: 'Actualizada', text2: 'Tutoría actualizada' });
    } catch (e) {
      Alert.alert('Error', (e as Error)?.message ?? 'No se pudo actualizar la tutoría');
    }
  }, [editTarget, updateTutoria]);

  const handleDelete = useCallback((item: Tutoria) => {
    Alert.alert('Eliminar tutoría', `¿Eliminar "${item.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteTutoria.mutateAsync(item.id); Toast.show({ type: 'success', text1: 'Eliminada' }); } catch (e) { Alert.alert('Error', (e as Error)?.message ?? 'No se pudo eliminar'); }
      }},
    ]);
  }, [deleteTutoria]);

  const handleAccept = useCallback(async (tutoriaId: string, inscripcionId: string) => {
    try {
      await acceptEnrollment.mutateAsync({ tutoriaId, inscripcionId });
      Toast.show({ type: 'success', text1: 'Aceptada', text2: 'Inscripción aceptada' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: (e as Error)?.message ?? 'No se pudo aceptar' });
    }
  }, [acceptEnrollment]);

  const handleReject = useCallback(async (tutoriaId: string, inscripcionId: string) => {
    Alert.alert('Rechazar inscripción', '¿Estás seguro de rechazar esta inscripción?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: async () => {
        try {
          await rejectEnrollment.mutateAsync({ tutoriaId, inscripcionId });
          Toast.show({ type: 'success', text1: 'Rechazada', text2: 'Inscripción rechazada' });
        } catch (e) {
          Toast.show({ type: 'error', text1: 'Error', text2: (e as Error)?.message ?? 'No se pudo rechazar' });
        }
      }},
    ]);
  }, [rejectEnrollment]);

  // ─── Render helpers ───

  function StatusBadge({ estado }: { estado: EnrollmentStatus }) {
    const color = ENROLLMENT_STATUS_COLORS[estado];
    return (
      <View style={[s.statusBadge, { backgroundColor: color + '18' }]}>
        <Text style={[s.statusBadgeText, { color }]}>{ENROLLMENT_STATUS_LABELS[estado]}</Text>
      </View>
    );
  }

  function getTutoriaInfo(inscripcion: Inscripcion) {
    if (typeof inscripcion.tutoria_id === 'object' && inscripcion.tutoria_id !== null) {
      return inscripcion.tutoria_id as { _id: string; titulo: string; horarios: { dia: string; horaInicio: string; horaFin: string }[]; informacion: string; oficina: string; docente?: { nombre: string; apellido: string; email: string; telefono: string; imagen: string } };
    }
    return null;
  }

  // ─── Student: Available tutorias ───

  const renderTutoriaItem = useCallback(({ item }: { item: Tutoria }) => {
    const sc = STATUS_COLORS[item.status];
    const isPast = item.status === 'finalizada' || item.status === 'cancelada';
    return (
      <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: 12 }}>
        <AppCard variant="glass" style={isPast && s.cardPast}>
          <View style={s.cardHeader}>
            <View style={s.cardTitleRow}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[s.statusBadge, { backgroundColor: sc + '15' }]}><Text style={[s.statusBadgeText, { color: sc }]}>{item.status}</Text></View>
            </View>
            <Text style={s.subject}>{item.subject}</Text>
          </View>
          {item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
          <View style={s.meta}>
            {item.horarios && item.horarios.length > 0 ? item.horarios.map((h, i) => (
              <View style={s.metaRow} key={i}><Calendar size={14} color={T.textSecondary} /><Text style={s.metaItem}>{h.dia}  {h.horaInicio} - {h.horaFin}</Text></View>
            )) : (
              <View style={s.metaRow}><Calendar size={14} color={T.textSecondary} /><Text style={s.metaItem}>{item.date} · {item.time}</Text></View>
            )}
            <View style={s.metaRow}><Clock size={14} color={T.textSecondary} /><Text style={s.metaItem}>{item.duration} min</Text></View>
            {item.location && <View style={s.metaRow}><MapPin size={14} color={T.textSecondary} /><Text style={s.metaItem}>{item.location}</Text></View>}
            <View style={s.metaRow}><Users size={14} color={T.textSecondary} /><Text style={s.metaItem}>{item.enrolledCount}/{item.maxStudents} estudiantes</Text></View>
          </View>
          <View style={s.actions}>
            {isEstudiante && item.status === 'programada' && <EnrollButton tutoriaId={item.id} />}
            {(isDocente || isAdmin) && item.status === 'programada' && <AppButton label="Editar" variant="ghost" size="sm" icon={<Edit2 size={14} color={T.primary} />} onPress={() => setEditTarget(item)} />}
            {(isDocente || isAdmin) && item.status === 'programada' && <AppButton label="Cancelar" variant="danger" size="sm" onPress={() => cancelTutoria.mutate(item.id)} />}
            {(isAdmin || (isDocente && item.createdBy === user?.id)) && <AppButton label="Eliminar" variant="danger" size="sm" icon={<Trash2 size={14} color={T.error} />} onPress={() => handleDelete(item)} />}
          </View>
        </AppCard>
      </Animated.View>
    );
  }, [isDocente, isAdmin, isEstudiante, user, cancelTutoria, handleDelete]);

  // ─── Student: My enrollments ───

  const renderStudentEnrollment = useCallback(({ item }: { item: Inscripcion }) => {
    const info = getTutoriaInfo(item);
    const estado = item.estado;
    return (
      <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: 12 }}>
        <AppCard variant="glass">
          <View style={s.cardHeader}>
            <View style={s.cardTitleRow}>
              <Text style={s.cardTitle} numberOfLines={1}>{info?.titulo ?? 'Tutoría'}</Text>
              <StatusBadge estado={estado} />
            </View>
          </View>
          {info && (
            <View style={s.meta}>
              {info.horarios?.map((h, i) => (
                <View style={s.metaRow} key={i}><Calendar size={14} color={T.textSecondary} /><Text style={s.metaItem}>{h.dia} {h.horaInicio} - {h.horaFin}</Text></View>
              ))}
              {info.docente && (
                <View style={s.metaRow}><GraduationCap size={14} color={T.textSecondary} /><Text style={s.metaItem}>{info.docente.nombre} {info.docente.apellido}</Text></View>
              )}
              {info.oficina && (
                <View style={s.metaRow}><MapPin size={14} color={T.textSecondary} /><Text style={s.metaItem}>{info.oficina}</Text></View>
              )}
            </View>
          )}
          <View style={s.actions}>
            <CancelButton inscripcion={item} />
          </View>
        </AppCard>
      </Animated.View>
    );
  }, []);

  // ─── Teacher: Received enrollments ───

  const renderTutoriaGroup = useCallback(({ item }: { item: { tutoria: { _id: string; titulo: string; horarios: { dia: string; horaInicio: string; horaFin: string }[]; oficina: string }; estudiantes: Inscripcion[] } }) => {
    const isExpanded = expandedTutoriaId === item.tutoria._id;
    const isSolicitudes = docenteInscripcionTab === 'solicitudes';
    return (
      <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: 12 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpandedTutoriaId(isExpanded ? null : item.tutoria._id)}
          style={s.tutoriaGroupHeader}
        >
          <AppCard variant="glass" padding="md">
            <View style={s.groupCardRow}>
              <View style={s.groupCardInfo}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.tutoria.titulo}</Text>
                {item.tutoria.horarios?.map((h, i) => (
                  <View style={s.metaRow} key={i}>
                    <Calendar size={12} color={T.textSecondary} />
                    <Text style={s.metaItem}>{h.dia} {h.horaInicio} - {h.horaFin}</Text>
                  </View>
                ))}
                {item.tutoria.oficina && (
                  <View style={s.metaRow}>
                    <MapPin size={12} color={T.textSecondary} />
                    <Text style={s.metaItem}>{item.tutoria.oficina}</Text>
                  </View>
                )}
                <View style={s.metaRow}>
                  <Users size={12} color={T.textSecondary} />
                  <Text style={s.metaItem}>{item.estudiantes.length} estudiante{item.estudiantes.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              <View style={s.groupCardChevron}>
                {isExpanded ? <ChevronDown size={20} color={T.textSecondary} /> : <ChevronRight size={20} color={T.textSecondary} />}
              </View>
            </View>
          </AppCard>
        </TouchableOpacity>
        {isExpanded && (
          <View style={s.estudiantesList}>
            {item.estudiantes.map((inscripcion) => {
              const est = typeof inscripcion.estudiante_id === 'object' && inscripcion.estudiante_id !== null
                ? inscripcion.estudiante_id as EstudiantePerfil : null;
              if (!est) return null;
              const isProcessing = acceptEnrollment.isPending || rejectEnrollment.isPending;
              return (
                <Pressable
                  key={inscripcion._id}
                  style={s.estudianteRow}
                  onPress={() => setSelectedEstudiante(est)}
                >
                  <View style={s.estudianteAvatar}>
                    {est.imagen ? (
                      <Image source={{ uri: est.imagen }} style={s.estudianteAvatarImg} />
                    ) : (
                      <User size={18} color={T.textSecondary} />
                    )}
                  </View>
                  <View style={s.estudianteInfo}>
                    <Text style={s.estudianteNombre} numberOfLines={1}>{est.nombre} {est.apellido}</Text>
                    <Text style={s.estudianteEmail} numberOfLines={1}>{est.email}</Text>
                  </View>
                  <StatusBadge estado={inscripcion.estado} />
                  {isSolicitudes && inscripcion.estado === 'pendiente' && (
                    <View style={s.estudianteActions}>
                      <TouchableOpacity
                        style={s.acceptBtn}
                        disabled={isProcessing}
                        onPress={() => handleAccept(item.tutoria._id, inscripcion._id)}
                      >
                        <Check size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.rejectBtn}
                        disabled={isProcessing}
                        onPress={() => handleReject(item.tutoria._id, inscripcion._id)}
                      >
                        <Ban size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </Animated.View>
    );
  }, [expandedTutoriaId, docenteInscripcionTab, acceptEnrollment.isPending, rejectEnrollment.isPending, handleAccept, handleReject]);

  // ─── Header ───

  function renderHeader() {
    return (
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Tutorías</Text>
            <Text style={s.subtitle}>
              {isEstudiante ? 'Inscríbete a tutorías académicas' : isDocente ? 'Gestiona tus tutorías e inscripciones' : 'Gestión de tutorías'}
            </Text>
          </View>
          {(isDocente || isAdmin) && (
            <TouchableOpacity style={s.createBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
              <Text style={s.createBtnText}>+ Crear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ─── Student tab bar ───

  function StudentTabBar() {
    return (
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabChip, studentTab === 'explorar' && s.tabChipActive]} onPress={() => setStudentTab('explorar')}>
          <Text style={[s.tabChipText, studentTab === 'explorar' && s.tabChipTextActive]}>Explorar tutorías</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabChip, studentTab === 'inscripciones' && s.tabChipActive]} onPress={() => setStudentTab('inscripciones')}>
          <Text style={[s.tabChipText, studentTab === 'inscripciones' && s.tabChipTextActive]}>Mis inscripciones ({studentEnrollments.length})</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Docente tab bar ───

  function DocenteTabBar() {
    return (
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabChip, docenteTab === 'mis_tutorias' && s.tabChipActive]} onPress={() => setDocenteTab('mis_tutorias')}>
          <Text style={[s.tabChipText, docenteTab === 'mis_tutorias' && s.tabChipTextActive]}>Mis tutorías</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabChip, docenteTab === 'inscripciones_recibidas' && s.tabChipActive]} onPress={() => setDocenteTab('inscripciones_recibidas')}>
          <Text style={[s.tabChipText, docenteTab === 'inscripciones_recibidas' && s.tabChipTextActive]}>Inscripciones ({teacherEnrollments.length})</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Docente inscripcion sub-tab bar ───

  function DocenteInscripcionSubTabBar() {
    const pendientes = teacherEnrollments.filter((e) => e.estado === 'pendiente').length;
    const aceptadas = teacherEnrollments.filter((e) => e.estado === 'aceptado').length;
    return (
      <View style={s.subTabRow}>
        <TouchableOpacity style={[s.subTabChip, docenteInscripcionTab === 'solicitudes' && s.subTabChipActive]} onPress={() => { setDocenteInscripcionTab('solicitudes'); setExpandedTutoriaId(null); }}>
          <Text style={[s.subTabChipText, docenteInscripcionTab === 'solicitudes' && s.subTabChipTextActive]}>Solicitudes ({pendientes})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.subTabChip, docenteInscripcionTab === 'confirmadas' && s.subTabChipActive]} onPress={() => { setDocenteInscripcionTab('confirmadas'); setExpandedTutoriaId(null); }}>
          <Text style={[s.subTabChipText, docenteInscripcionTab === 'confirmadas' && s.subTabChipTextActive]}>Confirmadas ({aceptadas})</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Student: Available tutorias list ───

  function StudentExplorarView() {
    return (
      <View style={{ flex: 1 }}>
        <TextInput style={s.search} placeholder="Buscar tutorías..." placeholderTextColor={T.inputPlaceholder} value={search} onChangeText={setSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filters}>
          {STATUS_CHIPS.map((chip) => (
            <TouchableOpacity key={chip.key} style={[s.chip, statusFilter === chip.key && s.chipActive]} onPress={() => setStatusFilter(chip.key)}>
              <Text style={[s.chipText, statusFilter === chip.key && s.chipTextActive]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isLoading && <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />}
        <FlashList
          data={filteredTutorias}
          keyExtractor={(item) => item.id}
          renderItem={renderTutoriaItem}
          contentContainerStyle={s.list}
          refreshing={isRefetching}
          onRefresh={() => refetchTutorias()}
          ListEmptyComponent={<EmptyState icon={GraduationCap} title="No hay tutorías disponibles" description="No se encontraron tutorías para mostrar." />}
        />
      </View>
    );
  }

  // ─── Student: My enrollments list ───

  function StudentInscripcionesView() {
    return (
      <View style={{ flex: 1 }}>
        {studentEnrollmentsLoading && <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />}
        <FlashList
          data={studentEnrollments}
          keyExtractor={(item) => item._id}
          renderItem={renderStudentEnrollment}
          contentContainerStyle={s.list}
          refreshing={studentEnrollmentsRefetching}
          onRefresh={() => refetchStudentEnrollments()}
          ListEmptyComponent={<EmptyState icon={GraduationCap} title="Sin inscripciones" description="No te has inscrito a ninguna tutoría aún." />}
        />
      </View>
    );
  }

  // ─── Teacher: My tutorias (only own, with edit/delete) ───

  function DocenteMisTutoriasView() {
    const misTutorias = tutorias.filter((t) => t.createdBy === user?.id);
    return (
      <View style={{ flex: 1 }}>
        <TextInput style={s.search} placeholder="Buscar tutorías..." placeholderTextColor={T.inputPlaceholder} value={search} onChangeText={setSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filters}>
          {STATUS_CHIPS.map((chip) => (
            <TouchableOpacity key={chip.key} style={[s.chip, statusFilter === chip.key && s.chipActive]} onPress={() => setStatusFilter(chip.key)}>
              <Text style={[s.chipText, statusFilter === chip.key && s.chipTextActive]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isLoading && <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />}
        <FlashList
          data={misTutorias}
          keyExtractor={(item) => item.id}
          renderItem={renderTutoriaItem}
          contentContainerStyle={s.list}
          refreshing={isRefetching}
          onRefresh={() => refetchTutorias()}
          ListEmptyComponent={<EmptyState icon={GraduationCap} title="No tienes tutorías" description="Crea una nueva tutoría para comenzar." />}
        />
      </View>
    );
  }

  // ─── Teacher: Received enrollments ───

  function DocenteInscripcionesView() {
    return (
      <View style={{ flex: 1 }}>
        <DocenteInscripcionSubTabBar />
        {teacherEnrollmentsLoading && <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />}
        <FlashList
          data={groupedTeacherEnrollments}
          keyExtractor={(item) => item.tutoria._id}
          renderItem={renderTutoriaGroup}
          contentContainerStyle={s.list}
          refreshing={teacherEnrollmentsRefetching}
          onRefresh={() => refetchTeacherEnrollments()}
          ListEmptyComponent={<EmptyState icon={GraduationCap} title={`Sin ${docenteInscripcionTab === 'solicitudes' ? 'solicitudes' : 'confirmaciones'}`} description={docenteInscripcionTab === 'solicitudes' ? 'No hay estudiantes que hayan solicitado inscripción.' : 'Aún no has aceptado ninguna inscripción.'} />}
        />
      </View>
    );
  }

  // ─── Admin view (keep existing) ───

  function AdminView() {
    return (
      <View style={{ flex: 1 }}>
        <TextInput style={s.search} placeholder="Buscar tutorías..." placeholderTextColor={T.inputPlaceholder} value={search} onChangeText={setSearch} />
        <View style={s.ownerRow}>
          {(['todas', 'mis'] as const).map((key) => (
            <TouchableOpacity key={key} style={[s.ownerChip, ownerFilter === key && s.ownerChipActive]} onPress={() => setOwnerFilter(key)}>
              <Text style={[s.ownerChipText, ownerFilter === key && s.ownerChipTextActive]}>{key === 'todas' ? 'Explorar' : 'Mis Tutorías'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filters}>
          {STATUS_CHIPS.map((chip) => (
            <TouchableOpacity key={chip.key} style={[s.chip, statusFilter === chip.key && s.chipActive]} onPress={() => setStatusFilter(chip.key)}>
              <Text style={[s.chipText, statusFilter === chip.key && s.chipTextActive]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isLoading && <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />}
        <FlashList
          data={filteredTutorias}
          keyExtractor={(item) => item.id}
          renderItem={renderTutoriaItem}
          contentContainerStyle={s.list}
          refreshing={isRefetching}
          onRefresh={() => refetchTutorias()}
          ListEmptyComponent={<EmptyState icon={GraduationCap} title="No hay tutorías" description="Crea una nueva tutoría para comenzar." />}
        />
      </View>
    );
  }

  // ─── Main render ───

  return (
    <View style={s.container}>
      {renderHeader()}

      {isEstudiante && <StudentTabBar />}
      {isDocente && <DocenteTabBar />}

      {isEstudiante && studentTab === 'explorar' && <StudentExplorarView />}
      {isEstudiante && studentTab === 'inscripciones' && <StudentInscripcionesView />}
      {isDocente && docenteTab === 'mis_tutorias' && <DocenteMisTutoriasView />}
      {isDocente && docenteTab === 'inscripciones_recibidas' && <DocenteInscripcionesView />}
      {isAdmin && <AdminView />}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={s.modalCloseBtn}><X size={16} strokeWidth={2.2} color={T.textSecondary} /></TouchableOpacity>
            <Text style={s.modalTitle}>Crear tutoría</Text>
            <View style={{ width: 36 }} />
          </View>
          <TutoriaForm onSubmit={handleCreate} isLoading={createTutoria.isPending} />
        </View>
      </Modal>

      <Modal visible={!!editTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditTarget(null)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setEditTarget(null)} style={s.modalCloseBtn}><X size={16} strokeWidth={2.2} color={T.textSecondary} /></TouchableOpacity>
            <Text style={s.modalTitle}>Editar tutoría</Text>
            <View style={{ width: 36 }} />
          </View>
          {editTarget && <TutoriaForm editData={editTarget} onSubmit={handleUpdate} isLoading={updateTutoria.isPending} />}
        </View>
      </Modal>

      <Modal visible={!!selectedEstudiante} animationType="slide" presentationStyle="pageSheet" transparent onRequestClose={() => setSelectedEstudiante(null)}>
        <View style={s.modalOverlay}>
          <View style={s.estudianteModal}>
            <View style={s.estudianteModalHeader}>
              <Text style={s.modalTitle}>Perfil del estudiante</Text>
              <TouchableOpacity onPress={() => setSelectedEstudiante(null)} style={s.modalCloseBtn}><X size={16} strokeWidth={2.2} color={T.textSecondary} /></TouchableOpacity>
            </View>
            {selectedEstudiante && (
              <View style={s.estudianteModalBody}>
                <View style={s.estudianteModalAvatar}>
                  {selectedEstudiante.imagen ? (
                    <Image source={{ uri: selectedEstudiante.imagen }} style={s.estudianteModalAvatarImg} />
                  ) : (
                    <View style={s.estudianteModalAvatarPlaceholder}>
                      <User size={40} color={T.primary} />
                    </View>
                  )}
                </View>
                <Text style={s.estudianteModalName}>{selectedEstudiante.nombre} {selectedEstudiante.apellido}</Text>

                <View style={s.estudianteModalField}>
                  <Mail size={18} color={T.primary} />
                  <View style={s.estudianteModalFieldContent}>
                    <Text style={s.estudianteModalFieldLabel}>Correo</Text>
                    <Text style={s.estudianteModalFieldValue}>{selectedEstudiante.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${selectedEstudiante.email}`)}>
                    <Text style={s.estudianteModalAction}>Enviar</Text>
                  </TouchableOpacity>
                </View>

                {selectedEstudiante.telefono && (
                  <View style={s.estudianteModalField}>
                    <Phone size={18} color={T.primary} />
                    <View style={s.estudianteModalFieldContent}>
                      <Text style={s.estudianteModalFieldLabel}>Teléfono</Text>
                      <Text style={s.estudianteModalFieldValue}>{selectedEstudiante.telefono}</Text>
                    </View>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedEstudiante.telefono}`)}>
                      <Text style={s.estudianteModalAction}>Llamar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Standalone enrollment components ───

function EnrollButton({ tutoriaId }: { tutoriaId: string }) {
  const user = useAuthStore((s) => s.user);
  const { isEnrolled, isLoading: enrollLoading, enroll, unenroll } = useTutoriaEnrollment(tutoriaId);
  if (!user) return null;
  const isLoading = enrollLoading || enroll.isPending || unenroll.isPending;
  return (
    <AppButton
      variant={isEnrolled ? 'outline' : 'primary'}
      size="sm"
      label={isEnrolled ? '✓ Inscrito' : 'Inscribirse'}
      isLoading={isLoading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isEnrolled) {
          Toast.show({ type: 'info', text1: 'Ya estás inscrito' });
        } else {
          enroll.mutate(undefined, {
            onSuccess: () => Toast.show({ type: 'success', text1: 'Inscripción exitosa', text2: 'Espera la confirmación del docente' }),
            onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
          });
        }
      }}
    />
  );
}

function CancelButton({ inscripcion }: { inscripcion: Inscripcion }) {
  const rawTutoriaId = inscripcion.tutoria_id;
  const tutoriaId = rawTutoriaId ? (typeof rawTutoriaId === 'string' ? rawTutoriaId : (rawTutoriaId as { _id: string })._id) : '';
  const { unenroll } = useTutoriaEnrollment(tutoriaId);
  const tutoriaTitulo = (typeof rawTutoriaId === 'object' && rawTutoriaId !== null ? (rawTutoriaId as { titulo?: string }).titulo : null) ?? 'esta tutoría';
  if (!rawTutoriaId) return null;
  return (
    <AppButton
      variant="danger"
      size="sm"
      label="Cancelar inscripción"
      isLoading={unenroll.isPending}
      onPress={() => {
        Alert.alert('Cancelar inscripción', `¿Estás seguro de cancelar tu inscripción en ${tutoriaTitulo}?`, [
          { text: 'No', style: 'cancel' },
          { text: 'Sí, cancelar', style: 'destructive', onPress: () => {
            unenroll.mutate(undefined, {
              onSuccess: () => Toast.show({ type: 'success', text1: 'Correcto', text2: 'Inscripción cancelada correctamente' }),
              onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
            });
          }},
        ]);
      }}
    />
  );
}

const s = StyleSheet.create({
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

  tabRow: {
    flexDirection: 'row', marginHorizontal: Sizes.paddingMd, marginTop: 12, marginBottom: 4, gap: 8,
  },
  tabChip: {
    flex: 1, paddingVertical: 10, borderRadius: Sizes.radiusSm,
    backgroundColor: T.surfaceGlass, alignItems: 'center',
    borderWidth: 1.5, borderColor: T.cardBorder,
  },
  tabChipActive: {
    backgroundColor: T.primaryMuted, borderColor: T.primary,
    ...Shadows.sm, shadowColor: T.primary, shadowOpacity: 0.15,
  },
  tabChipText: { ...Typography.caption, fontWeight: '600', color: T.textSecondary },
  tabChipTextActive: { color: T.primary },

  search: {
    marginHorizontal: Sizes.paddingMd, marginTop: 8, marginBottom: 8,
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
  statusBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
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

  subTabRow: {
    flexDirection: 'row', marginHorizontal: Sizes.paddingMd, marginTop: 8, marginBottom: 4, gap: 8,
  },
  subTabChip: {
    flex: 1, paddingVertical: 8, borderRadius: Sizes.radiusSm,
    backgroundColor: T.surface, alignItems: 'center',
    borderWidth: 1, borderColor: T.cardBorder,
  },
  subTabChipActive: {
    backgroundColor: T.primaryMuted, borderColor: T.primary,
  },
  subTabChipText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
  subTabChipTextActive: { color: T.primary },

  tutoriaGroupHeader: { marginBottom: 0 },
  groupCardRow: { flexDirection: 'row', alignItems: 'center' },
  groupCardInfo: { flex: 1, gap: 4 },
  groupCardChevron: { marginLeft: 8 },

  estudiantesList: {
    marginTop: 0, paddingLeft: Sizes.paddingMd,
    borderLeftWidth: 2, borderLeftColor: T.primaryMuted, marginLeft: Sizes.paddingMd,
  },
  estudianteRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: Sizes.radiusSm,
    padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: T.cardBorder,
    gap: 10,
  },
  estudianteAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  estudianteAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  estudianteInfo: { flex: 1 },
  estudianteNombre: { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  estudianteEmail: { fontSize: 11, color: T.textSecondary, marginTop: 1 },
  estudianteActions: { flexDirection: 'row', gap: 4 },
  acceptBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.success, justifyContent: 'center', alignItems: 'center',
  },
  rejectBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.error, justifyContent: 'center', alignItems: 'center',
  },

  modalOverlay: {
    flex: 1, backgroundColor: T.overlay,
    justifyContent: 'flex-end',
  },
  estudianteModal: {
    backgroundColor: T.background,
    borderTopLeftRadius: Sizes.radiusXl,
    borderTopRightRadius: Sizes.radiusXl,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  estudianteModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Sizes.paddingMd, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  estudianteModalBody: {
    padding: Sizes.paddingMd, gap: 16, alignItems: 'center',
  },
  estudianteModalAvatar: { marginBottom: 4 },
  estudianteModalAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  estudianteModalAvatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  estudianteModalName: { ...Typography.h3, color: T.textPrimary, marginBottom: 8 },
  estudianteModalField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: Sizes.radiusSm,
    padding: 14, borderWidth: 1, borderColor: T.cardBorder,
    width: '100%', gap: 12,
  },
  estudianteModalFieldContent: { flex: 1 },
  estudianteModalFieldLabel: { fontSize: 11, color: T.textTertiary, textTransform: 'uppercase', fontWeight: '600' },
  estudianteModalFieldValue: { fontSize: 14, color: T.textPrimary, marginTop: 1 },
  estudianteModalAction: { fontSize: 13, fontWeight: '600', color: T.primary },
});

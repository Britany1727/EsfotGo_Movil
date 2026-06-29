import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { Tutoria } from '../domain/tutoria.entity';
import { ExpressTutoriaRepository } from '../infrastructure/express-tutoria.repository';
import { useAuthStore } from '@/store/auth.store';

const repository = new ExpressTutoriaRepository();

export function useTutorias() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Tutoria['status'] | 'todas'>('todas');
  const [ownerFilter, setOwnerFilter] = useState<'todas' | 'mis'>('todas');
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['tutorias'],
    queryFn: () => repository.getAll(),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 30,
  });

  const filtered = useMemo(() => {
    let result = query.data ?? [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'todas') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (ownerFilter === 'mis' && user) {
      result = result.filter((t) => t.createdBy === user.id);
    }
    return result;
  }, [query.data, search, statusFilter, ownerFilter, user]);

  const createTutoria = useMutation({
    mutationFn: (input: Omit<Tutoria, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>) =>
      repository.create({ ...input, createdBy: user?.id ?? '', docente: user?.id ?? '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorias'] }),
    onError: (err) => { console.log('[TutoriasHook] Error creando tutoría:', err); },
  });

  const updateTutoria = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Tutoria> }) =>
      repository.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorias'] }),
    onError: (err) => { console.log('[TutoriasHook] Error actualizando tutoría:', err); },
  });

  const deleteTutoria = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorias'] }),
    onError: (err) => { console.log('[TutoriasHook] Error eliminando tutoría:', err); },
  });

  const cancelTutoria = useMutation({
    mutationFn: (id: string) => repository.update(id, { status: 'cancelada' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorias'] }),
    onError: (err) => { console.log('[TutoriasHook] Error cancelando tutoría:', err); },
  });

  return {
    tutorias: filtered,
    isLoading: query.isLoading,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    search, setSearch,
    statusFilter, setStatusFilter,
    ownerFilter, setOwnerFilter,
    createTutoria,
    updateTutoria,
    deleteTutoria,
    cancelTutoria,
    user,
  };
}

export function useTutoriaEnrollment(tutoriaId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const enrollmentQuery = useQuery({
    queryKey: ['tutoria-enrollments', tutoriaId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      return repository.isEnrolled(tutoriaId, user.id);
    },
    enabled: !!tutoriaId && !!user,
  });

  const enroll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No autenticado');
      await repository.enroll(tutoriaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutoria-enrollments', tutoriaId] });
      queryClient.invalidateQueries({ queryKey: ['tutorias'] });
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
    },
  });

  const unenroll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No autenticado');
      await repository.unenroll(tutoriaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutoria-enrollments', tutoriaId] });
      queryClient.invalidateQueries({ queryKey: ['tutorias'] });
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
    },
  });

  return {
    isEnrolled: enrollmentQuery.data ?? false,
    isLoading: enrollmentQuery.isLoading,
    enroll,
    unenroll,
  };
}

export function useStudentEnrollments() {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['student-enrollments', user?.id],
    queryFn: () => repository.getStudentEnrollments(),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  return {
    enrollments: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

export function useTeacherEnrollments() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['teacher-enrollments', user?.id],
    queryFn: () => repository.getTeacherEnrollments(),
    enabled: !!user && user.role === 'docente',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const acceptEnrollment = useMutation({
    mutationFn: ({ tutoriaId, inscripcionId }: { tutoriaId: string; inscripcionId: string }) =>
      repository.acceptEnrollment(tutoriaId, inscripcionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['tutorias'] });
    },
  });

  const rejectEnrollment = useMutation({
    mutationFn: ({ tutoriaId, inscripcionId }: { tutoriaId: string; inscripcionId: string }) =>
      repository.rejectEnrollment(tutoriaId, inscripcionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['tutorias'] });
    },
  });

  return {
    enrollments: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    acceptEnrollment,
    rejectEnrollment,
  };
}

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
      repository.create({ ...input, createdBy: user?.id ?? '' }),
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
      await repository.enroll(tutoriaId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutoria-enrollments', tutoriaId] });
      queryClient.invalidateQueries({ queryKey: ['tutorias'] });
    },
  });

  const unenroll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No autenticado');
      await repository.unenroll(tutoriaId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutoria-enrollments', tutoriaId] });
      queryClient.invalidateQueries({ queryKey: ['tutorias'] });
    },
  });

  return {
    isEnrolled: enrollmentQuery.data ?? false,
    isLoading: enrollmentQuery.isLoading,
    enroll,
    unenroll,
  };
}

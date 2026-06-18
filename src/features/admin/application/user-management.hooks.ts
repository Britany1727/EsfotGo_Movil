import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useCallback } from 'react';
import { ExpressUserManagementRepository } from '../infrastructure/express-user-management.repository';
import { useExpressAuthStore } from '@/services/express/express-auth.store';
import type { ManagedUser, ManagedUserType, UserFiltersState, CreateManagedUserInput } from '../domain/user-management.entity';

const repository = new ExpressUserManagementRepository();

export function useManagedUsers() {
  const token = useExpressAuthStore((s) => s.expressToken);
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<UserFiltersState>({
    search: '',
    type: 'todos',
    status: 'todos',
  });

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const estudiantesQuery = useQuery({
    queryKey: ['admin', 'users', 'estudiantes'],
    queryFn: async () => {
      const res = await repository.getEstudiantes(token ?? '');
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    enabled: !!token && (filters.type === 'todos' || filters.type === 'estudiante'),
  });

  const docentesQuery = useQuery({
    queryKey: ['admin', 'users', 'docentes'],
    queryFn: async () => {
      const res = await repository.getDocentes(token ?? '');
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    enabled: !!token && (filters.type === 'todos' || filters.type === 'docente'),
  });

  const allUsers = useMemo(() => {
    const estudiantes = estudiantesQuery.data ?? [];
    const docentes = docentesQuery.data ?? [];
    return [...estudiantes, ...docentes].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [estudiantesQuery.data, docentesQuery.data]);

  const filteredUsers = useMemo(() => {
    let result = allUsers;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.nombre.toLowerCase().includes(q) ||
          (u.apellido ?? '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (filters.type !== 'todos') {
      result = result.filter((u) => u.type === filters.type);
    }

    if (filters.status !== 'todos') {
      result = result.filter((u) => u.status === filters.status);
    }

    return result;
  }, [allUsers, filters]);

  const paginatedUsers = useMemo(() => {
    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = filteredUsers.slice(start, start + pageSize);
    return { data, total, page, totalPages };
  }, [filteredUsers, page, pageSize]);

  const updateUser = useMutation({
    mutationFn: async ({
      user,
      updates,
    }: {
      user: ManagedUser;
      updates: Partial<ManagedUser>;
    }) => {
      if (user.type === 'docente') {
        const res = await repository.updateDocente(user._id, updates, token ?? '');
        if (res.error) throw new Error(res.error);
      } else {
        const res = await repository.updateEstudiante(user._id, updates, token ?? '');
        if (res.error) throw new Error(res.error);
      }
    },
    onMutate: async ({ user, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
      const prevEstudiantes = queryClient.getQueryData<ManagedUser[]>(['admin', 'users', 'estudiantes']);
      const prevDocentes = queryClient.getQueryData<ManagedUser[]>(['admin', 'users', 'docentes']);

      const updateList = (list: ManagedUser[] | undefined) =>
        list?.map((u) => (u._id === user._id ? { ...u, ...updates } : u));

      queryClient.setQueryData(['admin', 'users', 'estudiantes'], updateList(prevEstudiantes));
      queryClient.setQueryData(['admin', 'users', 'docentes'], updateList(prevDocentes));

      return { prevEstudiantes, prevDocentes };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        if (context.prevEstudiantes) {
          queryClient.setQueryData(['admin', 'users', 'estudiantes'], context.prevEstudiantes);
        }
        if (context.prevDocentes) {
          queryClient.setQueryData(['admin', 'users', 'docentes'], context.prevDocentes);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (user: ManagedUser) => {
      if (user.type === 'docente') {
        const res = await repository.deleteDocente(user._id, token ?? '');
        if (res.error) throw new Error(res.error);
      } else {
        const res = await repository.deleteEstudiante(user._id, token ?? '');
        if (res.error) throw new Error(res.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const createUser = useMutation({
    mutationFn: async (input: CreateManagedUserInput) => {
      const res =
        input.type === 'docente'
          ? await repository.createDocente(input, token ?? '')
          : await repository.createEstudiante(input, token ?? '');
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPage(1);
  }, []);

  const setTypeFilter = useCallback((type: ManagedUserType | 'todos') => {
    setFilters((prev) => ({ ...prev, type }));
    setPage(1);
  }, []);

  const setStatusFilter = useCallback((status: UserFiltersState['status']) => {
    setFilters((prev) => ({ ...prev, status }));
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  }, [queryClient]);

  return {
    users: paginatedUsers.data,
    total: paginatedUsers.total,
    page,
    totalPages: paginatedUsers.totalPages,
    isLoading: estudiantesQuery.isLoading || docentesQuery.isLoading,
    isError: estudiantesQuery.isError || docentesQuery.isError,
    filters,
    setSearch,
    setTypeFilter,
    setStatusFilter,
    setPage,
    updateUser,
    deleteUser,
    createUser,
    refresh,
  };
}

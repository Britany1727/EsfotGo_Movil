import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { ExpressGraphRepository } from '../infrastructure/express-graph.repository';
import { aStar } from '../domain/a-star';
import type { CampusGraph, GraphEdge, GraphNode, OptimalRoute } from '../domain/graph.entity';

const repo = new ExpressGraphRepository();
const QUERY_KEY = ['campus-graph'];

export function useCampusGraph() {
  return useQuery<CampusGraph>({
    queryKey: QUERY_KEY,
    queryFn: () => repo.getGraph(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

export function useOptimalRoute(
  graph: CampusGraph | undefined,
  fromId: string | null,
  toId: string | null
): OptimalRoute | null {
  return useMemo(() => {
    if (!graph || !fromId || !toId || fromId === toId) return null;
    return aStar(graph, fromId, toId);
  }, [graph, fromId, toId]);
}

export function useGraphNodeMutations() {
  const qc = useQueryClient();
  const upsertNode = useMutation({
    mutationFn: (node: Omit<GraphNode, 'id'> & { id?: string }) => repo.upsertNode(node),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
  const deleteNode = useMutation({
    mutationFn: (id: string) => repo.deleteNode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
  return { upsertNode, deleteNode };
}

export function useGraphEdgeMutations() {
  const qc = useQueryClient();
  const upsertEdge = useMutation({
    mutationFn: (edge: Omit<GraphEdge, 'id'> & { id?: string }) => repo.upsertEdge(edge),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
  const updateEdge = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<GraphEdge> }) => repo.updateEdge(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
  const deleteEdge = useMutation({
    mutationFn: (id: string) => repo.deleteEdge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
  const toggleBlock = useCallback(
    (id: string, currentBlocked: boolean) => updateEdge.mutateAsync({ id, patch: { blocked: !currentBlocked } }),
    [updateEdge]
  );
  return { upsertEdge, updateEdge, deleteEdge, toggleBlock };
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/services/http-client';
import { AppError } from '@/core/errors/app-error';
import type { IGraphRepository } from '../domain/graph.repository';
import type { CampusGraph, GraphEdge, GraphNode } from '../domain/graph.entity';
import { MockData } from '@/core/dev/mock-services';
import { isDevMode } from '@/core/config/env';

const AUTH_TOKEN_KEY = 'esfotgo_jwt_token';

// ─── DTOs ───────────────────────────────────────────────────

interface GraphNodeDto {
  _id?: string; id?: string;
  label?: string; nombre?: string;
  latitude?: number; latitud?: number;
  longitude?: number; longitud?: number;
}

interface GraphEdgeDto {
  _id?: string; id?: string;
  from_node_id?: string; fromNodeId?: string;
  to_node_id?: string; toNodeId?: string;
  weight?: number; peso?: number;
  blocked?: boolean; bloqueado?: boolean;
  bidirectional?: boolean; bidireccional?: boolean;
}

// ─── Mappers ────────────────────────────────────────────────

function mapDtoToNode(dto: GraphNodeDto): GraphNode {
  return {
    id: dto._id ?? dto.id ?? '',
    label: dto.label ?? dto.nombre ?? '',
    latitude: dto.latitude ?? dto.latitud ?? 0,
    longitude: dto.longitude ?? dto.longitud ?? 0,
  };
}

function mapDtoToEdge(dto: GraphEdgeDto): GraphEdge {
  return {
    id: dto._id ?? dto.id ?? '',
    fromNodeId: dto.from_node_id ?? dto.fromNodeId ?? '',
    toNodeId: dto.to_node_id ?? dto.toNodeId ?? '',
    weight: dto.weight ?? dto.peso ?? 1,
    blocked: dto.blocked ?? dto.bloqueado ?? false,
    bidirectional: dto.bidirectional ?? dto.bidireccional ?? true,
  };
}

// ─── Repository ─────────────────────────────────────────────

export class ExpressGraphRepository implements IGraphRepository {
  private async token(): Promise<string | null> {
    try { return SecureStore.getItemAsync(AUTH_TOKEN_KEY); } catch { return null; }
  }

  async getGraph(): Promise<CampusGraph> {
    if (isDevMode()) return MockData.getBusRoutes().then(() => ({ nodes: [], edges: [] }));
    const [nodesRes, edgesRes] = await Promise.all([
      httpClient.get<GraphNodeDto[]>('/mapa/grafo/nodos'),
      httpClient.get<GraphEdgeDto[]>('/mapa/grafo/aristas'),
    ]);
    if (nodesRes.error || edgesRes.error) return { nodes: [], edges: [] };
    return {
      nodes: (nodesRes.data ?? []).map(mapDtoToNode),
      edges: (edgesRes.data ?? []).map(mapDtoToEdge),
    };
  }

  async upsertNode(node: Omit<GraphNode, 'id'> & { id?: string }): Promise<GraphNode> {
    if (isDevMode()) return { ...node, id: node.id ?? `mock-${Date.now()}` };
    const t = await this.token();
    const payload: Record<string, unknown> = { label: node.label, latitude: node.latitude, longitude: node.longitude };
    if (node.id) payload._id = node.id;
    const { data, error } = await httpClient.post<GraphNodeDto>('/admin/mapa/grafo/nodos', payload, t);
    if (error || !data) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    return mapDtoToNode(data);
  }

  async deleteNode(id: string): Promise<void> {
    if (isDevMode()) return;
    const t = await this.token();
    const { error } = await httpClient.delete(`/admin/mapa/grafo/nodos/${id}`, t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
  }

  async upsertEdge(edge: Omit<GraphEdge, 'id'> & { id?: string }): Promise<GraphEdge> {
    if (isDevMode()) return { ...edge, id: edge.id ?? `mock-${Date.now()}` };
    const t = await this.token();
    const payload: Record<string, unknown> = {
      from_node_id: edge.fromNodeId, to_node_id: edge.toNodeId,
      weight: edge.weight, blocked: edge.blocked, bidirectional: edge.bidirectional,
    };
    if (edge.id) payload._id = edge.id;
    const { data, error } = await httpClient.post<GraphEdgeDto>('/admin/mapa/grafo/aristas', payload, t);
    if (error || !data) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    return mapDtoToEdge(data);
  }

  async updateEdge(id: string, patch: Partial<GraphEdge>): Promise<GraphEdge> {
    if (isDevMode()) return { id, fromNodeId: '', toNodeId: '', weight: 1, blocked: false, bidirectional: true, ...patch };
    const t = await this.token();
    const payload: Record<string, unknown> = {};
    if (patch.weight !== undefined) payload.weight = patch.weight;
    if (patch.blocked !== undefined) payload.blocked = patch.blocked;
    if (patch.bidirectional !== undefined) payload.bidirectional = patch.bidirectional;
    const { data, error } = await httpClient.put<GraphEdgeDto>(`/admin/mapa/grafo/aristas/${id}`, payload, t);
    if (error || !data) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    return mapDtoToEdge(data);
  }

  async deleteEdge(id: string): Promise<void> {
    if (isDevMode()) return;
    const t = await this.token();
    const { error } = await httpClient.delete(`/admin/mapa/grafo/aristas/${id}`, t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
  }
}

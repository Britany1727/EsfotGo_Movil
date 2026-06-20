import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/services/http-client';
import { AppError } from '@/core/errors/app-error';
import type { IGraphRepository } from '../domain/graph.repository';
import type { CampusGraph, GraphEdge, GraphNode } from '../domain/graph.entity';
import { MockData } from '@/core/dev/mock-services';
import { isDevMode } from '@/core/config/env';
import { logGraphStats } from '../domain/graph-integrity';

const AUTH_TOKEN_KEY = 'esfotgo_jwt_token';

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(value: unknown): boolean {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === '' || value === undefined) continue;
    if (typeof value === 'number' && isNaN(value)) continue;
    clean[key] = value;
  }
  return clean;
}

// ─── DTOs ───────────────────────────────────────────────────

interface GraphNodeDto {
  _id?: string; id?: string;
  label?: string; nombre?: string;
  latitude?: number; latitud?: number;
  longitude?: number; longitud?: number;
  tipo?: string;
  piso?: number;
  edificioId?: string; edificio?: string;
  referenciaId?: string;
  referenciaModelo?: string;
  coord?: { lat: number; lng: number };
  coordenadas?: { lat: number; lng: number };
}

interface GraphEdgeDto {
  _id?: string; id?: string;
  from_node_id?: string; fromNodeId?: string; nodoOrigen?: string;
  to_node_id?: string; toNodeId?: string; nodoDestino?: string;
  weight?: number; peso?: number; distancia?: number;
  blocked?: boolean; bloqueado?: boolean;
  bidirectional?: boolean; bidireccional?: boolean;
  unidireccional?: boolean;
}

// ─── Mappers ────────────────────────────────────────────────

function mapDtoToNode(dto: GraphNodeDto): GraphNode {
  const coords = dto.coordenadas ?? dto.coord;
  return {
    id: dto._id ?? dto.id ?? '',
    label: dto.label ?? dto.nombre ?? '',
    latitude: coords?.lat ?? dto.latitude ?? dto.latitud ?? 0,
    longitude: coords?.lng ?? dto.longitude ?? dto.longitud ?? 0,
    type: (dto.tipo as GraphNode['type']) ?? 'punto_interes',
    floor: dto.piso ?? 1,
    buildingId: dto.edificioId ?? dto.edificio ?? '',
    referenceId: dto.referenciaId ?? null,
    referenceModel: (dto.referenciaModelo as GraphNode['referenceModel']) ?? null,
  };
}

function mapDtoToEdge(dto: GraphEdgeDto): GraphEdge {
  const blocked = dto.blocked ?? dto.bloqueado;
  const unidireccional = dto.unidireccional;
  return {
    id: dto._id ?? dto.id ?? '',
    fromNodeId: dto.from_node_id ?? dto.fromNodeId ?? dto.nodoOrigen ?? '',
    toNodeId: dto.to_node_id ?? dto.toNodeId ?? dto.nodoDestino ?? '',
    weight: dto.weight ?? dto.peso ?? dto.distancia ?? 1,
    blocked: blocked ?? false,
    bidirectional: dto.bidirectional ?? dto.bidireccional ?? !(unidireccional ?? false),
  };
}

// ─── Repository ─────────────────────────────────────────────

export class ExpressGraphRepository implements IGraphRepository {
  private async token(): Promise<string | null> {
    try { return SecureStore.getItemAsync(AUTH_TOKEN_KEY); } catch { return null; }
  }

  async getGraph(): Promise<CampusGraph> {
    if (isDevMode()) return MockData.getBusRoutes().then(() => ({ nodes: [], edges: [] }));
    const { data, error } = await httpClient.get<{ nodos?: GraphNodeDto[]; aristas?: GraphEdgeDto[] }>('/mapa/grafo');
    if (error || !data) {
      console.log('[ExpressGraphRepo] Error cargando grafo:', error);
      return { nodes: [], edges: [] };
    }
    const graph = {
      nodes: (data.nodos ?? []).map(mapDtoToNode),
      edges: (data.aristas ?? []).map(mapDtoToEdge),
    };
    logGraphStats(graph);
    return graph;
  }

  async upsertNode(node: Omit<GraphNode, 'id'> & { id?: string }): Promise<GraphNode> {
    if (isDevMode()) return { ...node, id: node.id ?? `mock-${Date.now()}`, type: node.type ?? 'punto_interes', floor: node.floor ?? 1, buildingId: node.buildingId ?? '', referenceId: node.referenceId ?? null, referenceModel: node.referenceModel ?? null };
    const t = await this.token();
    const payload = sanitizePayload({
      nombre: node.label.trim(),
      tipo: node.type ?? 'punto_interes',
      coordenadas: { lat: Number(node.latitude), lng: Number(node.longitude) },
      piso: Number(node.floor) || 1,
      edificioId: isValidObjectId(node.buildingId) ? node.buildingId : undefined,
      referenciaId: isValidObjectId(node.referenceId) ? node.referenceId : null,
      referenciaModelo: node.referenceModel || null,
    });
    if (node.id && isValidObjectId(node.id)) payload._id = node.id;
    console.log('[ExpressGraphRepo] Upsert nodo payload:', JSON.stringify(payload));
    const { data, error } = await httpClient.post<{ msg?: string; nodo?: GraphNodeDto }>('/admin/mapa/nodo', payload, t);
    if (error || !data) {
      console.log('[ExpressGraphRepo] Error upsert nodo:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
    const nodoData = data.nodo ?? (data as unknown as GraphNodeDto);
    return mapDtoToNode(nodoData);
  }

  async deleteNode(id: string): Promise<void> {
    if (isDevMode()) return;
    const t = await this.token();
    const { error } = await httpClient.delete(`/admin/mapa/nodo/${id}`, t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
  }

  async upsertEdge(edge: Omit<GraphEdge, 'id'> & { id?: string }): Promise<GraphEdge> {
    if (isDevMode()) return { ...edge, id: edge.id ?? `mock-${Date.now()}` };
    const t = await this.token();
    const payload = sanitizePayload({
      nodoOrigen: edge.fromNodeId,
      nodoDestino: edge.toNodeId,
      distancia: edge.weight,
      unidireccional: !edge.bidirectional,
    });
    if (edge.id && isValidObjectId(edge.id)) payload._id = edge.id;
    const { data, error } = await httpClient.post<GraphEdgeDto>('/admin/mapa/conexion', payload, t);
    if (error || !data) {
      console.log('[ExpressGraphRepo] Error upsert arista:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
    return mapDtoToEdge(data);
  }

  async updateEdge(id: string, patch: Partial<GraphEdge>): Promise<GraphEdge> {
    if (isDevMode()) return { id, fromNodeId: '', toNodeId: '', weight: 1, blocked: false, bidirectional: true, ...patch };
    const t = await this.token();
    const payload: Record<string, unknown> = {};
    if (patch.weight !== undefined) payload.distancia = patch.weight;
    if (patch.blocked !== undefined) payload.bloqueado = patch.blocked;
    if (patch.bidirectional !== undefined) payload.unidireccional = !patch.bidirectional;
    const { data, error } = await httpClient.put<GraphEdgeDto>(`/admin/mapa/conexion/${id}`, payload, t);
    if (error || !data) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    return mapDtoToEdge(data);
  }

  async deleteEdge(id: string): Promise<void> {
    if (isDevMode()) return;
    const t = await this.token();
    const { error } = await httpClient.delete(`/admin/mapa/conexion/${id}`, t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
  }
}

export type NodeType = 'entrada' | 'hall' | 'pasillo' | 'escalera' | 'ascensor' | 'aula' | 'laboratorio' | 'oficina' | 'bano' | 'cafeteria' | 'salida_emergencia' | 'punto_interes';

export const NODE_TYPES: NodeType[] = [
  'entrada', 'hall', 'pasillo', 'escalera', 'ascensor',
  'aula', 'laboratorio', 'oficina', 'bano', 'cafeteria',
  'salida_emergencia', 'punto_interes',
];

export interface GraphNode {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  type: NodeType;
  floor: number;
  referenceId: string | null;
  referenceModel: 'Aula' | 'Oficina' | 'Evento' | null;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  weight: number;
  blocked: boolean;
  bidirectional: boolean;
}

export interface CampusGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface OptimalRoute {
  nodeIds: string[];
  edges: GraphEdge[];
  totalWeight: number;
  distanceMeters: number;
}

export type GraphEditMode = 'none' | 'addNode' | 'addEdge' | 'editEdge';

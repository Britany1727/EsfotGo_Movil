import type { CampusGraph, GraphNode, GraphEdge } from '../domain/graph.entity';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import { haversineMeters } from './graph.hooks';

const VIRTUAL_PREFIX = 'loc-';

const CATEGORY_TO_NODE_TYPE: Record<string, GraphNode['type']> = {
  aulas: 'aula',
  academico: 'aula',
  biblioteca: 'punto_interes',
  servicios: 'oficina',
  deportes: 'punto_interes',
  eventos: 'punto_interes',
  estacionamiento: 'punto_interes',
  entrada: 'entrada',
};

function locationCategoryToNodeType(category: string): GraphNode['type'] {
  return CATEGORY_TO_NODE_TYPE[category] ?? 'punto_interes';
}

export function isVirtualNodeId(id: string): boolean {
  return id.startsWith(VIRTUAL_PREFIX);
}

export function buildLocationGraph(
  locations: CampusLocation[],
  maxNeighborDistanceMeters: number = 200
): CampusGraph {
  const nodes: GraphNode[] = locations.map((loc, i) => ({
    id: `${VIRTUAL_PREFIX}${i}`,
    label: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    type: locationCategoryToNodeType(loc.category),
    floor: 0,
    referenceId: loc.id,
    referenceModel: 'Aula',
  }));

  const edges: GraphEdge[] = [];
  let edgeCounter = 0;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = haversineMeters(
        nodes[i].latitude, nodes[i].longitude,
        nodes[j].latitude, nodes[j].longitude
      );
      if (dist <= maxNeighborDistanceMeters) {
        edges.push({
          id: `${VIRTUAL_PREFIX}edge-${edgeCounter++}`,
          fromNodeId: nodes[i].id,
          toNodeId: nodes[j].id,
          weight: Math.round(dist),
          blocked: false,
          bidirectional: true,
        });
      }
    }
  }

  return { nodes, edges };
}

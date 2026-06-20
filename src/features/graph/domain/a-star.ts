import type { CampusGraph, GraphEdge, OptimalRoute } from './graph.entity';
import { haversineMeters } from '../application/graph.hooks';

/**
 * A* (A-star) pathfinding algorithm for campus graph routing.
 * Uses haversine distance as heuristic to guide search toward destination.
 * Significantly faster than Dijkstra for point-to-point routing.
 */
export function aStar(
  graph: CampusGraph,
  fromId: string,
  toId: string
): OptimalRoute | null {
  const { nodes, edges } = graph;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const fromNode = nodeMap.get(fromId);
  const toNode = nodeMap.get(toId);
  if (!fromNode || !toNode) return null;

  // Build adjacency list
  const adj = new Map<string, { neighborId: string; edge: GraphEdge }[]>();
  for (const node of nodes) adj.set(node.id, []);

  for (const edge of edges) {
    if (edge.blocked) continue;
    adj.get(edge.fromNodeId)?.push({ neighborId: edge.toNodeId, edge });
    if (edge.bidirectional) {
      adj.get(edge.toNodeId)?.push({ neighborId: edge.fromNodeId, edge });
    }
  }

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; edge: GraphEdge } | null>();

  for (const node of nodes) {
    gScore.set(node.id, Infinity);
    fScore.set(node.id, Infinity);
    prev.set(node.id, null);
  }

  gScore.set(fromId, 0);
  fScore.set(
    fromId,
    haversineMeters(fromNode.latitude, fromNode.longitude, toNode.latitude, toNode.longitude),
  );

  const openSet = new Set<string>([fromId]);

  while (openSet.size > 0) {
    // Find node with lowest fScore
    let current: string | null = null;
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) { lowestF = f; current = id; }
    }

    if (!current || lowestF === Infinity) break;
    if (current === toId) break;

    openSet.delete(current);

    for (const { neighborId, edge } of adj.get(current) ?? []) {
      const tentG = (gScore.get(current) ?? Infinity) + edge.weight;
      if (tentG < (gScore.get(neighborId) ?? Infinity)) {
        prev.set(neighborId, { nodeId: current, edge });
        gScore.set(neighborId, tentG);
        const neighbor = nodeMap.get(neighborId);
        if (neighbor) {
          fScore.set(
            neighborId,
            tentG + haversineMeters(neighbor.latitude, neighbor.longitude, toNode.latitude, toNode.longitude),
          );
        }
        openSet.add(neighborId);
      }
    }
  }

  const totalDist = gScore.get(toId) ?? Infinity;
  if (totalDist === Infinity) return null;

  // Reconstruct path
  const nodeIds: string[] = [];
  const usedEdges: GraphEdge[] = [];
  let current: string = toId;

  while (current !== fromId) {
    nodeIds.unshift(current);
    const p = prev.get(current);
    if (!p) return null;
    usedEdges.unshift(p.edge);
    current = p.nodeId;
  }
  nodeIds.unshift(fromId);

  return {
    nodeIds,
    edges: usedEdges,
    totalWeight: totalDist,
    distanceMeters: totalDist,
  };
}

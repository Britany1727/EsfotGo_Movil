import { useCallback, useState, useRef } from 'react';
import type { GeoCoordinate } from '../domain/coordinates';
import type { RoutingResult } from '../domain/routing.repository';
import { OsrmRoutingRepository } from '../infrastructure/osrm-routing.repository';
import { calculateOptimalRoute } from '../services/route-calculator';
import type { RouteCalculation } from '../services/route-calculator';
import type { CampusGraph } from '@/features/graph/domain/graph.entity';
import type { GraphRouteResult } from '@/features/graph/application/graph-route.service';
import { findNearestNode, graphRouteToWaypoints } from '@/features/graph/application/graph-route.service';
import { aStar } from '@/features/graph/domain/a-star';

export type RoutingStatus = 'idle' | 'computing' | 'ready' | 'error';

export interface RoutingState {
  status: RoutingStatus;
  directRoute: RouteCalculation | null;
  graphRoute: GraphRouteResult | null;
  osrmRoute: RoutingResult | null;
  error: string | null;
  waypoints: GeoCoordinate[];
  distance: number;
  duration: number;
}

const osrmRepo = new OsrmRoutingRepository();

export function useRouting(campusGraph: CampusGraph | undefined) {
  const [state, setState] = useState<RoutingState>({
    status: 'idle',
    directRoute: null,
    graphRoute: null,
    osrmRoute: null,
    error: null,
    waypoints: [],
    distance: 0,
    duration: 0,
  });

  const abortRef = useRef(false);

  const computeRoute = useCallback(async (origin: GeoCoordinate, destination: GeoCoordinate) => {
    abortRef.current = false;
    setState((s) => ({ ...s, status: 'computing', error: null }));

    try {
      // 1. Try campus graph (Dijkstra)
      if (campusGraph) {
        const fromNode = findNearestNode(campusGraph, origin);
        const toNode = findNearestNode(campusGraph, destination);
        if (fromNode && toNode && fromNode !== toNode) {
          const route = aStar(campusGraph, fromNode, toNode);
          if (route) {
            const result = graphRouteToWaypoints(campusGraph, route, fromNode, toNode);
            if (!abortRef.current) {
              setState({
                status: 'ready',
                directRoute: null,
                graphRoute: result,
                osrmRoute: null,
                error: null,
                waypoints: result.waypoints,
                distance: result.distance,
                duration: result.etaMinutes * 60,
              });
            }
            return;
          }
          // Nodes found but no graph path — stay inside campus, no fallback
          if (!abortRef.current) {
            setState((s) => ({ ...s, status: 'error', error: 'No se encontró una ruta interna en el campus' }));
          }
          return;
        }
      }

      // 2. Try OSRM only when no campus graph nodes are nearby (user is outside campus)
      try {
        if (!abortRef.current) {
          const osrmResult = await osrmRepo.getRoute(origin, destination);
          if (osrmResult.waypoints.length >= 2 && !abortRef.current) {
            setState({
              status: 'ready',
              directRoute: null,
              graphRoute: null,
              osrmRoute: osrmResult,
              error: null,
              waypoints: osrmResult.waypoints,
              distance: osrmResult.distance,
              duration: osrmResult.duration,
            });
            return;
          }
        }
      } catch (osrmErr) {
        console.log('[useRouting] OSRM falló — usando ruta directa:', (osrmErr as Error)?.message);
      }

      // 3. Fallback to direct line calculation
      const directRoute = calculateOptimalRoute(origin, destination);
      if (!abortRef.current) {
        setState({
          status: 'ready',
          directRoute,
          graphRoute: null,
          osrmRoute: null,
          error: null,
          waypoints: directRoute.waypoints,
          distance: directRoute.distance,
          duration: directRoute.etaMinutes * 60,
        });
      }
    } catch (err) {
      if (!abortRef.current) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: (err as Error)?.message ?? 'Error calculando ruta',
        }));
      }
    }
  }, [campusGraph]);

  const clearRoute = useCallback(() => {
    abortRef.current = true;
    setState({
      status: 'idle',
      directRoute: null,
      graphRoute: null,
      osrmRoute: null,
      error: null,
      waypoints: [],
      distance: 0,
      duration: 0,
    });
  }, []);

  return { ...state, computeRoute, clearRoute };
}

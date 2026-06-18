// ─── SMART ROUTE HOOK ────────────────────────────────────────
// Determines the optimal bus route when user selects a destination.
// Considers walking distance, bus travel time, and total trip duration.

import { useState, useEffect } from 'react';
import { findOptimalRoute, findBusesNearStop } from '../services/routeOptimizationService';

export function useSmartRoute(rutasData, userLocation, destination, busData) {
  const [smartRoute, setSmartRoute] = useState(null);
  const [stopBuses, setStopBuses] = useState([]);
  const [isComputing, setIsComputing] = useState(false);

  useEffect(() => {
    if (!destination || !userLocation) {
      setSmartRoute(null);
      setStopBuses([]);
      return;
    }

    setIsComputing(true);

    const result = findOptimalRoute(rutasData, userLocation, destination);
    setSmartRoute(result);

    if (result && result.routeKey && rutasData[result.routeKey]) {
      const route = rutasData[result.routeKey];
      const boardingStop = route.stops[result.boardingStopIdx];
      if (boardingStop) {
        const nearby = findBusesNearStop(busData, boardingStop.position);
        setStopBuses(nearby);
      }
    }

    setIsComputing(false);
  }, [rutasData, userLocation, destination, busData]);

  return { smartRoute, stopBuses, isComputing };
}

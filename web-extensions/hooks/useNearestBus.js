// ─── NEAREST BUS HOOK ─────────────────────────────────────────
// Continuously monitors user location and bus positions
// to determine which bus is closest and when it will arrive.

import { useState, useEffect } from 'react';
import { findNearestBus } from '../services/busSimulationService';

export function useNearestBus(busData, userLocation, rutasData) {
  const [nearestBus, setNearestBus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userLocation || !busData || Object.keys(busData).length === 0) {
      setNearestBus(null);
      return;
    }

    setIsLoading(true);

    const result = findNearestBus(busData, userLocation, rutasData);
    setNearestBus(result);
    setIsLoading(false);
  }, [busData, userLocation, rutasData]);

  return { nearestBus, isLoading, hasBuses: Object.keys(busData || {}).length > 0 };
}

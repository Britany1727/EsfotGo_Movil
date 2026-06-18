// ─── BUS TRACKING HOOK ────────────────────────────────────────
// Manages the "follow specific bus" tracking mode.
// When active, continuously centers the map on the selected bus.

import { useEffect, useRef, useCallback } from 'react';

export function useBusTracking(busData, selectedBus, trackingBus, setMapCenter, setTrackingBus) {
  const lastCenterRef = useRef(null);

  const toggleTracking = useCallback((busId) => {
    if (trackingBus && selectedBus === busId) {
      setTrackingBus(false);
    } else {
      setTrackingBus(true);
    }
  }, [trackingBus, selectedBus, setTrackingBus]);

  useEffect(() => {
    if (!trackingBus || !selectedBus || !busData[selectedBus]) return;

    const bus = busData[selectedBus];
    const newCenter = { lat: bus.position[0], lng: bus.position[1] };

    if (
      !lastCenterRef.current ||
      Math.abs(lastCenterRef.current.lat - newCenter.lat) > 0.0001 ||
      Math.abs(lastCenterRef.current.lng - newCenter.lng) > 0.0001
    ) {
      lastCenterRef.current = newCenter;
      setMapCenter(newCenter);
    }
  }, [busData, selectedBus, trackingBus, setMapCenter]);

  return { toggleTracking };
}

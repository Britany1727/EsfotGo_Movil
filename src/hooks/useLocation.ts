import * as Location from 'expo-location';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useBatteryOptimizer } from '@/features/map/services/battery-optimizer';
import { useGpsPermission } from '@/hooks/use-gps-permission';
import { isDevMode } from '@/core/config/env';

interface UseLocationOptions {
  enableHighAccuracy?: boolean;
}

interface UseLocationReturn {
  location: Location.LocationObject | null;
  error: string | null;
  isWatching: boolean;
  retry: () => void;
  permissionStatus: 'idle' | 'prompting' | 'granted' | 'denied' | 'blocked';
}

const DEV_MOCK_LOCATION: Location.LocationObject = {
  coords: {
    latitude: -0.2105,
    longitude: -78.4895,
    altitude: 2800,
    accuracy: 10,
    altitudeAccuracy: 5,
    heading: 0,
    speed: 0,
  },
  timestamp: Date.now(),
};

const SPEED_THRESHOLD_MS = 2.78; // ~10 km/h

export function useLocation(options?: UseLocationOptions): UseLocationReturn {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const mountedRef = useRef(true);
  const lastUpdateRef = useRef(0);
  const prevSpeedRef = useRef(0);
  const battery = useBatteryOptimizer();
  const { status: permissionStatus } = useGpsPermission();

  const cleanup = useCallback(() => {
    try {
      subRef.current?.remove();
    } catch {
      // already removed
    }
    subRef.current = null;
  }, []);

  const getGPSConfig = useCallback(() => {
    const speed = prevSpeedRef.current ?? 0;

    if (battery.isLowPower) {
      return {
        accuracy: Location.Accuracy.Low,
        timeInterval: 5000,
        distanceInterval: 15,
      };
    }

    if (speed > SPEED_THRESHOLD_MS) {
      return {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 5,
      };
    }

    return {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 2500,
      distanceInterval: 8,
    };
  }, [battery.isLowPower]);

  const startWatching = useCallback(async () => {
    try {
      cleanup();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mountedRef.current) {
          setError('Permiso de ubicación denegado');
          setIsWatching(false);
        }
        return;
      }

      const config = getGPSConfig();
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (mountedRef.current) {
        setLocation(loc);
        lastUpdateRef.current = Date.now();
        if (loc.coords.speed != null) prevSpeedRef.current = loc.coords.speed;
      }

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: config.accuracy,
          distanceInterval: config.distanceInterval,
          timeInterval: config.timeInterval,
        },
        (newLoc) => {
          const now = Date.now();
          if (now - lastUpdateRef.current < battery.throttleMs) return;
          lastUpdateRef.current = now;

          if (newLoc.coords.speed != null) {
            prevSpeedRef.current = newLoc.coords.speed;
          }

          if (mountedRef.current) {
            setLocation(newLoc);
          }
        }
      );

      if (mountedRef.current) {
        setIsWatching(true);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError((e as Error).message ?? 'Error al obtener ubicacion');
        setIsWatching(false);
      }
    }
  }, [cleanup, battery.throttleMs, getGPSConfig]);

  useEffect(() => {
    mountedRef.current = true;

    if (isDevMode()) {
      setLocation(DEV_MOCK_LOCATION);
      setIsWatching(true);

      const interval = setInterval(() => {
        const jitter = 0.0001 * (Math.random() - 0.5);
        setLocation((prev) =>
          prev
            ? {
                ...prev,
                coords: {
                  ...prev.coords,
                  latitude: prev.coords.latitude + jitter,
                  longitude: prev.coords.longitude + jitter * 1.3,
                },
                timestamp: Date.now(),
              }
            : null
        );
      }, 3000);

      return () => {
        mountedRef.current = false;
        clearInterval(interval);
        cleanup();
      };
    }

    startWatching();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [retryCount, startWatching, cleanup]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
    setError(null);
  }, []);

  return { location, error, isWatching, retry, permissionStatus };
}

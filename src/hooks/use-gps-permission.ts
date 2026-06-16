import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuthStore } from '@/store/auth.store';
import { Platform, Linking } from 'react-native';
import Toast from 'react-native-toast-message';

interface GpsPermissionState {
  status: 'idle' | 'prompting' | 'granted' | 'denied' | 'blocked';
  requestPermission: () => Promise<boolean>;
}

export function useGpsPermission(): GpsPermissionState {
  const [status, setStatus] = useState<GpsPermissionState['status']>('idle');
  const user = useAuthStore((s) => s.user);
  const setGpsPermission = useAuthStore((s) => s.setGpsPermission);
  const gpsPermissionGranted = useAuthStore((s) => s.gpsPermissionGranted);

  useEffect(() => {
    if (!user) return;

    const checkExisting = async () => {
      try {
        const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
        if (existingStatus === 'granted') {
          setStatus('granted');
          setGpsPermission(true);
        } else if (existingStatus === 'denied' && Platform.OS === 'ios') {
          setStatus('blocked');
          setGpsPermission(false);
        } else {
          setStatus('idle');
        }
      } catch {
        // Ignore
      }
    };

    if (!gpsPermissionGranted) {
      checkExisting();
    }
  }, [user, gpsPermissionGranted, setGpsPermission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setStatus('prompting');

    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();

      if (fgStatus === 'granted') {
        setStatus('granted');
        setGpsPermission(true);
        return true;
      }

      if (fgStatus === 'denied') {
        if (Platform.OS === 'ios') {
          setStatus('blocked');
        } else {
          setStatus('denied');
        }
        setGpsPermission(false);

        if (Platform.OS === 'ios') {
          Toast.show({
            type: 'info',
            text1: 'Ubicacion requerida',
            text2: 'Activa la ubicacion en Configuracion > Privacidad',
            visibilityTime: 5000,
            onPress: () => Linking.openSettings(),
          });
        }
        return false;
      }

      return false;
    } catch {
      setStatus('denied');
      setGpsPermission(false);
      return false;
    } finally {
      if (status !== 'granted') {
        setStatus((prev) => (prev === 'prompting' ? 'denied' : prev));
      }
    }
  }, [setGpsPermission, status]);

  return { status, requestPermission };
}

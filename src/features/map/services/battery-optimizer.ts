import { useState, useEffect, useCallback } from 'react';
import * as Battery from 'expo-battery';

export function useBatteryOptimizer() {
  const [level, setLevel] = useState(1);
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    Battery.getBatteryLevelAsync().then((l) => {
      setLevel(l);
      setIsLowPower(l < 0.2);
    });

    Battery.getPowerStateAsync().then((p) => {
      if (p.lowPowerMode) setIsLowPower(true);
    });

    const levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setLevel(batteryLevel);
      setIsLowPower(batteryLevel < 0.2);
    });

    const powerSub = Battery.addBatteryStateListener(({ batteryState }) => {
      setIsLowPower(batteryState === Battery.BatteryState.UNPLUGGED);
    });

    return () => {
      levelSub.remove();
      powerSub.remove();
    };
  }, []);

  const getThrottleMs = useCallback((): number => {
    if (isLowPower) return 5000;
    if (level < 0.1) return 4000;
    if (level < 0.2) return 3000;
    if (level < 0.5) return 2500;
    return 2000;
  }, [level, isLowPower]);

  const shouldForceCluster = useCallback((): boolean => {
    return level < 0.15 || isLowPower;
  }, [level, isLowPower]);

  const shouldSkipAnimation = useCallback((): boolean => {
    return level < 0.1 || isLowPower;
  }, [level, isLowPower]);

  return {
    batteryLevel: level,
    isLowPower,
    throttleMs: getThrottleMs(),
    getThrottleMs,
    shouldForceCluster,
    shouldSkipAnimation,
  };
}

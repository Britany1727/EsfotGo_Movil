// ─── REAL TIME BUS SIMULATION SERVICE ──────────────────────────
// Generates bus entities along routes and animates movement.
// Uses requestAnimationFrame for smooth position interpolation.

const BUS_SPEED_KMH_MIN = 20;
const BUS_SPEED_KMH_MAX = 45;
const UPDATE_INTERVAL_MS = 3000;
const INTERPOLATION_STEPS = 20;

let animationFrameId = null;
let intervalId = null;

function randomSpeed() {
  return BUS_SPEED_KMH_MIN + Math.random() * (BUS_SPEED_KMH_MAX - BUS_SPEED_KMH_MIN);
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function interpolatePosition(from, to, fraction) {
  return [
    from[0] + (to[0] - from[0]) * fraction,
    from[1] + (to[1] - from[1]) * fraction,
  ];
}

function buildBusEntities(rutasData) {
  const buses = {};
  const routeKeys = Object.keys(rutasData);

  routeKeys.forEach((routeKey, routeIdx) => {
    const route = rutasData[routeKey];
    if (!route.stops || route.stops.length < 2) return;

    const busCount = routeIdx < 3 ? 3 : 2;
    for (let i = 0; i < busCount; i++) {
      const initialStopIdx = Math.floor((i / busCount) * (route.stops.length - 1));
      const busId = `bus_${routeKey}_${i + 1}`;
      buses[busId] = {
        route: routeKey,
        position: [...route.stops[initialStopIdx].position],
        speed: randomSpeed(),
        currentStop: initialStopIdx,
        nextStop: (initialStopIdx + 1) % route.stops.length,
        status: 'moving',
        direction: 1,
        interpolationProgress: 0,
      };
    }
  });

  return buses;
}

function updateBusPositions(buses, rutasData, deltaSeconds) {
  const updated = { ...buses };

  Object.entries(updated).forEach(([busId, bus]) => {
    const route = rutasData[bus.route];
    if (!route || !route.stops || route.stops.length < 2) return;

    const fromStop = route.stops[bus.currentStop];
    const toStop = route.stops[bus.nextStop];
    if (!fromStop || !toStop) return;

    const segmentDistKm = haversineKm(fromStop.position, toStop.position);
    const speedKmS = bus.speed / 3600;
    const travelTimeSeconds = segmentDistKm / speedKmS;

    if (travelTimeSeconds <= 0) {
      bus.interpolationProgress = 1;
      return;
    }

    bus.interpolationProgress += deltaSeconds / travelTimeSeconds;

    if (bus.interpolationProgress >= 1) {
      bus.interpolationProgress = 0;
      bus.currentStop = bus.nextStop;
      bus.nextStop = ((bus.nextStop + bus.direction) % route.stops.length + route.stops.length) % route.stops.length;

      if (bus.currentStop === 0 || bus.currentStop === route.stops.length - 1) {
        bus.direction *= -1;
        bus.nextStop = ((bus.currentStop + bus.direction) % route.stops.length + route.stops.length) % route.stops.length;
      }

      bus.position = [...route.stops[bus.currentStop].position];
      bus.speed = randomSpeed();
    } else {
      bus.position = interpolatePosition(fromStop.position, toStop.position, bus.interpolationProgress);
    }
  });

  return updated;
}

let internalBuses = null;
let lastTimestamp = null;
let notifyCallback = null;

function animationLoop(timestamp, rutasData, setBusData) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const deltaMs = Math.min(timestamp - lastTimestamp, 100);
  const deltaSeconds = deltaMs / 1000;
  lastTimestamp = timestamp;

  internalBuses = updateBusPositions(internalBuses, rutasData, deltaSeconds);
  setBusData({ ...internalBuses });

  if (notifyCallback) {
    checkNotifications(internalBuses, notifyCallback);
  }

  animationFrameId = requestAnimationFrame((t) => animationLoop(t, rutasData, setBusData));
}

function checkNotifications(buses, onNotify) {
  Object.entries(buses).forEach(([busId, bus]) => {
    if (bus.interpolationProgress > 0.85 && bus.interpolationProgress < 0.9 && !bus._notifiedNearStop) {
      bus._notifiedNearStop = bus.nextStop;
      onNotify({
        message: `Bus ${busId.replace('bus_', '').replace('_', ' ')} se acerca a la parada`,
        type: 'info',
      });
    }
    if (bus.interpolationProgress < 0.15 && bus._notifiedNearStop) {
      bus._notifiedNearStop = null;
    }
  });
}

export function startSimulation(rutasData, setBusData, onNotification) {
  internalBuses = buildBusEntities(rutasData);
  lastTimestamp = null;
  notifyCallback = onNotification;

  setBusData({ ...internalBuses });

  animationFrameId = requestAnimationFrame((t) => animationLoop(t, rutasData, setBusData));

  intervalId = setInterval(() => {
    Object.values(internalBuses).forEach((bus) => {
      bus.speed = randomSpeed();
    });
  }, 15000);

  return () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (intervalId) clearInterval(intervalId);
    animationFrameId = null;
    intervalId = null;
  };
}

export function stopSimulation() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (intervalId) clearInterval(intervalId);
  animationFrameId = null;
  intervalId = null;
}

export function findNearestBus(busData, userLocation, rutasData) {
  if (!userLocation || !busData || Object.keys(busData).length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  Object.entries(busData).forEach(([busId, bus]) => {
    const dist = haversineKm([userLocation.lat, userLocation.lng], bus.position);
    if (dist < minDist) {
      minDist = dist;
      const route = rutasData[bus.route];
      const routeName = route ? route.name : bus.route;
      const etaMinutes = Math.round((dist / (bus.speed || 30)) * 60);
      nearest = {
        busId,
        routeName,
        distance: Math.round(dist * 1000),
        eta: etaMinutes,
        bus,
      };
    }
  });

  return nearest;
}

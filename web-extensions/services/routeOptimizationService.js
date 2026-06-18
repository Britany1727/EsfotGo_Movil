// ─── SMART ROUTE OPTIMIZATION SERVICE ─────────────────────────
// Analyzes all bus routes to find the best combination for reaching a destination.
// Factors: walking distance, bus proximity, total trip time.

const WALKING_SPEED_MPS = 1.4; // metros por segundo (~5 km/h)
const BUS_AVG_SPEED_MPS = 8.3; // metros por segundo (~30 km/h)
const MAX_WALK_DISTANCE_M = 2000; // distancia máxima que el usuario caminaría

function haversineMeters(a, b) {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function findClosestStopOnRoute(route, point) {
  if (!route.stops || route.stops.length === 0) return null;

  let best = null;
  let bestDist = Infinity;

  route.stops.forEach((stop, idx) => {
    const dist = haversineMeters(point, stop.position);
    if (dist < bestDist) {
      bestDist = dist;
      best = { stop, distance: dist, index: idx };
    }
  });

  return best;
}

function estimateBusTravelTime(route, fromStopIdx, toStopIdx) {
  if (!route.stops || fromStopIdx === toStopIdx) return 0;

  let totalDist = 0;
  const start = Math.min(fromStopIdx, toStopIdx);
  const end = Math.max(fromStopIdx, toStopIdx);

  for (let i = start; i < end; i++) {
    if (route.stops[i] && route.stops[i + 1]) {
      totalDist += haversineMeters(route.stops[i].position, route.stops[i + 1].position);
    }
  }

  return totalDist / BUS_AVG_SPEED_MPS;
}

export function findOptimalRoute(rutasData, userLocation, destination) {
  if (!rutasData || !userLocation || !destination) return null;

  const userPos = [userLocation.lat, userLocation.lng];
  const destPos = [destination.lat, destination.lng];
  const directWalkDist = haversineMeters(userPos, destPos);

  let bestResult = {
    routeName: 'Caminando',
    routeKey: null,
    walkDistance: Math.round(directWalkDist),
    boardingStop: null,
    boardingStopIdx: -1,
    alightStop: null,
    busTravelDistance: 0,
    busTravelTime: 0,
    totalTime: Math.round(directWalkDist / WALKING_SPEED_MPS / 60),
    boardingWalkDistance: 0,
    alightWalkDistance: 0,
    score: directWalkDist,
  };

  Object.entries(rutasData).forEach(([routeKey, route]) => {
    if (!route.stops || route.stops.length < 2) return;

    const boarding = findClosestStopOnRoute(route, userPos);
    if (!boarding || boarding.distance > MAX_WALK_DISTANCE_M) return;

    const alighting = findClosestStopOnRoute(route, destPos);
    if (!alighting || alighting.distance > MAX_WALK_DISTANCE_M) return;

    if (boarding.index === alighting.index) return;

    const busTravelSeconds = estimateBusTravelTime(route, boarding.index, alighting.index);
    const busTravelMinutes = busTravelSeconds / 60;
    const walkMinutes = (boarding.distance + alighting.distance) / WALKING_SPEED_MPS / 60;
    const totalMinutes = walkMinutes + busTravelMinutes;
    const totalDistance = boarding.distance + haversineMeters(boarding.stop.position, alighting.stop.position) + alighting.distance;
    const score = totalMinutes * 60 + totalDistance * 0.1;

    if (score < bestResult.score) {
      bestResult = {
        routeName: route.name || routeKey,
        routeKey,
        walkDistance: Math.round(boarding.distance + alighting.distance),
        boardingStop: boarding.stop.name,
        boardingStopIdx: boarding.index,
        alightStop: alighting.stop.name,
        busTravelDistance: Math.round(haversineMeters(boarding.stop.position, alighting.stop.position)),
        busTravelTime: Math.round(busTravelMinutes),
        totalTime: Math.round(totalMinutes),
        boardingWalkDistance: Math.round(boarding.distance),
        alightWalkDistance: Math.round(alighting.distance),
        score,
      };
    }
  });

  return bestResult;
}

export function findBusesNearStop(busData, stopPosition, maxDistanceM = 500) {
  if (!busData || !stopPosition) return [];

  return Object.entries(busData)
    .map(([busId, bus]) => {
      const dist = haversineMeters(bus.position, stopPosition);
      const etaSeconds = dist / BUS_AVG_SPEED_MPS;
      return { busId, distance: Math.round(dist), etaMinutes: Math.round(etaSeconds / 60), bus };
    })
    .filter((b) => b.distance <= maxDistanceM)
    .sort((a, b) => a.distance - b.distance);
}

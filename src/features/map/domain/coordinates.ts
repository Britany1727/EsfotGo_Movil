export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeoBoundingBox {
  southwest: GeoCoordinate;
  northeast: GeoCoordinate;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarkerData {
  id: string;
  coordinate: GeoCoordinate;
  title: string;
  description?: string;
  category: string;
  imageUrl?: string;
  image360?: string;
  mediaType?: string;
  clusterWeight: number;
}

export interface ClusterPoint {
  id: string;
  coordinate: GeoCoordinate;
  count: number;
  topCategory: string;
  markers: MapMarkerData[];
}

export interface RouteSegment {
  points: GeoCoordinate[];
  distance: number;
  duration: number;
}

export const EARTH_RADIUS_METERS = 6_371_000;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function haversineDistance(a: GeoCoordinate, b: GeoCoordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);

  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearing(a: GeoCoordinate, b: GeoCoordinate): number {
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function destinationPoint(
  origin: GeoCoordinate,
  distanceMeters: number,
  bearingDegrees: number
): GeoCoordinate {
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRad = toRadians(bearingDegrees);
  const latRad = toRadians(origin.latitude);
  const lonRad = toRadians(origin.longitude);

  const newLat = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const newLon =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLat)
    );

  return {
    latitude: toDegrees(newLat),
    longitude: ((toDegrees(newLon) + 540) % 360) - 180,
  };
}

export function isPointInBoundingBox(
  point: GeoCoordinate,
  box: GeoBoundingBox
): boolean {
  return (
    point.latitude >= box.southwest.latitude &&
    point.latitude <= box.northeast.latitude &&
    point.longitude >= box.southwest.longitude &&
    point.longitude <= box.northeast.longitude
  );
}

export function regionToBoundingBox(region: MapRegion): GeoBoundingBox {
  return {
    southwest: {
      latitude: region.latitude - region.latitudeDelta / 2,
      longitude: region.longitude - region.longitudeDelta / 2,
    },
    northeast: {
      latitude: region.latitude + region.latitudeDelta / 2,
      longitude: region.longitude + region.longitudeDelta / 2,
    },
  };
}

export function midpoint(a: GeoCoordinate, b: GeoCoordinate): GeoCoordinate {
  const lat1 = toRadians(a.latitude);
  const lon1 = toRadians(a.longitude);
  const lat2 = toRadians(b.latitude);
  const dLon = toRadians(b.longitude - a.longitude);

  const bx = Math.cos(lat2) * Math.cos(dLon);
  const by = Math.cos(lat2) * Math.sin(dLon);

  const newLat = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2)
  );

  const newLon = lon1 + Math.atan2(by, Math.cos(lat1) + bx);

  return {
    latitude: toDegrees(newLat),
    longitude: ((toDegrees(newLon) + 540) % 360) - 180,
  };
}

export function boundingBoxFromPoints(points: GeoCoordinate[]): GeoBoundingBox {
  if (points.length === 0) {
    return {
      southwest: { latitude: 0, longitude: 0 },
      northeast: { latitude: 0, longitude: 0 },
    };
  }

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLon = points[0].longitude;
  let maxLon = points[0].longitude;

  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }

  return {
    southwest: { latitude: minLat, longitude: minLon },
    northeast: { latitude: maxLat, longitude: maxLon },
  };
}

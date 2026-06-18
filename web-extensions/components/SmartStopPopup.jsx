// ─── SMART STOP POPUP COMPONENT ───────────────────────────────
// Renders an intelligent stop popup showing arriving buses and ETAs.
// Displayed when user clicks on a bus stop marker.

import React, { useMemo } from 'react';
import { Popup } from 'react-leaflet';
import { findBusesNearStop } from '../services/routeOptimizationService';

export function SmartStopPopup({ routesData, busData, selectedPoint, onClose }) {
  const stopBuses = useMemo(() => {
    if (!selectedPoint?.position || !busData) return [];
    return findBusesNearStop(busData, selectedPoint.position);
  }, [busData, selectedPoint]);

  if (!selectedPoint) return null;

  const routesThroughStop = Object.entries(routesData)
    .filter(([, route]) =>
      route.stops?.some(
        (s) =>
          Math.abs(s.position[0] - selectedPoint.position[0]) < 0.00005 &&
          Math.abs(s.position[1] - selectedPoint.position[1]) < 0.00005
      )
    )
    .map(([key, route]) => ({ key, name: route.name || key, color: route.color }));

  return (
    <Popup
      position={selectedPoint.position}
      eventHandlers={{ remove: onClose }}
    >
      <div className="smart-stop-popup" style={{ fontFamily: 'system-ui, sans-serif', minWidth: 220 }}>
        <div style={{ marginBottom: 8 }}>
          <strong style={{ fontSize: 16, color: '#1f2937' }}>{selectedPoint.name}</strong>
        </div>

        {routesThroughStop.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Rutas que pasan:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {routesThroughStop.map((r) => (
                <span
                  key={r.key}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    backgroundColor: r.color + '18', color: r.color,
                  }}
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {stopBuses.length > 0 ? (
          <>
            <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Próximos buses:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              {stopBuses.slice(0, 5).map((b) => {
                const route = routesData[b.bus.route];
                return (
                  <div
                    key={b.busId}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: route?.color || '#3b82f6',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        {route?.name || b.bus.route}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: b.etaMinutes <= 3 ? '#ef4444' : b.etaMinutes <= 7 ? '#f59e0b' : '#10b981',
                    }}>
                      {b.etaMinutes <= 0 ? 'Llegando' : `${b.etaMinutes} min`}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', margin: '4px 0' }}>
            No hay buses cercanos en este momento
          </p>
        )}
      </div>
    </Popup>
  );
}

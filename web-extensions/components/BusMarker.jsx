// ─── BUS MARKER COMPONENT ─────────────────────────────────────
// Renders a bus icon on the map with real-time position.
// Clicking shows bus details: unit, route, speed, next stop, status.

import React, { useMemo } from 'react';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';

const busIconHtml = (color, isSelected) => `
  <div style="
    width: 36px; height: 36px;
    background: ${color};
    border-radius: 10px;
    border: ${isSelected ? '3px solid #fff' : '2px solid #fff'};
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    transform: rotate(0deg);
    ${isSelected ? 'transform: scale(1.3);' : ''}
  ">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="7" width="18" height="10" rx="2"/>
      <circle cx="7" cy="19" r="2.5" fill="white"/>
      <circle cx="17" cy="19" r="2.5" fill="white"/>
      <line x1="7" y1="7" x2="7" y2="2"/>
      <line x1="17" y1="7" x2="17" y2="2"/>
      <line x1="3" y1="11" x2="21" y2="11"/>
    </svg>
  </div>
`;

const STATUS_LABELS = {
  moving: 'En servicio',
  stopped: 'Detenido',
  delayed: 'Retrasado',
  arriving: 'Llegando',
};

const STATUS_COLORS = {
  moving: '#10b981',
  stopped: '#f59e0b',
  delayed: '#ef4444',
  arriving: '#3b82f6',
};

export function BusMarker({ busId, bus, routesData, isSelected, onSelect }) {
  const route = routesData[bus.route];
  const color = route?.color || '#3b82f6';
  const nextStopName = route?.stops[bus.nextStop]?.name || 'Desconocida';

  const icon = useMemo(() => {
    return L.divIcon({
      html: busIconHtml(color, isSelected),
      className: 'bus-marker-icon',
      iconSize: isSelected ? [48, 48] : [36, 36],
      iconAnchor: isSelected ? [24, 24] : [18, 18],
      popupAnchor: [0, isSelected ? -28 : -22],
    });
  }, [color, isSelected]);

  if (!bus.position || bus.position[0] === 0) return null;

  return (
    <Marker
      position={bus.position}
      icon={icon}
      eventHandlers={{
        click: () => onSelect?.(busId),
      }}
    >
      <Popup>
        <div className="bus-popup" style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 4, backgroundColor: color,
              border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
            <strong style={{ fontSize: 15, color: '#1f2937' }}>
              {busId.replace(/bus_|_/g, ' ').replace(/(\d+)$/, ' $1')}
            </strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Ruta:</span>
              <span style={{ fontWeight: 600, color }}>{route?.name || bus.route}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Velocidad:</span>
              <span style={{ fontWeight: 600, color: '#1f2937' }}>{Math.round(bus.speed)} km/h</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Próxima parada:</span>
              <span style={{ fontWeight: 600, color: '#1f2937', textAlign: 'right', maxWidth: 120 }}>
                {nextStopName}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>Estado:</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                backgroundColor: (STATUS_COLORS[bus.status] || '#10b981') + '18',
                color: STATUS_COLORS[bus.status] || '#10b981',
              }}>
                {STATUS_LABELS[bus.status] || 'En servicio'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onSelect?.(busId)}
            style={{
              marginTop: 10, width: '100%', padding: '8px 0',
              backgroundColor: isSelected ? '#e5e7eb' : '#3b82f6',
              color: isSelected ? '#374151' : 'white',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isSelected ? 'Dejar de seguir' : 'Seguir este bus'}
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

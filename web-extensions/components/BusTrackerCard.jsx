// ─── BUS TRACKER CARD COMPONENT ──────────────────────────────
// Sidebar card showing the nearest bus to the user.
// Displays route name, bus ID, distance, and estimated arrival time.

import React from 'react';

export function BusTrackerCard({ bus, routesData }) {
  if (!bus) return null;

  const route = routesData[bus.bus.route];
  const routeColor = route?.color || '#3b82f6';

  const getEtaColor = (eta) => {
    if (eta <= 3) return '#ef4444';
    if (eta <= 7) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div
      className="bus-tracker-card"
      style={{
        margin: '12px 0',
        padding: '16px',
        backgroundColor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(229,231,235,0.8)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: routeColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 8px ${routeColor}40`,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="18" height="10" rx="2"/>
            <circle cx="7" cy="19" r="2.5" fill="white"/>
            <circle cx="17" cy="19" r="2.5" fill="white"/>
          </svg>
        </div>
        <div>
          <strong style={{ fontSize: 14, color: '#1f2937' }}>Bus más cercano</strong>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
            Unidad {bus.busId.replace(/bus_|_/g, ' ').replace(/(\d+)$/, ' $1').trim()}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: routeColor }} />
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{route?.name || bus.routeName}</span>
        </div>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{bus.distance}m</span>
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 0', borderRadius: 10,
          backgroundColor: getEtaColor(bus.eta) + '10',
        }}
      >
        <span style={{
          fontSize: 15, fontWeight: 800,
          color: getEtaColor(bus.eta),
        }}>
          {bus.eta <= 0 ? 'Llegando' : `Llegará en ${bus.eta} min`}
        </span>
      </div>
    </div>
  );
}

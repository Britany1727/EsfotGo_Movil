// ─── NOTIFICATION BANNER COMPONENT ────────────────────────────
// Floating alert that appears temporarily for bus-related events.
// Auto-dismisses after a few seconds. Handles info, warning, success types.

import React, { useEffect, useState } from 'react';

const NOTIFICATION_DURATION_MS = 5000;

const ICONS = {
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

const BG_COLORS = {
  info: '#eff6ff',
  warning: '#fffbeb',
  success: '#ecfdf5',
  error: '#fef2f2',
};

const BORDER_COLORS = {
  info: '#3b82f6',
  warning: '#f59e0b',
  success: '#10b981',
  error: '#ef4444',
};

export function NotificationBanner({ notification, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!notification) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setLeaving(false);

    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => {
        onDismiss?.();
      }, 300);
    }, NOTIFICATION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification && !visible) return null;

  const type = notification?.type || 'info';

  return (
    <div
      className="notification-banner"
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: `translateX(-50%) ${leaving ? 'translateY(-120%)' : 'translateY(0)'}`,
        zIndex: 9999,
        maxWidth: 380,
        width: '90%',
        padding: '14px 18px',
        backgroundColor: BG_COLORS[type] || BG_COLORS.info,
        borderLeft: `4px solid ${BORDER_COLORS[type] || BORDER_COLORS.info}`,
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'system-ui, sans-serif',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {ICONS[type] || ICONS.info}
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
        {notification?.message}
      </span>
      <button
        onClick={() => { setLeaving(true); setTimeout(onDismiss, 300); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

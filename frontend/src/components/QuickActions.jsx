import { useState } from 'react';
import api from '../api/axios';
import './QuickActions.css';

const REPORTER_ACTIONS = [
  { msg: 'I am still here', icon: '📍', meta: { reporter_availability: 'on_site' } },
  { msg: 'Animal moved', icon: '🐾', type: 'movement' },
  { msg: 'Animal hiding', icon: '🌿' },
  { msg: 'Traffic is heavy', icon: '🚗' },
  { msg: 'Unsafe area', icon: '⚠️' },
  { msg: 'Wrong location', icon: '📌' },
  { msg: 'Cannot stay longer', icon: '⏳', meta: { reporter_availability: 'leaving' } },
];

const RESPONDER_ACTIONS = [
  { msg: 'On the way', icon: '🚗' },
  { msg: 'Reached nearby', icon: '📍' },
  { msg: 'Searching area', icon: '🔍' },
  { msg: 'Cannot find animal', icon: '❓' },
  { msg: 'Send landmark photo', icon: '📸' },
  { msg: 'Rescue in progress', icon: '🏥' },
];

export default function QuickActions({ caseId, role, onEventCreated }) {
  const [sending, setSending] = useState(null);

  const actions = role === 'victim' ? REPORTER_ACTIONS : RESPONDER_ACTIONS;

  const handleClick = async (action) => {
    setSending(action.msg);
    try {
      const res = await api.post(`/cases/${caseId}/events`, {
        event_type: action.type || 'quick_update',
        message: action.msg,
        metadata: action.meta || null,
      });
      if (onEventCreated) onEventCreated(res.data.event);
    } catch (err) {
      console.error('Quick action error:', err);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="quick-actions">
      <div className="quick-actions-label">Quick Update</div>
      <div className="quick-actions-grid">
        {actions.map((a) => (
          <button
            key={a.msg}
            className={`quick-action-chip ${sending === a.msg ? 'sending' : ''}`}
            onClick={() => handleClick(a)}
            disabled={!!sending}
          >
            <span>{a.icon}</span>
            <span>{a.msg}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

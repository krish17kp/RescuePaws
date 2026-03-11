import { useState } from 'react';
import api from '../api/axios';
import './MovementUpdate.css';

const DIRECTIONS = [
  { value: 'north', label: '⬆️ North' },
  { value: 'south', label: '⬇️ South' },
  { value: 'east', label: '➡️ East' },
  { value: 'west', label: '⬅️ West' },
  { value: 'unknown', label: '❓ Unknown' },
];

export default function MovementUpdate({ caseId }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState('');
  const [landmark, setLandmark] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setSending(true);
    try {
      await api.post(`/cases/${caseId}/events`, {
        event_type: 'movement',
        message: `Animal moved${direction ? ` — ${direction}` : ''}${landmark ? ` — near ${landmark}` : ''}${message ? ` — ${message}` : ''}`,
        metadata: {
          direction: direction || null,
          landmark: landmark || null,
          note: message || null,
        },
      });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setDirection('');
        setLandmark('');
        setMessage('');
      }, 1500);
    } catch (err) {
      console.error('Movement update error:', err);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        className="btn btn-outline btn-block btn-sm"
        onClick={() => setOpen(true)}
        style={{ marginBottom: 16 }}
      >
        🐾 Report Animal Movement
      </button>
    );
  }

  if (sent) {
    return (
      <div className="movement-card sent">
        ✅ Movement update sent!
      </div>
    );
  }

  return (
    <div className="movement-card">
      <div className="movement-label">🐾 Animal Movement Report</div>

      <div className="form-group">
        <label>Direction</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              className="quick-action-chip"
              style={direction === d.value ? { background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', color: 'white' } : {}}
              onClick={() => setDirection(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Updated Landmark</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Moved behind the red building"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Additional Note (optional)</label>
        <input
          type="text"
          className="form-input"
          placeholder="Any extra details..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSubmit}
          disabled={sending}
          style={{ flex: 1 }}
        >
          {sending ? 'Sending...' : 'Send Update'}
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

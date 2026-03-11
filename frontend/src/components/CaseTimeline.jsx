import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import './CaseTimeline.css';

const eventIcons = {
  system: '🔔',
  status_change: '📋',
  quick_update: '💬',
  movement: '🐾',
  photo: '📷',
  location_update: '📍',
};

const roleColors = {
  victim: 'var(--accent-red)',
  responder: 'var(--accent-green)',
};

export default function CaseTimeline({ caseId }) {
  const { socket } = useSocket();
  const [events, setEvents] = useState([]);
  const bottomRef = useRef(null);

  // Fetch events on mount
  useEffect(() => {
    if (!caseId) return;
    api.get(`/cases/${caseId}/events`).then((res) => {
      setEvents(res.data.events || []);
    }).catch(() => {});
  }, [caseId]);

  // Listen for new events via socket
  useEffect(() => {
    if (!socket) return;

    const handler = (event) => {
      if (event.case_id === caseId) {
        setEvents((prev) => {
          if (prev.some((e) => e.id === event.id)) return prev;
          return [...prev, event];
        });
      }
    };

    socket.on('case:event_created', handler);
    return () => socket.off('case:event_created', handler);
  }, [socket, caseId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="timeline">
      <div className="timeline-label">Case Timeline</div>
      <div className="timeline-list">
        {events.map((e, i) => (
          <div key={e.id || i} className="timeline-item">
            <div className="timeline-dot" style={{ borderColor: roleColors[e.user_role] || 'var(--text-muted)' }} />
            <div className="timeline-content">
              <div className="timeline-message">
                <span className="timeline-icon">{eventIcons[e.event_type] || '📝'}</span>
                <span>{e.message}</span>
              </div>
              <div className="timeline-meta">
                <span className="timeline-user" style={{ color: roleColors[e.user_role] }}>
                  {e.user_name || e.user_role}
                </span>
                <span className="timeline-time">
                  {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

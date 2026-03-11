import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import AlertCard from '../components/AlertCard';
import StatusBar from '../components/StatusBar';
import MapView from '../components/MapView';
import RescueLocationCard from '../components/RescueLocationCard';
import QuickActions from '../components/QuickActions';
import CaseTimeline from '../components/CaseTimeline';
import PhotoGallery from '../components/PhotoGallery';
import ProximityTracker from '../components/ProximityTracker';

export default function ResponderHome() {
  const { socket } = useSocket();
  const [isOnline, setIsOnline] = useState(false);
  const [state, setState] = useState('offline'); // offline | online | alert_received | active | resolved
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [victimPos, setVictimPos] = useState(null);
  const [myPos, setMyPos] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const watchRef = useRef(null);

  // Check for existing active case on mount
  useEffect(() => {
    api.get('/cases/my-active').then((res) => {
      if (res.data.case) {
        const c = res.data.case;
        setActiveCase(c);
        setVictimPos([c.victim_lat, c.victim_lng]);
        setState('active');
        setIsOnline(true);
      }
    }).catch(() => {});

    api.get('/users/me').then((res) => {
      if (res.data.user.is_online) {
        setIsOnline(true);
        setState('online');
        if (res.data.user.latitude && res.data.user.longitude) {
          setLocation({ lat: res.data.user.latitude, lng: res.data.user.longitude });
        }
      }
    }).catch(() => {});
  }, []);

  // Listen for new SOS alerts
  useEffect(() => {
    if (!socket) return;

    socket.on('new_sos', (sos) => {
      console.log('New SOS received:', sos);
      setAlerts((prev) => {
        if (prev.some((a) => a.caseId === sos.caseId)) return prev;
        return [sos, ...prev];
      });
      if (state === 'online') setState('alert_received');
    });

    socket.on('case:status_updated', ({ caseId, status }) => {
      if (activeCase && caseId === activeCase.id) {
        setActiveCase((prev) => prev ? { ...prev, status } : prev);
        if (status === 'resolved') {
          setState('resolved');
          stopTracking();
        }
      }
    });

    return () => {
      socket.off('new_sos');
      socket.off('case:status_updated');
    };
  }, [socket, state, activeCase]);

  // Join case room
  useEffect(() => {
    if (!socket || !activeCase) return;
    socket.emit('join_case', { caseId: activeCase.id });
    return () => {
      socket.emit('leave_case', { caseId: activeCase.id });
    };
  }, [socket, activeCase?.id]);

  const startTracking = useCallback(() => {
    if (watchRef.current) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyPos([newPos.lat, newPos.lng]);
        if (socket && activeCase) {
          socket.emit('responder:location_update', {
            caseId: activeCase.id,
            lat: newPos.lat,
            lng: newPos.lng,
          });
        }
      },
      (err) => console.error('Watch position error:', err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  }, [socket, activeCase]);

  const stopTracking = () => {
    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  };

  // Start tracking when active
  useEffect(() => {
    if (state === 'active' && activeCase && socket) {
      startTracking();
    }
    return () => stopTracking();
  }, [state, activeCase, socket, startTracking]);

  const handleToggleOnline = async () => {
    setError('');

    if (isOnline) {
      try {
        await api.patch('/users/me/toggle-online', {});
        setIsOnline(false);
        setState('offline');
        setAlerts([]);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to go offline');
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        try {
          await api.patch('/users/me/toggle-online', {
            latitude: loc.lat,
            longitude: loc.lng,
          });
          setIsOnline(true);
          setState('online');
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to go online');
        }
      },
      () => {
        setLocationError('Location access is required to go online.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAccept = async (caseId) => {
    setLoading(true);
    try {
      const res = await api.patch(`/cases/${caseId}/accept`);
      setActiveCase(res.data.case);
      setVictimPos([res.data.case.victim_lat, res.data.case.victim_lng]);
      setState('active');
      setAlerts([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept case');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = (caseId) => {
    setAlerts((prev) => prev.filter((a) => a.caseId !== caseId));
    if (alerts.length <= 1) setState('online');
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const res = await api.patch(`/cases/${activeCase.id}/status`, { status: newStatus });
      setActiveCase(res.data.case);
      if (newStatus === 'resolved') {
        setState('resolved');
        stopTracking();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveCase(null);
    setVictimPos(null);
    setMyPos(null);
    setState(isOnline ? 'online' : 'offline');
    setError('');
  };

  // Calculate distance
  const getDistance = () => {
    if (!myPos || !victimPos) return null;
    const R = 6371000; // meters
    const dLat = ((victimPos[0] - myPos[0]) * Math.PI) / 180;
    const dLon = ((victimPos[1] - myPos[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((myPos[0] * Math.PI) / 180) *
        Math.cos((victimPos[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── RENDER ──

  if (state === 'resolved') {
    return (
      <div className="page-wrapper">
        <div className="page-content">
          <div className="resolved-state">
            <div className="resolved-icon">✓</div>
            <h2>Case Resolved</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Great work! You've helped someone in need.</p>
            <button className="btn btn-primary" onClick={handleReset} id="back-online-btn">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'active' && activeCase) {
    const dist = getDistance();
    let distLabel = null;
    if (dist !== null) {
      if (dist < 50) distLabel = '📍 Within 50 meters!';
      else if (dist < 100) distLabel = `📍 ~${Math.round(dist)}m away`;
      else if (dist < 1000) distLabel = `🚶 ${Math.round(dist)}m away`;
      else distLabel = `🚗 ${(dist / 1000).toFixed(1)}km away`;
    }

    return (
      <div className="page-wrapper">
        <div className="page-content">
          <StatusBar status={activeCase.status} detail={distLabel} />

          {/* Rescue Location Card — primary guidance */}
          <RescueLocationCard caseData={activeCase} />

          <div className="responder-info">
            <div className="responder-avatar" style={{ background: 'var(--gradient-red)' }}>
              {activeCase.victim_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="responder-details">
              <h3>{activeCase.victim_name || 'Victim'}</h3>
              <p>{activeCase.emergency_type}</p>
            </div>
          </div>

          {activeCase.description && (
            <div className="info-message" style={{ textAlign: 'left' }}>
              {activeCase.description}
            </div>
          )}

          {/* Rescue context photos — responder view */}
          <PhotoGallery caseId={activeCase.id} />

          {/* Proximity tracker — non-map guidance */}
          <ProximityTracker victimPos={victimPos} responderPos={myPos} />

          {/* Quick Actions — responder set */}
          <QuickActions caseId={activeCase.id} role="responder" />

          {/* Case Timeline */}
          <CaseTimeline caseId={activeCase.id} />

          {/* Map — preserved as-is */}
          <MapView
            victimPos={victimPos}
            responderPos={myPos}
            userRole="responder"
          />

          <div className="case-actions">
            {activeCase.status === 'assigned' && (
              <button
                className="btn btn-success btn-block"
                onClick={() => handleStatusUpdate('in_progress')}
                disabled={loading}
                id="mark-arrived"
              >
                ✓ Mark as Arrived
              </button>
            )}
            {activeCase.status === 'in_progress' && (
              <button
                className="btn btn-primary btn-block"
                onClick={() => handleStatusUpdate('resolved')}
                disabled={loading}
                id="mark-resolved"
              >
                ✓ Mark as Resolved
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {error && <div className="error-message">{error}</div>}
        {locationError && <div className="error-message">{locationError}</div>}

        <div className="toggle-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={handleToggleOnline}
              id="online-toggle"
            />
            <span className="toggle-slider" />
          </label>
          <span className="toggle-label">{isOnline ? 'Online' : 'Offline'}</span>
          <span className="toggle-status">
            {isOnline ? '🟢 Accepting alerts' : '⚫ Not receiving alerts'}
          </span>
        </div>

        {state === 'online' && alerts.length === 0 && (
          <div className="empty-state">
            <div className="icon">📡</div>
            <h3>Listening for SOS alerts...</h3>
            <p>You'll be notified when someone nearby needs help.</p>
          </div>
        )}

        {alerts.map((sos) => (
          <AlertCard
            key={sos.caseId}
            sos={sos}
            onAccept={handleAccept}
            onDecline={handleDecline}
            loading={loading}
          />
        ))}

        {state === 'offline' && (
          <div className="empty-state">
            <div className="icon">🔋</div>
            <h3>You are offline</h3>
            <p>Toggle the switch above to start receiving emergency alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import SOSForm from '../components/SOSForm';
import StatusBar from '../components/StatusBar';
import MapView from '../components/MapView';
import RescueLocationCard from '../components/RescueLocationCard';
import QuickActions from '../components/QuickActions';
import CaseTimeline from '../components/CaseTimeline';
import MovementUpdate from '../components/MovementUpdate';
import PhotoGallery from '../components/PhotoGallery';

export default function VictimHome() {
  const { socket } = useSocket();
  const [state, setState] = useState('idle'); // idle | requesting | pending | assigned | resolved
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [activeCase, setActiveCase] = useState(null);
  const [responderPos, setResponderPos] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get GPS on mount
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsAccuracy(pos.coords.accuracy);
      },
      () => {
        setLocationError('Please enable location access to send an SOS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Check for existing active case on mount
  useEffect(() => {
    api.get('/cases/my-active').then((res) => {
      if (res.data.case) {
        setActiveCase(res.data.case);
        const c = res.data.case;
        if (c.status === 'resolved') setState('resolved');
        else if (c.status === 'assigned' || c.status === 'in_progress') setState('assigned');
        else if (c.status === 'pending') setState('pending');

        if (c.responder_lat && c.responder_lng) {
          setResponderPos([c.responder_lat, c.responder_lng]);
        }
      }
    }).catch(() => {});
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('case:status_updated', ({ caseId, status, responder_id }) => {
      if (activeCase && caseId === activeCase.id) {
        setActiveCase((prev) => prev ? { ...prev, status } : prev);
        if (status === 'assigned') {
          setState('assigned');
          api.get(`/cases/${caseId}`).then((res) => {
            setActiveCase(res.data.case);
          }).catch(() => {});
        }
        if (status === 'in_progress') setState('assigned');
        if (status === 'resolved') setState('resolved');
      }
    });

    socket.on('responder:location', ({ lat, lng }) => {
      setResponderPos([lat, lng]);
    });

    return () => {
      socket.off('case:status_updated');
      socket.off('responder:location');
    };
  }, [socket, activeCase]);

  // Join case room when we have an active case
  useEffect(() => {
    if (!socket || !activeCase) return;
    socket.emit('join_case', { caseId: activeCase.id });
    return () => {
      socket.emit('leave_case', { caseId: activeCase.id });
    };
  }, [socket, activeCase?.id]);

  const handleSOS = useCallback(async (formData) => {
    if (!location) return;
    setLoading(true);
    setError('');
    setState('requesting');

    try {
      const res = await api.post('/cases', {
        ...formData,
        latitude: location.lat,
        longitude: location.lng,
        gps_accuracy: gpsAccuracy,
      });
      setActiveCase(res.data.case);
      setState('pending');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send SOS');
      setState('idle');
    } finally {
      setLoading(false);
    }
  }, [location, gpsAccuracy]);

  const handleCancel = async () => {
    if (!activeCase) return;
    try {
      await api.patch(`/cases/${activeCase.id}/status`, { status: 'cancelled' });
      setActiveCase(null);
      setState('idle');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const handleNewSOS = () => {
    setActiveCase(null);
    setResponderPos(null);
    setState('idle');
    setError('');
  };

  // Calculate rough ETA
  const getETA = () => {
    if (!location || !responderPos) return null;
    const R = 6371;
    const dLat = ((responderPos[0] - location.lat) * Math.PI) / 180;
    const dLon = ((responderPos[1] - location.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((location.lat * Math.PI) / 180) *
        Math.cos((responderPos[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(1, Math.round((dist / 40) * 60));
  };

  // ── RENDER ──

  if (state === 'resolved') {
    return (
      <div className="page-wrapper">
        <div className="page-content">
          <div className="resolved-state">
            <div className="resolved-icon">✓</div>
            <h2>Help Has Arrived</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Your case has been resolved. Stay safe!</p>
            <button className="btn btn-primary" onClick={handleNewSOS} id="new-sos-btn">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'assigned' && activeCase) {
    const eta = getETA();
    return (
      <div className="page-wrapper">
        <div className="page-content">
          <StatusBar
            status={activeCase.status}
            detail={eta ? `~${eta} min away` : null}
          />

          {/* Rescue Location Card — above map */}
          <RescueLocationCard caseData={activeCase} />

          {activeCase.responder_name && (
            <div className="responder-info">
              <div className="responder-avatar">
                {activeCase.responder_name.charAt(0).toUpperCase()}
              </div>
              <div className="responder-details">
                <h3>{activeCase.responder_name}</h3>
                <p>Responder is on the way</p>
              </div>
            </div>
          )}

          {/* Quick Actions — reporter set */}
          <QuickActions caseId={activeCase.id} role="victim" />

          {/* Movement update helper */}
          <MovementUpdate caseId={activeCase.id} />

          {/* Reporter photo uploads */}
          <PhotoGallery caseId={activeCase.id} canUpload={true} />

          {/* Case Timeline */}
          <CaseTimeline caseId={activeCase.id} />

          {/* Map — preserved as-is */}
          <MapView
            victimPos={[activeCase.victim_lat, activeCase.victim_lng]}
            responderPos={responderPos}
            userRole="victim"
          />
        </div>
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div className="page-wrapper">
        <div className="page-content">
          <div className="waiting-state">
            <div className="waiting-spinner" />
            <h2>SOS Sent</h2>
            <p>Searching for nearby responders. Please wait...</p>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleCancel}
              id="cancel-sos-btn"
            >
              Cancel SOS
            </button>
          </div>
          {/* Show quick actions even while waiting */}
          {activeCase && <QuickActions caseId={activeCase.id} role="victim" />}
          {activeCase && <CaseTimeline caseId={activeCase.id} />}
        </div>
      </div>
    );
  }

  // IDLE state
  return (
    <div className="page-wrapper">
      <div className="page-content">
        {error && <div className="error-message">{error}</div>}
        {locationError && <div className="error-message">{locationError}</div>}

        <div className="sos-section">
          <button
            className="sos-button"
            onClick={() => setState('requesting')}
            disabled={!location}
            id="sos-trigger"
          >
            SOS
          </button>
          <p className="sos-subtitle">
            {location
              ? 'Tap the button to request emergency help'
              : 'Waiting for location access...'}
          </p>
        </div>

        {state === 'requesting' && (
          <div className="card" style={{ marginTop: 16 }}>
            <SOSForm onSubmit={handleSOS} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
}

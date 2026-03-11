import { useState, useEffect, useRef } from 'react';
import './ProximityTracker.css';

export default function ProximityTracker({ victimPos, responderPos }) {
  const [prevDist, setPrevDist] = useState(null);
  const [trend, setTrend] = useState(null); // 'closer' | 'farther' | null
  const [lastUpdate, setLastUpdate] = useState(null);

  const calcDistance = () => {
    if (!victimPos || !responderPos) return null;
    const R = 6371000; // meters
    const dLat = ((victimPos[0] - responderPos[0]) * Math.PI) / 180;
    const dLon = ((victimPos[1] - responderPos[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((responderPos[0] * Math.PI) / 180) *
        Math.cos((victimPos[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    const dist = calcDistance();
    if (dist === null) return;

    if (prevDist !== null) {
      if (dist < prevDist - 5) setTrend('closer');
      else if (dist > prevDist + 5) setTrend('farther');
    }

    setPrevDist(dist);
    setLastUpdate(new Date());
  }, [responderPos]);

  const dist = calcDistance();
  if (dist === null) return null;

  let distLabel, distColor, progressPct;
  if (dist < 50) {
    distLabel = 'Within 50 meters!';
    distColor = 'var(--accent-green)';
    progressPct = 95;
  } else if (dist < 100) {
    distLabel = `~${Math.round(dist)} meters away`;
    distColor = 'var(--accent-green)';
    progressPct = 85;
  } else if (dist < 500) {
    distLabel = `~${Math.round(dist)} meters away`;
    distColor = 'var(--accent-blue)';
    progressPct = 60;
  } else if (dist < 1000) {
    distLabel = `~${Math.round(dist)} meters away`;
    distColor = 'var(--accent-orange)';
    progressPct = 35;
  } else {
    distLabel = `~${(dist / 1000).toFixed(1)} km away`;
    distColor = 'var(--text-muted)';
    progressPct = 15;
  }

  return (
    <div className="proximity-tracker">
      <div className="proximity-header">
        <span className="proximity-label">📡 Proximity</span>
        {lastUpdate && (
          <span className="proximity-time">
            Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      <div className="proximity-distance" style={{ color: distColor }}>
        {distLabel}
      </div>

      {trend && (
        <div className={`proximity-trend ${trend}`}>
          {trend === 'closer' ? '↓ Getting closer' : '↑ Getting farther'}
        </div>
      )}

      <div className="proximity-bar">
        <div
          className="proximity-bar-fill"
          style={{ width: `${progressPct}%`, background: distColor }}
        />
      </div>
    </div>
  );
}

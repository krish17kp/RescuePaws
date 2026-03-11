export default function AlertCard({ sos, onAccept, onDecline, loading }) {
  return (
    <div className="alert-card" id={`alert-${sos.caseId}`}>
      <div className="alert-card-header">
        <span className="badge">🚨 New SOS</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {sos.distance} km away
        </span>
      </div>
      <div className="alert-card-body">
        <div className="alert-card-field">
          <div className="label">Emergency</div>
          <div>{sos.emergency_type}</div>
        </div>
        <div className="alert-card-field">
          <div className="label">Distance</div>
          <div>{sos.distance} km</div>
        </div>
        {sos.description && (
          <div className="alert-card-field" style={{ gridColumn: '1 / -1' }}>
            <div className="label">Description</div>
            <div>{sos.description}</div>
          </div>
        )}
      </div>
      <div className="alert-card-actions">
        <button
          className="btn btn-success"
          onClick={() => onAccept(sos.caseId)}
          disabled={loading}
          id={`accept-${sos.caseId}`}
          style={{ flex: 1 }}
        >
          ✓ Accept
        </button>
        <button
          className="btn btn-outline"
          onClick={() => onDecline(sos.caseId)}
          disabled={loading}
          id={`decline-${sos.caseId}`}
          style={{ flex: 1 }}
        >
          ✗ Decline
        </button>
      </div>
    </div>
  );
}

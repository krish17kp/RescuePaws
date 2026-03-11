import './RescueLocationCard.css';

const conditionLabels = {
  injured: '🩹 Injured',
  trapped: '🔒 Trapped',
  sick: '🤒 Sick',
  abandoned: '😿 Abandoned',
  accident: '🚗 Accident',
  unknown: '❓ Unknown',
};

const availabilityLabels = {
  on_site: { text: '📍 Reporter is on-site', color: 'var(--accent-green)' },
  leaving: { text: '⏳ Reporter is leaving', color: 'var(--accent-orange)' },
  left: { text: '🚶 Reporter has left', color: 'var(--accent-red)' },
};

export default function RescueLocationCard({ caseData }) {
  if (!caseData) return null;

  const avail = availabilityLabels[caseData.reporter_availability] || availabilityLabels.on_site;

  return (
    <div className="rescue-card">
      <div className="rescue-card-header">
        <h3>🆘 Rescue Location</h3>
        {caseData.animal_condition && (
          <span className="rescue-badge condition">
            {conditionLabels[caseData.animal_condition] || caseData.animal_condition}
          </span>
        )}
      </div>

      <div className="rescue-card-grid">
        {caseData.landmark && (
          <div className="rescue-field">
            <span className="rescue-field-label">🏠 Landmark</span>
            <span className="rescue-field-value">{caseData.landmark}</span>
          </div>
        )}

        {caseData.locality && (
          <div className="rescue-field">
            <span className="rescue-field-label">📍 Locality</span>
            <span className="rescue-field-value">{caseData.locality}</span>
          </div>
        )}

        {caseData.access_instructions && (
          <div className="rescue-field full-width">
            <span className="rescue-field-label">🚪 Access</span>
            <span className="rescue-field-value">{caseData.access_instructions}</span>
          </div>
        )}

        {caseData.hazard_info && (
          <div className="rescue-field full-width">
            <span className="rescue-field-label">⚠️ Hazards</span>
            <span className="rescue-field-value hazard">{caseData.hazard_info}</span>
          </div>
        )}

        <div className="rescue-field">
          <span className="rescue-field-label">📡 GPS</span>
          <span className="rescue-field-value mono">
            {caseData.victim_lat?.toFixed(5)}, {caseData.victim_lng?.toFixed(5)}
          </span>
        </div>

        {caseData.gps_accuracy && (
          <div className="rescue-field">
            <span className="rescue-field-label">🎯 Accuracy</span>
            <span className="rescue-field-value">±{Math.round(caseData.gps_accuracy)}m</span>
          </div>
        )}
      </div>

      <div className="rescue-card-footer">
        <span className="rescue-availability" style={{ color: avail.color }}>
          {avail.text}
        </span>
        {caseData.location_updated_at && (
          <span className="rescue-updated">
            Updated {new Date(caseData.location_updated_at).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

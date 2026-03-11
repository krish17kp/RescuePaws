import { useState } from 'react';

const EMERGENCY_TYPES = [
  { value: 'medical', label: '🏥 Medical Emergency' },
  { value: 'fire', label: '🔥 Fire / Hazard' },
  { value: 'accident', label: '🚗 Accident / Injury' },
];

export default function SOSForm({ onSubmit, loading }) {
  const [emergencyType, setEmergencyType] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!emergencyType) return;
    onSubmit({ emergency_type: emergencyType, description });
  };

  return (
    <form onSubmit={handleSubmit} id="sos-form">
      <div className="form-group">
        <label htmlFor="emergency-type">Emergency Type</label>
        <select
          id="emergency-type"
          className="form-select"
          value={emergencyType}
          onChange={(e) => setEmergencyType(e.target.value)}
          required
        >
          <option value="">Select emergency type...</option>
          {EMERGENCY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="description">Brief Description (optional)</label>
        <textarea
          id="description"
          className="form-textarea"
          placeholder="Describe the situation..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </div>
      <button
        type="submit"
        className="btn btn-danger btn-block btn-lg"
        disabled={!emergencyType || loading}
        id="submit-sos"
      >
        {loading ? 'Sending SOS...' : '🚨 Send SOS Alert'}
      </button>
    </form>
  );
}

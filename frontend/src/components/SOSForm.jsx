import { useState } from 'react';

const ANIMAL_CONDITIONS = [
  { value: 'injured', label: '🩹 Injured' },
  { value: 'trapped', label: '🔒 Trapped' },
  { value: 'sick', label: '🤒 Sick' },
  { value: 'abandoned', label: '😿 Abandoned' },
  { value: 'accident', label: '🚗 Accident' },
  { value: 'unknown', label: '❓ Unknown' },
];

const EMERGENCY_TYPES = [
  { value: 'medical', label: '🏥 Medical' },
  { value: 'accident', label: '🚗 Accident' },
  { value: 'fire', label: '🔥 Fire' },
];

export default function SOSForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    emergency_type: '',
    description: '',
    animal_condition: '',
    landmark: '',
    access_instructions: '',
    hazard_info: '',
    locality: '',
  });

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.emergency_type) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Required: Emergency Type */}
      <div className="form-group">
        <label>Emergency Type *</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EMERGENCY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`quick-action-chip ${formData.emergency_type === t.value ? 'sending' : ''}`}
              style={formData.emergency_type === t.value ? { background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', color: 'white' } : {}}
              onClick={() => update('emergency_type', t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Required: Animal Condition */}
      <div className="form-group">
        <label>Animal Condition *</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ANIMAL_CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`quick-action-chip`}
              style={formData.animal_condition === c.value ? { background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', color: 'white' } : {}}
              onClick={() => update('animal_condition', c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Required: Landmark */}
      <div className="form-group">
        <label>Nearest Landmark *</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Near Blue Gate, Behind Pharmacy"
          value={formData.landmark}
          onChange={(e) => update('landmark', e.target.value)}
        />
      </div>

      {/* Optional: Description */}
      <div className="form-group">
        <label>Brief Description</label>
        <textarea
          className="form-textarea"
          placeholder="What's happening? Any important details..."
          value={formData.description}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
        />
      </div>

      {/* Optional: Access Instructions */}
      <div className="form-group">
        <label>Access Instructions (optional)</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Enter from back lane, under parked truck"
          value={formData.access_instructions}
          onChange={(e) => update('access_instructions', e.target.value)}
        />
      </div>

      {/* Optional: Locality */}
      <div className="form-group">
        <label>Area / Locality (optional)</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Andheri West, Sector 5"
          value={formData.locality}
          onChange={(e) => update('locality', e.target.value)}
        />
      </div>

      {/* Optional: Hazards */}
      <div className="form-group">
        <label>Hazard Info (optional)</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Heavy traffic, construction, stray dogs"
          value={formData.hazard_info}
          onChange={(e) => update('hazard_info', e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn btn-danger btn-block btn-lg"
        disabled={loading || !formData.emergency_type}
        id="sos-submit"
      >
        {loading ? 'Sending SOS...' : '🚨 Send SOS'}
      </button>
    </form>
  );
}

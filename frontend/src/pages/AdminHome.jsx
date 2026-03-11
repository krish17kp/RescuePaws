import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AdminHome() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCases = async () => {
    try {
      const res = await api.get('/cases/active');
      setCases(res.data.cases);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-wrapper">
      <div className="page-content-wide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📊 Active Cases</h1>
          <button className="btn btn-outline btn-sm" onClick={fetchCases} id="refresh-cases">
            ↻ Refresh
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="waiting-state">
            <div className="waiting-spinner" />
            <p>Loading cases...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>No Active Cases</h3>
            <p>All clear! No ongoing emergencies.</p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table" id="cases-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Victim</th>
                  <th>Responder</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td>
                    <td>{c.emergency_type}</td>
                    <td>{c.victim_name}</td>
                    <td>{c.responder_name || '—'}</td>
                    <td>
                      <span className={`status-badge ${c.status}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{formatTime(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

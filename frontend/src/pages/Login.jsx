import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      const roleHome = { victim: '/victim', responder: '/responder', admin: '/admin' };
      navigate(roleHome[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h1>🚨 Rescue-Uber</h1>
            <p>Emergency dispatch at your fingertips</p>
          </div>

          {error && <div className="error-message" id="login-error">{error}</div>}

          <form onSubmit={handleSubmit} id="login-form">
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                type="email"
                id="login-email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
              id="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Don't have an account? <Link to="/register" className="text-link">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

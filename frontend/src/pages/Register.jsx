import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, role);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h1>Create Account</h1>
            <p>Join Rescue-Uber as a victim or responder</p>
          </div>

          {error && <div className="error-message" id="register-error">{error}</div>}

          <form onSubmit={handleSubmit} id="register-form">
            <div className="form-group">
              <label htmlFor="register-name">Full Name</label>
              <input
                type="text"
                id="register-name"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="register-email">Email</label>
              <input
                type="email"
                id="register-email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="register-password">Password</label>
              <input
                type="password"
                id="register-password"
                className="form-input"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label htmlFor="register-role">I am a...</label>
              <select
                id="register-role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="">Select your role...</option>
                <option value="victim">🙋 Victim — I need help</option>
                <option value="responder">🚑 Responder — I provide help</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading || !role}
              id="register-submit"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" className="text-link">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

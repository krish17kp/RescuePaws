import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import VictimHome from './pages/VictimHome';
import ResponderHome from './pages/ResponderHome';
import AdminHome from './pages/AdminHome';

function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="icon">🚨</span>
        <span>Rescue-Uber</span>
      </div>
      <div className="navbar-right">
        <span className="navbar-user">{user.name}</span>
        <span className={`navbar-role ${user.role}`}>{user.role}</span>
        <button className="btn btn-outline btn-sm" onClick={logout} id="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}

function AppRoutes() {
  return (
    <div className="app-container">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/victim"
          element={
            <ProtectedRoute allowedRoles={['victim']}>
              <VictimHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/responder"
          element={
            <ProtectedRoute allowedRoles={['responder']}>
              <ResponderHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminHome />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}

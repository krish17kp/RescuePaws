import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the correct home page for their role
    const roleHome = {
      victim: '/victim',
      responder: '/responder',
      admin: '/admin',
    };
    return <Navigate to={roleHome[user.role] || '/login'} replace />;
  }

  return children;
}

import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    window.__AUTH_TOKEN__ = t;
    return u;
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    window.__AUTH_TOKEN__ = null;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

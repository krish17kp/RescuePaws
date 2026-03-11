import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = window.__AUTH_TOKEN__;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.__AUTH_TOKEN__ = null;
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

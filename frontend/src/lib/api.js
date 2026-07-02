import axios from 'axios';

// In production VITE_BACKEND_URL is set (e.g. https://mcw-backend-7hev.onrender.com).
// In dev, we use an empty string so requests go to the same origin — Vite proxies
// /api and /auth to http://localhost:3001 automatically.
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: false,
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mcw_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;

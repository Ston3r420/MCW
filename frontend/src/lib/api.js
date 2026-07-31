import axios from 'axios';

const envBackendUrl = import.meta.env.VITE_BACKEND_URL || '';
// If the current domain is not localhost but the configured backend URL is localhost,
// override it to relative path so it requests from the same origin.
export const BACKEND_URL = (
  envBackendUrl.includes('localhost') && !window.location.hostname.includes('localhost')
) ? '' : envBackendUrl;

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

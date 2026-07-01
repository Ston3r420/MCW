import axios from 'axios';
import { BACKEND_URL } from './config';

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

export { BACKEND_URL };
export default api;

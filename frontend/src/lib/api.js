import axios from 'axios';

const BACKEND_URL = 'https://mcw-backend-7hev.onrender.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

export { BACKEND_URL };
export default api;

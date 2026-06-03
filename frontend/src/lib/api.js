import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  withCredentials: true, // sends session cookie
});

export default api;

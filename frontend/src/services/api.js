import axios from 'axios';

// Get the base URL directly from Vite's env, falling back to localhost only for local dev
const BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : 'http://localhost:5000/api';

const API = axios.create({
  baseURL: BASE_URL
});

// Attach JWT Authorization token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
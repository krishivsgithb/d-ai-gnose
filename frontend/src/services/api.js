import axios from 'axios';

// Get base URL dynamically and sanitize trailing slashes
export const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : 'http://localhost:5000/api';

const API = axios.create({
  baseURL: API_BASE_URL
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
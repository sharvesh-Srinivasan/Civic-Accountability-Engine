import axios from 'axios';
import { auth } from '../firebase';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://civic-accountability-engine.onrender.com';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  try {
    if (auth?.currentUser) {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* no-op */ }
  return config;
});

export default api;

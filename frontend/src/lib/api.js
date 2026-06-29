import axios from 'axios';
import { auth } from '../firebase';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://civicwatch-backend-xauz.onrender.com';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  try {
    if (auth?.currentUser) {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* no-op */ }
  
  // Default timeout of 15s for all requests unless overridden per-call.
  // The classify and submit endpoints set their own 30s timeout to allow
  // for backend cold-start on Render's free tier.
  if (!config.timeout) {
    config.timeout = 15000;
  }

  return config;
});

export default api;

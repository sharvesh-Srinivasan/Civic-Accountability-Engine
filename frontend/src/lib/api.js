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
  
  // Removed local mock adapter. API calls will now actually hit the backend.
  // Error handling, timeouts, and fallback logic must be handled by the calling components.
  config.timeout = 10000; // 10-second timeout to prevent infinite hanging

  return config;
});

export default api;

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function resolveApiAssetUrl(value?: string | null): string {
  if (!value) return '';
  if (!value.startsWith('/')) return value;
  try { return new URL(value, new URL(API_URL).origin).toString(); } catch { return value; }
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function clearAdminSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminRefreshToken');
  window.location.href = '/login';
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('adminRefreshToken')
        : null;

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('adminToken', data.accessToken);
          localStorage.setItem('adminRefreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          clearAdminSession();
          return Promise.reject(error);
        }
      }

      clearAdminSession();
    }

    return Promise.reject(error);
  },
);

export default api;

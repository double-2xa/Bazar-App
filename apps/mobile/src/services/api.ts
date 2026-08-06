import axios from 'axios';
import { tokenStorage } from './tokenStorage';
import { getApiUrl } from './getApiUrl';

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Auth (bcrypt) can take >15s on slower machines; avoid false "failed" after server already saved.
  timeout: 45000,
});

api.interceptors.request.use(async (config) => {
  const url = config.url || '';
  const skipAuth =
    url.includes('/auth/register') ||
    url.includes('/auth/register-company') ||
    url.includes('/auth/login') ||
    url.includes('/auth/google');

  if (!skipAuth) {
    const token = await tokenStorage.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await tokenStorage.getItemAsync('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          await tokenStorage.setItemAsync('accessToken', data.accessToken);
          await tokenStorage.setItemAsync('refreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          await tokenStorage.deleteItemAsync('accessToken');
          await tokenStorage.deleteItemAsync('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

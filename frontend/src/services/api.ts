import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// In-memory cache for fast tab navigation & deduplication
interface CacheEntry {
  data: any;
  status: number;
  statusText: string;
  headers: any;
  config: InternalAxiosRequestConfig;
  expiresAt: number;
}

const getCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 25000; // 25 seconds TTL for instant UI navigation

export const clearApiCache = () => {
  getCache.clear();
};

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cache & Deduplication Interceptor
api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();

  // Invalidate cache on mutations
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    getCache.clear();
    return config;
  }

  if (method === 'get' && config.headers?.['x-skip-cache'] !== 'true') {
    const cacheKey = `${config.baseURL || ''}${config.url || ''}?${JSON.stringify(config.params || {})}`;
    const cached = getCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      // Resolve from memory cache immediately with zero network latency
      config.adapter = () =>
        Promise.resolve({
          data: cached.data,
          status: cached.status,
          statusText: cached.statusText,
          headers: cached.headers,
          config,
          request: {},
        });
      return config;
    }
  }

  return config;
});

// Add response error and caching interceptor
api.interceptors.response.use(
  (response) => {
    const config = response.config;
    const method = (config.method || 'get').toLowerCase();

    if (method === 'get' && config.headers?.['x-skip-cache'] !== 'true' && response.status === 200) {
      const cacheKey = `${config.baseURL || ''}${config.url || ''}?${JSON.stringify(config.params || {})}`;
      getCache.set(cacheKey, {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      getCache.clear();
      // Only redirect if not already on login/register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

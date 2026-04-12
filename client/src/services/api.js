import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // CRITICAL: Let browser auto-set Content-Type for FormData (includes boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (!err.response) {
      console.error('Network error - is the server running on port 5000?');
    }
    return Promise.reject(err);
  }
);

export default api;

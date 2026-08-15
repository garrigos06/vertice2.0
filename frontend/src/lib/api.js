import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "vs_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(err);
  }
);

export const LOGO_HORIZONTAL =
  "https://customer-assets-v7afamib.emergentagent.net/job_595e111a-6767-4de0-8dbb-296c1203dab5/artifacts/glnrignj_99F8D8B2-E6F9-4FFA-B3CB-618DA8207057.png";
export const LOGO_ICON =
  "https://customer-assets-v7afamib.emergentagent.net/job_595e111a-6767-4de0-8dbb-296c1203dab5/artifacts/zwcaem0r_A1BD4035-8C39-468F-9845-AF46127250B3.png";

// Base API Client for Ask Sila Backend
// In development, defaults to '/api' (proxied by Vite to http://localhost:5000)
// In production, uses the deployed Render backend URL (e.g. VITE_API_URL=https://ask-sila-backend.onrender.com)
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, "")}/api`
  : "/api";

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // If token is saved in localStorage (fallback for mobile/PWA if cookies are restricted)
  const storedToken = typeof window !== "undefined" ? localStorage.getItem("sila_admin_token") : null;
  if (storedToken) {
    defaultHeaders["Authorization"] = `Bearer ${storedToken}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    credentials: "include", // send HttpOnly cookies
  };

  if (options.body && typeof options.body !== "string") {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { ok: false, message: response.statusText };
  }

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Thin API client: attaches the access token, retries once on 401 using the
// refresh token, and normalizes errors.

const BASE = "/api";
const ACCESS_KEY = "servicehub_access";
const REFRESH_KEY = "servicehub_refresh";

export function saveTokens({ accessToken, refreshToken }) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function hasAccessToken() {
  return Boolean(localStorage.getItem(ACCESS_KEY));
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function rawFetch(path, options) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      // Let the browser set Content-Type with boundary for FormData
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(localStorage.getItem(ACCESS_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(ACCESS_KEY)}` }
        : {}),
    },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error || res.statusText, body.details);
  }
  return body;
}

async function tryRefresh() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    saveTokens(await res.json());
    return true;
  } catch {
    return false;
  }
}

export async function api(path, options = {}) {
  try {
    return await rawFetch(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && (await tryRefresh())) {
      return rawFetch(path, options);
    }
    throw err;
  }
}

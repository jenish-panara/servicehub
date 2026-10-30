import { createContext, useContext, useEffect, useState } from "react";
import { api, saveTokens, clearTokens, hasAccessToken } from "../../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasAccessToken());

  useEffect(() => {
    if (!hasAccessToken()) return;
    // /auth/me is a TODO on the API; for now decode-less bootstrap: if the
    // token is stale the first API 401+refresh will surface it.
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    saveTokens(data);
    setUser(data.user);
    return data;
  }

  async function logout() {
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = unknown/checking, false = anonymous, object = authenticated
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // If a Google OAuth fragment is present, skip /me check; AuthCallback handles it.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      // Persist / refresh admin token if returned
      if (res.data?.admin_token) {
        localStorage.setItem("nx_admin_token", res.data.admin_token);
        localStorage.setItem("nx_admin_email", res.data.email);
      } else if (res.data?.is_admin === false) {
        // Explicitly not an admin – clear stale admin token
        localStorage.removeItem("nx_admin_token");
        localStorage.removeItem("nx_admin_email");
      }
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const persistAdminToken = (u) => {
    if (u?.admin_token) {
      localStorage.setItem("nx_admin_token", u.admin_token);
      localStorage.setItem("nx_admin_email", u.email);
    }
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data);
    persistAdminToken(res.data);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await api.post("/auth/register", { email, password, name });
    setUser(res.data);
    persistAdminToken(res.data);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    localStorage.removeItem("nx_admin_token");
    localStorage.removeItem("nx_admin_email");
    setUser(false);
  };

  const setUserFromCallback = (u) => {
    setUser(u);
    persistAdminToken(u);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refresh: checkAuth, setUserFromCallback }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function formatApiError(detail) {
  if (detail == null) return "Wystąpił błąd. Spróbuj ponownie.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(", ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach admin token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nx_admin_token");
  if (token && config.url && config.url.startsWith("/admin")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const formatPLN = (amount) => {
  if (amount == null) return "";
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} zł`;
  }
};

export const CATEGORIES = {
  hosting: { label: "Hosting", slug: "hosting" },
  addons: { label: "Addony", slug: "addons" },
  maps: { label: "Mapy", slug: "maps" },
};

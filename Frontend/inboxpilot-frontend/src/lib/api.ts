import { getAuthToken } from "./auth.client";

function resolveBaseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "";
  if (env === "") {
    return "/api";
  }
  return env.replace(/\/+$/, "");
}

export async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: unknown,
  token?: string
) {
  const BASE = resolveBaseUrl();
  console.log("API Request to:", `${BASE}${endpoint}`);

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    mode: "cors",
    credentials: "include", // include cookies
    headers,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const msg = text || `API Error ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function filterEmails(query: string, userID: string) {
  const token = getAuthToken() ?? "";
  return await apiRequest("/filter", "POST", { userID, query }, token);
}

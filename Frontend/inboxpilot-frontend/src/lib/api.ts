import "server-only";

function resolveBaseUrl(): string {
  const env =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
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

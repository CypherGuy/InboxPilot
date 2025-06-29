const TOKEN_KEY = "inboxpilot_auth_token";
const USER_ID_KEY = "inboxpilot_user_id";
const PROXY_EMAIL_KEY = "inboxpilot_proxy_email";
export function setLocalAuth(
  token: string,
  userID: string,
  proxyEmail: string
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, JSON.stringify({ userID }));
  localStorage.setItem(PROXY_EMAIL_KEY, proxyEmail);
}

export function clearLocalAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(PROXY_EMAIL_KEY);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserID(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_ID_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return obj.userID ?? null;
  } catch {
    return null;
  }
}

export function getProxyEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROXY_EMAIL_KEY);
}

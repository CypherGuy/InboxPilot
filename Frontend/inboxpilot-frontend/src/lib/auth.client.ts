/**
 * Client-side auth helpers: read from localStorage
 */

const TOKEN_KEY = "inboxpilot_auth_token";
const USER_KEY = "inboxpilot_user";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserID(): string | null {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("inboxpilot_user");
  if (!u) return null;
  try {
    const user = JSON.parse(u);
    // return the mailbox address (toEmail) for filtering
    return user.proxyEmail ?? user.userID ?? null;
  } catch {
    return null;
  }
}

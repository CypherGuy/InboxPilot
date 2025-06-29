// src/lib/auth.server.ts
import { cookies } from "next/headers";

const TOKEN_KEY = "inboxpilot_auth_token";
const USER_ID_KEY = "inboxpilot_user_id";
const PROXY_EMAIL_KEY = "inboxpilot_proxy_email";

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_KEY)?.value;
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_KEY);
  cookieStore.delete(USER_ID_KEY);
  cookieStore.delete(PROXY_EMAIL_KEY);
}

export async function setUserIDCookie(userID: string) {
  const cookieStore = await cookies();
  cookieStore.set(USER_ID_KEY, userID, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUserIDCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(USER_ID_KEY)?.value;
}

export async function setProxyEmailCookie(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(PROXY_EMAIL_KEY, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getProxyEmailCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(PROXY_EMAIL_KEY)?.value;
}

// This file is used to manage auth cookies. Also stops XSS attacks!
import "server-only";
import { cookies } from "next/headers";

const TOKEN_KEY = "inboxpilot_auth_token";
const USER_ID_KEY = "inboxpilot_user_id";
const PROXY_EMAIL_KEY = "inboxpilot_proxy_email";

export async function setAuthCookie(token: string) {
  (await cookies()).set(TOKEN_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_KEY)?.value;
}

export async function removeAuthCookie() {
  const store = await cookies();
  store.delete(TOKEN_KEY);
  store.delete(USER_ID_KEY);
  store.delete(PROXY_EMAIL_KEY);
}

export async function setUserIDCookie(userID: string) {
  (await cookies()).set(USER_ID_KEY, userID, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUserIDCookie(): Promise<string | undefined> {
  return (await cookies()).get(USER_ID_KEY)?.value;
}

export async function setProxyEmailCookie(email: string) {
  (await cookies()).set(PROXY_EMAIL_KEY, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getProxyEmailCookie(): Promise<string | undefined> {
  return (await cookies()).get(PROXY_EMAIL_KEY)?.value;
}

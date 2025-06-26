// This file is used to manage auth cookies. Also stops XSS attacks!
import "server-only";
import { cookies } from "next/headers";

const TOKEN_KEY = "inboxpilot_auth_token";
const USER_ID_KEY = "inboxpilot_user_id";
const PROXY_EMAIL_KEY = "inboxpilot_proxy_email";

export function setAuthCookie(token: string) {
  cookies().set(TOKEN_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function getAuthCookie(): string | undefined {
  return cookies().get(TOKEN_KEY)?.value;
}

export function removeAuthCookie() {
  cookies().delete(TOKEN_KEY);
  cookies().delete(USER_ID_KEY);
  cookies().delete(PROXY_EMAIL_KEY);
}

export function setUserIDCookie(userID: string) {
  cookies().set(USER_ID_KEY, userID, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function getUserIDCookie(): string | undefined {
  return cookies().get(USER_ID_KEY)?.value;
}

export function setProxyEmailCookie(email: string) {
  cookies().set(PROXY_EMAIL_KEY, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function getProxyEmailCookie(): string | undefined {
  return cookies().get(PROXY_EMAIL_KEY)?.value;
}

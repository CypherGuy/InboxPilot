"use server";

import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api";
import {
  setAuthCookie,
  setUserIDCookie,
  setProxyEmailCookie,
  removeAuthCookie,
  removeUserIDCookie,
  removeProxyEmailCookie,
} from "@/lib/auth.server";

const SERVER_AUTH_TOKEN = process.env.AUTH_TOKEN!;
interface ApiError {
  error?: string;
  message?: string;
}
function extractErrorMessage(raw: any): string {
  if (typeof raw === "object" && raw !== null) {
    return raw.error || raw.message || JSON.stringify(raw);
  }
  if (typeof raw === "string" && raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as ApiError;
      return parsed.error || parsed.message || raw;
    } catch {
      return raw;
    }
  }
  return String(raw);
}

export async function loginAction(formData: FormData) {
  const userID = formData.get("userID")?.toString() || "";
  const password = formData.get("password")?.toString() || "";

  if (!userID || !password) {
    return { success: false, message: "Missing credentials." };
  }

  try {
    const res = await apiRequest("/login", "POST", { userID, password });
    if (!res.user?.userID || !res.token) {
      return { success: false, message: "Invalid credentials." };
    }

    await setAuthCookie(res.token);
    await setUserIDCookie(res.user.userID);
    await setProxyEmailCookie(res.user.proxyEmail);
    return {
      success: true,
      userID: res.user.userID,
      proxyEmail: res.user.proxyEmail,
      token: res.token,
    };
  } catch (error: any) {
    const msg = extractErrorMessage(error.message || error);
    return { success: false, message: msg };
  }
}

export async function signupAction(formData: FormData) {
  const name = formData.get("name")?.toString() || "";
  const userID = formData.get("userID")?.toString() || "";
  const password = formData.get("password")?.toString() || "";

  if (!name || !userID || !password) {
    return { success: false, message: "Missing required fields." };
  }

  try {
    const res = await apiRequest("/register", "POST", {
      name,
      userID,
      proxyEmail: formData.get("proxyEmail")?.toString() || "",
      replyTemplate: formData.get("replyTemplate")?.toString() || "",
      password,
    });
    if (res.message !== "User registered successfully." || !res.proxyEmail) {
      return { success: false, message: "Signup failed: unexpected response." };
    }

    await setAuthCookie(SERVER_AUTH_TOKEN);
    await setUserIDCookie(userID);
    await setProxyEmailCookie(res.proxyEmail);

    return {
      success: true,
      userID,
      proxyEmail: res.proxyEmail,
      token: SERVER_AUTH_TOKEN,
    };
  } catch (error: any) {
    const msg = extractErrorMessage(error.message || error);
    return { success: false, message: msg };
  }
}

export async function logoutAction() {
  await removeAuthCookie();
  await removeUserIDCookie();
  await removeProxyEmailCookie();
  redirect("/login");
}

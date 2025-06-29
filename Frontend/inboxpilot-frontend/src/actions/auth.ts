"use server";

import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api";
import {
  setAuthCookie,
  setUserIDCookie,
  setProxyEmailCookie,
  removeAuthCookie,
} from "@/lib/auth.server";

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
      user: res.user,
      token: res.token,
    };
  } catch (error: any) {
    console.error("Login failed:", error);
    return {
      success: false,
      message: error.message || "Login failed due to an unexpected error.",
    };
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
      password,
    });
    if (!res.user?.userID || !res.token) {
      return { success: false, message: "Signup failed." };
    }
    await setAuthCookie(res.token);
    await setUserIDCookie(res.user.userID);
    await setProxyEmailCookie(res.user.proxyEmail);
    return {
      success: true,
      user: res.user,
      token: res.token,
    };
  } catch (error: any) {
    console.error("Signup failed:", error);
    return {
      success: false,
      message: error.message || "Signup failed due to an unexpected error.",
    };
  }
}

export async function logoutAction() {
  await removeAuthCookie();
  redirect("/login");
}

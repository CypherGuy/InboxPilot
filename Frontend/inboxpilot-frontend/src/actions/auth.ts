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
    // Call your /login Lambda; expect { message, token, user }
    const res = await apiRequest("/login", "POST", { userID, password });

    if (!res.user?.userID || !res.token) {
      return { success: false, message: "Invalid credentials." };
    }

    // Keep cookies for SSR if desired
    await setAuthCookie(res.token);
    await setUserIDCookie(res.user.userID);
    await setProxyEmailCookie(res.user.proxyEmail);

    // **Return the user and token** so the client can persist them
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

export async function logoutAction() {
  await removeAuthCookie();
  redirect("/login");
}

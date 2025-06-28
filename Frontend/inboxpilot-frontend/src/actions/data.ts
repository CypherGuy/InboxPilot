"use server";

import { apiRequest } from "@/lib/api";
import {
  getAuthCookie,
  getUserIDCookie,
  getProxyEmailCookie,
} from "@/lib/auth";
import { redirect } from "next/navigation";

// Email defined as in DynamoDB
interface Email {
  emailId: string;
  timestamp: string;
  body: string;
  fromEmail: string;
  sender: string;
  subject: string;
  toEmail: string;
  triage:
    | "Sales"
    | "Job"
    | "Spam"
    | "Other"
    | "Unknown"
    | "Flagged"
    | "Business Opportunity";
  userID: string;
}

export async function getEmailsAction(
  triageFilter?: string
): Promise<{ emails: Email[] }> {
  const token = await getAuthCookie();
  const proxyEmail = await getProxyEmailCookie();

  if (!token || !proxyEmail) {
    console.warn("Missing auth token or proxy email. Redirecting to login.");
    redirect("/login");
  }

  try {
    let endpoint = `/emails?toEmail=${encodeURIComponent(proxyEmail)}`;
    if (triageFilter && triageFilter !== "All Emails") {
      endpoint += `&triage=${triageFilter}`;
    }
    const data = await apiRequest(endpoint, "GET", undefined, token);

    if (!data || !Array.isArray(data.emails)) {
      throw new Error("Malformed response from API");
    }

    return { emails: data.emails };
  } catch (error: any) {
    console.error("Failed to fetch emails:", error.message || error);
    return { emails: [] };
  }
}

export async function getReplyTemplateAction(): Promise<{ reply: string }> {
  const token = getAuthCookie();
  const userID = getUserIDCookie();

  if (!token || !userID) {
    redirect("/login");
  }

  try {
    const data = await apiRequest(
      `/reply?userID=${userID}`,
      "GET",
      undefined,
      token
    );
    return { reply: data.reply || "I'll get back to you shortly." };
  } catch (error) {
    console.error("Failed to fetch reply template:", error);
    return { reply: "I'll get back to you shortly." };
  }
}

export async function updateReplyTemplateAction(
  newTemplate: string
): Promise<{ success: boolean; message: string }> {
  const token = getAuthCookie();
  const userID = getUserIDCookie();

  if (!token || !userID) {
    redirect("/login");
  }

  if (!newTemplate.trim()) {
    return { success: false, message: "Reply message cannot be empty." };
  }
  if (newTemplate.length > 500) {
    return {
      success: false,
      message: "Reply message cannot exceed 500 characters.",
    };
  }

  try {
    await apiRequest(
      "/update-reply",
      "POST",
      { userID, replyTemplate: newTemplate },
      token
    );
    return { success: true, message: "Reply message updated successfully!" };
  } catch (error: any) {
    console.error("Failed to update reply template:", error);
    return {
      success: false,
      message: error.message || "Failed to update reply message.",
    };
  }
}

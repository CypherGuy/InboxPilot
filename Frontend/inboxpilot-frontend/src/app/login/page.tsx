// src/app/login/page.tsx
"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.success) {
      // Store in localStorage for client-side use:
      if (typeof window !== "undefined") {
        sessionStorage.setItem("showLoginToast", "true");
        localStorage.setItem("inboxpilot_auth_token", result.token!);
        localStorage.setItem(
          "inboxpilot_user",
          JSON.stringify({
            userID: result.userID!,
            proxyEmail: result.proxyEmail!,
          })
        );
      }
      window.location.href = "/";
    } else {
      let errorMessage: string =
        result.message ?? "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(errorMessage);
        errorMessage = parsed.message || parsed.error || errorMessage;
      } catch {
        // ignore JSON errors
      }
      setError(errorMessage);
      toast.error("Login failed", {
        description: errorMessage,
      });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background font-sans antialiased">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-foreground">
            Login
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your username to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userID">Username - try "testinguser123"</Label>
              <Input
                id="userID"
                name="userID"
                type="text"
                placeholder="Username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password - try "testpassword"</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in…" : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign&nbsp;up
            </Link>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-6 text-center text-sm text-muted-foreground">
        © 2025 InboxPilot
      </footer>
    </div>
  );
}

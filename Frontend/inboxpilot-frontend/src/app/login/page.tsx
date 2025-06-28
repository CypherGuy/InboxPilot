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
      toast.success("Login successful", {
        description: "Redirecting to your dashboard...",
      });
      window.location.href = "/";
    } else {
      let errorMessage = result.message;
      try {
        const parsed = JSON.parse(result.message);
        errorMessage = parsed.message || errorMessage;
      } catch {}
      setError(errorMessage);
      toast.error("Login failed", {
        description: errorMessage,
      });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your username to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userID">Username</Label>
              <Input
                id="userID"
                name="userID"
                type="text"
                placeholder="Username"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
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
    </div>
  );
}

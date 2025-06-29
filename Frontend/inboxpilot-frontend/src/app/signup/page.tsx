"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { signupAction } from "@/actions/auth";
import { setLocalAuth } from "@/lib/auth.client";
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

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signupAction(formData);

    if (result.success && result.userID && result.proxyEmail && result.token) {
      // Store in localStorage for client-side use:
      setLocalAuth(result.token, result.userID, result.proxyEmail);

      toast.success("Signup successful", {
        description: "Redirecting to your dashboard...",
      });
      window.location.href = "/";
    } else {
      const msg = result.message ?? "Signup failed";
      setError(msg);
      toast.error("Signup failed", { description: msg });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription>Create your InboxPilot account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="userID">Username</Label>
              <Input
                id="userID"
                name="userID"
                type="text"
                placeholder="yourusername"
                required
              />
              <p className="text-xs text-gray-500">
                Your email will be <code>username@inboxpilot.xyz</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing up…" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

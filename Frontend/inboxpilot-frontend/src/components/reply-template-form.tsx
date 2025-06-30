"use client";

import type React from "react";

import { useState } from "react";
import { updateReplyTemplateAction } from "@/actions/data";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReplyTemplateFormProps {
  initialReplyTemplate: string;
}

export function ReplyTemplateForm({
  initialReplyTemplate,
}: ReplyTemplateFormProps) {
  const [replyTemplate, setReplyTemplate] = useState(initialReplyTemplate);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { success, message } = await updateReplyTemplateAction(
        replyTemplate
      );
      if (success) {
        toast("Success", {
          description: message,
        });
      } else {
        toast("Error saving reply template", {
          description: message,
        });
      }
    } catch (error: any) {
      toast("Error saving reply template", {
        description: error.message || "Failed to update reply message.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Default Reply Message</CardTitle>
        <CardDescription>
          Update your default reply message for Partnerships-related emails.
          Note that in order to use this feature, you must have a valid email
          address configured. This may take up to 24 hours to take effect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reply-template">Reply Message</Label>
            <Textarea
              id="reply-template"
              placeholder="Enter your default reply message"
              className="min-h-[100px]"
              value={replyTemplate}
              onChange={(e) => setReplyTemplate(e.target.value)}
            />
          </div>
          <Button type="submit" className="ml-auto" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

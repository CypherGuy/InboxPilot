"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Table, LayoutGrid } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = "grid" | "table";

export default function ViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Sync state from URL
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "table" || view === "grid") {
      setViewMode(view);
    }
  }, [searchParams]);

  const handleChange = (value: ViewMode) => {
    if (!value) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    router.push(`?${params.toString()}`);
    setViewMode(value);
  };

  return (
    <ToggleGroup type="single" value={viewMode} onValueChange={handleChange}>
      <ToggleGroupItem value="grid" aria-label="Grid View">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table View">
        <Table className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

"use client";

import { Table, LayoutGrid } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export type ViewMode = "grid" | "table";

export default function ViewToggle() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [value, setValue] = useState<ViewMode>("table");

  useEffect(() => {
    const current = searchParams.get("view");
    if (current === "grid" || current === "table") {
      setValue(current);
    } else {
      setValue("table");
    }
  }, [searchParams]);

  const handleChange = (val: string) => {
    if (val !== "grid" && val !== "table") return;

    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", val);
    router.replace(`?${newParams.toString()}`);
  };

  return (
    <ToggleGroup type="single" value={value} onValueChange={handleChange}>
      <ToggleGroupItem value="table" aria-label="Table View">
        <Table className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="grid" aria-label="Grid View">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

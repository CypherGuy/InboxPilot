"use client";

import { useEffect, useState } from "react";

export function RefreshIntervalForm() {
  const [value, setValue] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refreshInterval") || "15";
    }
    return "15";
  });

  useEffect(() => {
    localStorage.setItem("refreshInterval", value);
  }, [value]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium block">Auto Refresh Interval</label>
      <select
        className="rounded border px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        {["15", "30", "60", "120", "300", "600"].map((sec) => (
          <option key={sec} value={sec}>
            {Number(sec) < 60
              ? `${sec} seconds`
              : `${Number(sec) / 60} minute${Number(sec) >= 120 ? "s" : ""}`}
          </option>
        ))}
      </select>
    </div>
  );
}

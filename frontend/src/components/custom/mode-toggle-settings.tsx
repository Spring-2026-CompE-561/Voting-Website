"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

const THEME_OPTIONS = ["light", "dark", "system"] as const;

export function ModeToggleSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border p-2">
      {THEME_OPTIONS.map((option) => (
        <Button
          key={option}
          type="button"
          variant={theme === option ? "default" : "outline"}
          onClick={() => setTheme(option)}
          className="min-w-24"
        >
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </Button>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectTheme = (theme: "light" | "dark" | "system") => {
    setTheme(theme);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="icon"
        type="button"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-36 rounded-2xl border bg-popover p-1 text-popover-foreground shadow-lg">
          <button
            type="button"
            onClick={() => selectTheme("light")}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => selectTheme("dark")}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => selectTheme("system")}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
          >
            System
          </button>
        </div>
      ) : null}
    </div>
  );
}

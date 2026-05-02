"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "vodle-theme-change";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const resolvedTheme = theme === "system" ? resolveSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (
    storedTheme === "light" ||
    storedTheme === "dark" ||
    storedTheme === "system"
  ) {
    return storedTheme;
  }

  return "system";
}

function subscribeToThemeChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

export function ThemeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = useSyncExternalStore<Theme>(
    subscribeToThemeChanges,
    getStoredTheme,
    () => "system",
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => applyTheme("system");

    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

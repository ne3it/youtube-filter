"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setHydrated(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  if (!hydrated) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-accent" />
          <span className="text-sm font-semibold tracking-tight text-ink">
            YouTube Concept Filter
          </span>
        </div>
<nav className="flex items-center gap-1">
            <a
              href="/"
              className="hidden sm:inline-flex items-center justify-center gap-2 rounded-lg bg-transparent px-3 py-1.5 text-sm text-ink hover:bg-paper/60 transition-colors"
            >
              Analyze
            </a>
            <a
              href="/history"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-transparent px-3 py-1.5 text-sm text-ink hover:bg-paper/60 transition-colors"
            >
              History
            </a>
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-ink hover:bg-paper/60 transition-colors"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <a href="/">Analyze</a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="/history">History</a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
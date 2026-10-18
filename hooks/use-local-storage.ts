import { useState, useEffect } from "react";
import type { HistoryEntry } from "@/types";

const STORAGE_KEY = "youtube-filter-history";

export function useLocalStorage(key: string, initialValue: string) {
  const [storedValue, setStoredValue] = useState<string>(initialValue);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(item);
      }
    } catch {
      // ignore
    }
    setIsHydrated(true);
  }, [key]);

  const setValue = (value: string) => {
    setStoredValue(value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  };

  return { storedValue, setValue, isHydrated };
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[];
        setEntries(parsed);
      }
    } catch {
      // ignore
    }
    setIsHydrated(true);
  }, []);

  const addEntry = (entry: HistoryEntry) => {
    setEntries((prev) => {
      const next = [entry, ...prev];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const clear = () => {
    setEntries([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return { entries, addEntry, removeEntry, clear, isHydrated };
}
import { useState, useEffect } from "react";
import type { HistoryEntry } from "@/types";

const STORAGE_KEY = "youtube-filter-history";

/**
 * Кастомный хук для работы с localStorage на стороне клиента.
 *
 * @param key    — ключ в localStorage
 * @param initialValue — значение по умолчанию (используется при SSR и при отсутствии данных)
 * @returns кортеж [value, setValue], где setValue принимает значение или функцию-трансформатор
 *
 * Безопасен для SSR: при первом рендеринге на сервере window не доступен,
 * поэтому возвращается initialValue. После гидратации на клиенте данные загружаются из localStorage.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Инициализируем state значением по умолчанию — так безопасно для SSR
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // После монтирования на клиенте читаем из localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch (err) {
      console.warn(`Failed to read localStorage key "${key}":`, err);
    }
    setIsHydrated(true);
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    // Используем функциональное обновление состояния
    setStoredValue((prev) => {
      const nextValue = typeof value === "function" ? (value as (val: T) => T)(prev) : (value as T);

      try {
        window.localStorage.setItem(key, JSON.stringify(nextValue));
      } catch (err) {
        console.warn(`Failed to write localStorage key "${key}":`, err);
      }

      return nextValue;
    });
  };

  return [storedValue, setValue];
}

/**
 * Специализированный хук для работы с историей проверок.
 * Обеспечивает удобные методы добавления, удаления и очистки.
 */
export function useHistory() {
  const [entries, setEntries] = useLocalStorage<HistoryEntry[]>(STORAGE_KEY, []);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Отслеживаем гидратацию через useEffect, так как useLocalStorage не возвращает isHydrated
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const addEntry = (entry: HistoryEntry) => {
    setEntries((prev) => [entry, ...prev]);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const clear = () => {
    setEntries([]);
  };

  return { entries, addEntry, removeEntry, clear, isHydrated };
}
"use client";

import * as React from "react";

function getItemFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Like `useState`, but persists the value to `localStorage` so column
 * visibility / order survives page reloads.
 *
 * Reads storage only after mount so the first client render matches SSR.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const initialRef = React.useRef(initialValue);
  const [storedValue, setStoredValue] = React.useState<T>(initialValue);

  React.useEffect(() => {
    setStoredValue(getItemFromLocalStorage(key, initialRef.current));
  }, [key]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = React.useCallback(
    (value) => {
      setStoredValue((prev) => {
        const newValue =
          value instanceof Function ? (value as (prev: T) => T)(prev) : value;
        queueMicrotask(() => {
          try {
            window.localStorage.setItem(key, JSON.stringify(newValue));
          } catch {
            // ignore quota / unavailable storage errors
          }
        });
        return newValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

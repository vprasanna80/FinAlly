"use client";

import { useEffect, useRef, useState } from "react";

/** Returns a transient CSS class ("flash-up" | "flash-down") for ~500ms
 * whenever `price` changes, so callers can highlight the change. */
export function usePriceFlash(price: number | undefined): string {
  const [flashClass, setFlashClass] = useState("");
  const prevRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (price === undefined) return;
    const prev = prevRef.current;
    prevRef.current = price;
    if (prev === undefined || price === prev) return;

    setFlashClass(price > prev ? "flash-up" : "flash-down");
    const timer = setTimeout(() => setFlashClass(""), 500);
    return () => clearTimeout(timer);
  }, [price]);

  return flashClass;
}

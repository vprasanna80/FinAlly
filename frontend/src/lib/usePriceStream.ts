"use client";

import { useEffect, useState } from "react";
import type { PricePoint } from "./types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface HistoryPoint {
  time: string;
  price: number;
}

const MAX_HISTORY_POINTS = 180;

export function usePriceStream() {
  const [prices, setPrices] = useState<Record<string, PricePoint>>({});
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const source = new EventSource("/api/stream/prices");

    source.onopen = () => setStatus("connected");

    source.onmessage = (event: MessageEvent<string>) => {
      let data: { prices: PricePoint[] };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      setHistory((prev) => {
        const next = { ...prev };
        for (const point of data.prices) {
          const existing = next[point.ticker] ?? [];
          next[point.ticker] = [
            ...existing,
            { time: point.timestamp, price: point.price },
          ].slice(-MAX_HISTORY_POINTS);
        }
        return next;
      });

      setPrices((prev) => {
        const next = { ...prev };
        for (const point of data.prices) {
          next[point.ticker] = point;
        }
        return next;
      });
      setStatus("connected");
    };

    source.onerror = () => {
      setStatus(source.readyState === EventSource.CLOSED ? "disconnected" : "reconnecting");
    };

    return () => source.close();
  }, []);

  return { prices, history, status };
}

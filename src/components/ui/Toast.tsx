"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

type Tone = "ok" | "error";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Tone = "ok") => {
    const id = ++nextId;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="toast flex max-w-sm items-center gap-2.5 rounded-lg bg-ink px-3.5 py-2.5 text-sm text-bg shadow-lg"
          >
            <span className={cx("grid size-5 shrink-0 place-items-center rounded-full", t.tone === "error" ? "bg-neg" : "bg-accent")}>
              <Icon name={t.tone === "error" ? "alert" : "check"} className="size-3 text-bg" strokeWidth={2.5} />
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

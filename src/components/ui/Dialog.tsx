"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Native <dialog>: focus trap, Esc to close and inert background come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="dialog m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-[rgb(17_17_15/0.45)]"
    >
      {open && (
        <div className="p-5 sm:p-6">
          <h2 id={titleId} className="pr-8 text-base font-semibold">
            {title}
          </h2>
          {description && <div className="mt-1 text-sm text-ink-2">{description}</div>}
          <div className="mt-5">{children}</div>
          {/* Last in DOM order so the dialog focuses the first field, not this button. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-md p-1.5 text-ink-3 hover:bg-ink/5 hover:text-ink"
          >
            <Icon name="x" />
          </button>
        </div>
      )}
    </dialog>
  );
}

"use client";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";

/** Panneau qui monte du bas de l'écran, avec fond assombri. Échap ou un toucher à l'extérieur le ferme. */
export function Sheet({ open, onClose, title, children, tall = false }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; tall?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    panel.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/40" />
      <div ref={panel} tabIndex={-1} className={`absolute inset-x-0 bottom-0 mx-auto flex max-w-2xl animate-sheet-up flex-col rounded-t-[1.75rem] bg-surface shadow-lift outline-none ${tall ? "h-[88dvh]" : "max-h-[85dvh]"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <h2 className="font-reading text-xl font-semibold text-forest">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-bg"><Icon name="x" size={20} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

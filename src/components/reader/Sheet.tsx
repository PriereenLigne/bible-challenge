"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";

/** Hauteur cachée par le clavier du téléphone (iOS ne réduit pas la page quand le clavier s'ouvre). */
function useKeyboardInset(active: boolean): { inset: number; height: number | null } {
  const [s, setS] = useState<{ inset: number; height: number | null }>({ inset: 0, height: null });
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) return;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setS({ inset, height: Math.round(vv.height) });
    };
    update();
    vv.addEventListener("resize", update); vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); setS({ inset: 0, height: null }); };
  }, [active]);
  return s;
}

/**
 * Panneau qui monte du bas de l'écran, avec fond assombri. Échap ou un toucher à l'extérieur le ferme.
 * Rendu directement dans <body> : placé dans un en-tête « backdrop-blur », un élément `fixed` resterait
 * enfermé dans cet en-tête (c'était le bug de la recherche qui se confondait avec l'entête).
 */
export function Sheet({ open, onClose, title, children, tall = false }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; tall?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const kb = useKeyboardInset(open);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
    window.addEventListener("keydown", key);
    // ne jamais reprendre le focus à un champ déjà actif (sinon le clavier du téléphone se referme)
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  const maxH = kb.height ? `${Math.round(kb.height * (tall ? 0.94 : 0.9))}px` : undefined;
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/40" />
      <div ref={panel} tabIndex={-1} className={`absolute inset-x-0 bottom-0 mx-auto flex max-w-2xl animate-sheet-up flex-col rounded-t-[1.75rem] bg-surface shadow-lift outline-none ${tall ? "h-[88dvh]" : "max-h-[85dvh]"}`}
        style={{ paddingBottom: kb.inset ? 0 : "env(safe-area-inset-bottom)", bottom: kb.inset || undefined, ...(maxH ? (tall ? { height: `min(88dvh, ${maxH})` } : { maxHeight: `min(85dvh, ${maxH})` }) : {}) }}>
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <h2 className="font-reading text-xl font-semibold text-forest">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-bg"><Icon name="x" size={20} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

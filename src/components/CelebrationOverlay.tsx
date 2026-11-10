"use client";
import { useEffect, useMemo } from "react";
import { Icon } from "@/components/Icon";
import type { Celebration } from "@/lib/encourage/messages";

const COLORS = ["#E9D6A5", "#C9A961", "#5FBF8A", "#8CBEF0", "#F5AAC3", "#F8F6F0"];

/** Petite fête quand une journée est terminée : confettis (sauf si l'utilisateur limite les animations) et message. */
export function CelebrationOverlay({ c, onClose }: { c: Celebration; onClose: () => void }) {
  const pieces = useMemo(() => Array.from({ length: c.big ? 70 : 36 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 2.2 + Math.random() * 1.6, rot: Math.random() * 360,
    color: COLORS[i % COLORS.length] as string, w: 6 + Math.random() * 6, h: 10 + Math.random() * 8, drift: (Math.random() - 0.5) * 120,
  })), [c.big]);

  useEffect(() => {
    const t = setTimeout(onClose, c.big ? 7000 : 4500);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    try { navigator.vibrate?.(c.big ? [30, 60, 30] : 25); } catch { /* vibration indisponible */ }
    return () => { clearTimeout(t); window.removeEventListener("keydown", key); };
  }, [c.big, onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={c.title} onClick={onClose}>
      <div className="absolute inset-0 animate-fade-in bg-black/35" />
      <div aria-hidden="true" className="confetti pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p, i) => (
          <span key={i} style={{ left: `${p.left}%`, width: p.w, height: p.h, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ["--rot" as string]: `${p.rot}deg`, ["--drift" as string]: `${p.drift}px` }} />
        ))}
      </div>
      <div className="hero relative w-full max-w-sm animate-pop text-center" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sand to-gold text-forest shadow-lift"><Icon name={c.big ? "trophy" : "check"} size={30} strokeWidth={2.2} /></span>
        <h2 className="mt-4 font-reading text-2xl font-semibold">{c.title}</h2>
        <p className="mt-2 muted">{c.message}</p>
        <button type="button" onClick={onClose} className="btn-sand mt-5 w-full" autoFocus>Amen !</button>
      </div>
    </div>
  );
}

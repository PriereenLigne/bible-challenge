"use client";
import { Icon } from "@/components/Icon";
import { COLOR_LABEL, MARK_COLORS, type MarkColor } from "@/lib/marks/types";

const SWATCH: Record<MarkColor, string> = { jaune: "#FADE6E", vert: "#8CD2A0", bleu: "#8CBEF0", rose: "#F5AAC3", orange: "#FAB46E" };

/** Panneau d'actions sur un verset sélectionné : favori, surlignage, copier, partager. */
export function VerseSheet({ label, favorite, color, message, onFavorite, onColor, onCopy, onShare, onClose }: {
  label: string; favorite: boolean; color: MarkColor | null; message: string | null;
  onFavorite: () => void; onColor: (c: MarkColor | null) => void; onCopy: () => void; onShare: () => void; onClose: () => void;
}) {
  return (
    <div role="dialog" aria-label={`Actions sur ${label}`} className="fixed inset-x-3 z-50 mx-auto max-w-md animate-fade-up rounded-3xl border border-line bg-surface p-4 shadow-lift" style={{ bottom: "calc(env(safe-area-inset-bottom) + 92px)" }}>
      <div className="flex items-center justify-between">
        <p className="font-reading text-lg font-semibold">{label}</p>
        <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-bg"><Icon name="x" size={20} /></button>
      </div>
      <div className="mt-2 flex items-center gap-2" role="group" aria-label="Surligner">
        {MARK_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onColor(color === c ? null : c)} aria-pressed={color === c} aria-label={`Surligner en ${COLOR_LABEL[c].toLowerCase()}`}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition active:scale-90 ${color === c ? "border-ink" : "border-transparent"}`} style={{ background: SWATCH[c] }}>
            {color === c && <Icon name="check" size={18} strokeWidth={2.6} className="text-[#173F35]" />}
          </button>
        ))}
        {color && <button type="button" onClick={() => onColor(null)} className="ml-1 min-h-11 rounded-full px-3 text-sm text-muted underline">Retirer</button>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={onFavorite} aria-pressed={favorite} className={`btn-ghost min-h-12 flex-col gap-0.5 px-2 text-xs ${favorite ? "!border-rose-300 !bg-rose-50 !text-rose-600" : ""}`}><Icon name="heart" size={20} filled={favorite} />{favorite ? "Favori" : "Favori"}</button>
        <button type="button" onClick={onCopy} className="btn-ghost min-h-12 flex-col gap-0.5 px-2 text-xs"><Icon name="copy" size={20} />Copier</button>
        <button type="button" onClick={onShare} className="btn-ghost min-h-12 flex-col gap-0.5 px-2 text-xs"><Icon name="share" size={20} />Partager</button>
      </div>
      {message && <p role="status" className="mt-2 text-center text-xs text-calm">{message}</p>}
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { BOOK_BY_ID, PROTESTANT_CANON } from "@/lib/bible/canon";
import { fold } from "@/lib/reader/prefs";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/reader/Sheet";

interface Pos { book: string; chapter: number }

/** Choix du passage en deux touchers : le livre, puis le chapitre. Recherche sans accents. */
export function PassagePicker({ open, onClose, current, onPick }: {
  open: boolean; onClose: () => void; current: Pos; onPick: (p: Pos) => void;
}) {
  const curDef = BOOK_BY_ID.get(current.book);
  const [tab, setTab] = useState<"AT" | "NT">(curDef?.testament === "NT" ? "NT" : "AT");
  const [book, setBook] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => { if (open) { setBook(null); setQ(""); setTab(BOOK_BY_ID.get(current.book)?.testament === "NT" ? "NT" : "AT"); } }, [open, current.book]);

  const list = useMemo(() => {
    const f = fold(q);
    return f ? PROTESTANT_CANON.filter((b) => fold(b.name).includes(f)) : PROTESTANT_CANON.filter((b) => b.testament === tab);
  }, [q, tab]);

  function chooseBook(id: string) {
    const def = BOOK_BY_ID.get(id); if (!def) return;
    if (def.chapters === 1) { onPick({ book: id, chapter: 1 }); onClose(); return; }
    setBook(id);
  }
  const sel = book ? BOOK_BY_ID.get(book) : null;

  return (
    <Sheet open={open} onClose={onClose} title={sel ? sel.name : "Choisir un passage"} tall>
      {sel ? (
        <div>
          <button type="button" onClick={() => setBook(null)} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-calm"><Icon name="chevron-left" size={18} />Tous les livres</button>
          <p className="eyebrow mb-2">Chapitre</p>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {Array.from({ length: sel.chapters }, (_, i) => i + 1).map((c) => {
              const here = sel.id === current.book && c === current.chapter;
              return (
                <button key={c} type="button" aria-current={here ? "true" : undefined} onClick={() => { onPick({ book: sel.id, chapter: c }); onClose(); }}
                  className={`aspect-square rounded-2xl text-base font-medium transition active:scale-95 ${here ? "bg-forest text-bg" : "bg-bg hover:bg-sand/40"}`}>{c}</button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <label className="relative mt-1 block">
            <span className="sr-only">Rechercher un livre</span>
            <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un livre…" autoComplete="off"
              className="min-h-12 w-full rounded-2xl border border-line bg-bg pl-10 pr-3 text-base" />
          </label>
          {!q && (
            <div role="tablist" aria-label="Testament" className="mt-3 flex rounded-2xl border border-line bg-bg p-1">
              {(["AT", "NT"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`min-h-11 flex-1 rounded-xl text-sm font-medium transition ${tab === t ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
                  {t === "AT" ? "Ancien Testament" : "Nouveau Testament"}
                </button>
              ))}
            </div>
          )}
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {list.map((b) => {
              const here = b.id === current.book;
              return (
                <li key={b.id}>
                  <button type="button" onClick={() => chooseBook(b.id)} aria-current={here ? "true" : undefined}
                    className={`flex min-h-12 w-full items-center justify-between rounded-2xl px-3.5 text-left transition active:scale-[.98] ${here ? "bg-forest/10 font-semibold text-forest ring-1 ring-forest/30" : "bg-bg hover:bg-sand/30"}`}>
                    <span className="truncate">{b.name}</span><span className="ml-2 shrink-0 text-xs text-muted">{b.chapters}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {list.length === 0 && <p className="mt-6 text-center text-sm text-muted">Aucun livre ne correspond à « {q} ».</p>}
        </div>
      )}
    </Sheet>
  );
}

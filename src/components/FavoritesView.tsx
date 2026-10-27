"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { BOOK_BY_ID, PROTESTANT_CANON } from "@/lib/bible/canon";
import { readerHref } from "@/lib/bible/params";
import { loadBook, loadVersions, type BibleVersion, type BookText } from "@/lib/bible/store";
import { setMark } from "@/lib/marks/client";
import { COLOR_LABEL, MARK_COLORS, isActive, type LocalMark, type MarkColor } from "@/lib/marks/types";
import { marksStore } from "@/lib/offline/local-db";
import { runSync } from "@/lib/offline/mark-read";

const idx = (b: string) => PROTESTANT_CANON.findIndex((x) => x.id === b);
const DOT: Record<MarkColor, string> = { jaune: "#FADE6E", vert: "#8CD2A0", bleu: "#8CBEF0", rose: "#F5AAC3", orange: "#FAB46E" };

export function FavoritesView() {
  const [marks, setMarks] = useState<LocalMark[] | null>(null);
  const [version, setVersion] = useState<BibleVersion | null>(null);
  const [texts, setTexts] = useState<Map<string, BookText>>(new Map());
  const [tab, setTab] = useState<"fav" | "hl">("fav");
  const [color, setColor] = useState<MarkColor | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(new Set<string>());

  const load = useCallback(async () => {
    const all = (await marksStore.all()).filter(isActive).sort((a, b) => idx(a.book) - idx(b.book) || a.chapter - b.chapter || a.verse - b.verse);
    setMarks(all);
  }, []);
  useEffect(() => {
    (async () => {
      try { await load(); setVersion((await loadVersions())[0] ?? null); await runSync(); await load(); }
      catch (e) { setError(`Lecture des versets marqués : ${(e as Error).message}`); }
    })();
  }, [load]);

  const shown = useMemo(() => (marks ?? []).filter((m) => (tab === "fav" ? m.favorite : m.color !== null && (color === "all" || m.color === color))), [marks, tab, color]);
  const needed = useMemo(() => [...new Set(shown.map((m) => m.book))], [shown]);
  useEffect(() => {
    if (!version) return;
    let active = true;
    (async () => {
      for (const b of needed) {
        if (requested.current.has(b)) continue;
        requested.current.add(b);
        try { const t = await loadBook(version, b); if (active) setTexts((p) => new Map(p).set(b, t)); }
        catch (e) { requested.current.delete(b); console.warn(`Texte de ${b} indisponible (hors connexion sans téléchargement ?)`, e); }
      }
    })();
    return () => { active = false; };
  }, [version, needed]);

  const verseText = (m: LocalMark) => texts.get(m.book)?.chapters.find((c) => c.c === m.chapter)?.v.find(([n]) => n === m.verse)?.[1] ?? null;
  async function remove(m: LocalMark) {
    try { await setMark(m.book, m.chapter, m.verse, tab === "fav" ? { favorite: false } : { color: null }); await load(); void runSync(); }
    catch (e) { setError(`Impossible de modifier : ${(e as Error).message}`); }
  }

  const favCount = (marks ?? []).filter((m) => m.favorite).length, hlCount = (marks ?? []).filter((m) => m.color).length;
  return (
    <div className="space-y-4">
      <div role="tablist" className="flex rounded-2xl border border-line bg-bg p-1">
        {([["fav", "Favoris", favCount, "heart"], ["hl", "Surlignés", hlCount, "highlighter"]] as const).map(([k, l, n, icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition ${tab === k ? "bg-surface shadow-card" : "text-muted"}`}>
            <Icon name={icon} size={16} filled={k === "fav" && tab === k} />{l} <span className="text-muted">({n})</span>
          </button>
        ))}
      </div>
      {tab === "hl" && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          <button type="button" onClick={() => setColor("all")} className={`chip min-h-11 ${color === "all" ? "!border-transparent bg-forest text-bg" : ""}`}>Toutes</button>
          {MARK_COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} className={`chip min-h-11 ${color === c ? "!border-ink" : ""}`}><span className="h-3.5 w-3.5 rounded-full" style={{ background: DOT[c] }} />{COLOR_LABEL[c]}</button>)}
        </div>
      )}
      {marks === null ? <p className="text-sm text-muted">Chargement…</p> : shown.length === 0 ? (
        <section className="card text-center"><Icon name={tab === "fav" ? "heart" : "highlighter"} size={32} className="mx-auto text-gold" /><p className="mt-2 font-medium">{tab === "fav" ? "Aucun favori pour l’instant" : "Aucun verset surligné"}</p><p className="mt-1 text-sm text-muted">Dans le lecteur, touchez un verset pour le marquer.</p><Link href="/lire" className="btn-ghost mt-3">Ouvrir le lecteur</Link></section>
      ) : (
        <ul className="stagger space-y-3">
          {shown.map((m) => {
            const t = verseText(m);
            return (
              <li key={m.key} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-medium">{m.color && <span className="h-3.5 w-3.5 rounded-full" style={{ background: DOT[m.color] }} />}{BOOK_BY_ID.get(m.book)?.name} {m.chapter}:{m.verse}{m.favorite && tab === "hl" && <Icon name="heart" size={14} filled className="text-rose-500" />}</h2>
                </div>
                {t ? <p className={`mt-2 rounded-xl px-2 py-1.5 font-reading text-lg leading-relaxed ${tab === "hl" && m.color ? `hl-${m.color}` : ""}`}>{t}</p> : <p className="mt-2 text-sm text-muted">Texte indisponible hors connexion : téléchargez la traduction dans l’onglet Lire.</p>}
                <div className="mt-2 flex gap-2">
                  <Link href={readerHref(m.book, m.chapter, undefined, m.verse)} className="btn-ghost min-h-11 px-4 text-sm">Ouvrir</Link>
                  <button type="button" onClick={() => void remove(m)} className="btn-ghost min-h-11 px-4 text-sm">Retirer</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p role="alert" className="text-sm text-calm">{error}</p>}
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { readerHref } from "@/lib/bible/params";
import { BOOK_BY_ID } from "@/lib/bible/canon";
import { formatReference, parseReference, type VerseRef } from "@/lib/bible/reference";
import { highlight, tokenize, type BibleIndex, type SearchHit } from "@/lib/bible/search";
import { loadSearchIndex } from "@/lib/bible/search-index";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/reader/Sheet";

const EXAMPLES = ["Jean 3:16", "Ps 23", "l’Éternel est mon berger", "Dieu a tant aimé le monde", "Rm 8 28"];

/**
 * Bouton loupe, présent sur toutes les pages. On tape une référence (« Jean 3:16 », « Jn3 16 »)
 * ou des mots, même approximatifs (« leternel et mon berge »), et le passage s'ouvre dans la lecture.
 * Dans le lecteur, `onOpen` ouvre le passage sur place (sans recharger la page).
 */
export function VerseSearch({ onOpen, className = "ml-auto" }: { onOpen?: (r: VerseRef) => void; className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useMemo(() => parseReference(q), [q]);
  const [index, setIndex] = useState<BibleIndex | null>(null);
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  function show() {
    // ouverture synchrone puis focus dans le même geste : sans cela, iPhone et Android n'ouvrent pas le clavier
    flushSync(() => setOpen(true));
    input.current?.focus();
  }
  function hide() { setOpen(false); setQ(""); setHits(null); }

  // chargement de la Bible entière pour la recherche par mots, dès l'ouverture
  useEffect(() => {
    if (!open || index) return;
    let alive = true;
    setLoadError(null);
    loadSearchIndex((done, total) => { if (alive) setLoading({ done, total }); })
      .then((i) => { if (alive) { setIndex(i); setLoading(null); } })
      .catch((e: Error) => { if (alive) { setLoadError(e.message); setLoading(null); } });
    return () => { alive = false; };
  }, [open, index]);

  // recherche par mots, un court instant après la dernière frappe
  const words = tokenize(q).filter((t) => /[a-z]/.test(t));
  const wantsText = !ref && words.join("").length >= 3;
  useEffect(() => {
    if (!index || !wantsText) { setHits(null); return; }
    const t = setTimeout(() => setHits(index.search(q, 30)), 160);
    return () => clearTimeout(t);
  }, [q, index, wantsText]);

  function go(r: VerseRef | null) {
    if (!r) return;
    hide();
    if (onOpen) { onOpen(r); return; }
    router.push(readerHref(r.book, r.chapter, undefined, r.verse ?? undefined));
  }
  const goHit = (h: SearchHit) => go({ book: h.book, chapter: h.chapter, verse: h.verse, verseEnd: null });

  return (
    <>
      <button type="button" onClick={show} aria-label="Rechercher un verset" aria-haspopup="dialog"
        className={`${className} flex h-11 w-11 items-center justify-center rounded-full text-ink/80 transition hover:bg-surface active:scale-95`}>
        <Icon name="search" size={21} />
      </button>
      <Sheet open={open} onClose={hide} title="Rechercher un verset" tall={!!q.trim()}>
        <form role="search" onSubmit={(e) => { e.preventDefault(); if (ref) go(ref); else if (hits?.[0]) goHit(hits[0]); else input.current?.blur(); }}>
          <label className="relative mt-1 block">
            <span className="sr-only">Référence ou mots du verset</span>
            <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input ref={input} type="search" inputMode="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jean 3:16 ou quelques mots du verset"
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search"
              className="min-h-12 w-full rounded-2xl border border-line bg-bg pl-10 pr-3 text-base" />
          </label>
        </form>

        {ref && (
          <button type="button" onClick={() => go(ref)}
            className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-forest px-4 text-left text-bg transition active:scale-[.98]">
            <span><span className="block text-xs opacity-80">Ouvrir le passage</span><span className="block font-reading text-lg font-semibold">{formatReference(ref)}</span></span>
            <Icon name="chevron-right" size={22} className="shrink-0" />
          </button>
        )}

        {!q.trim() && (
          <>
            <p className="mt-3 text-sm text-muted">Tapez une référence, ou les mots dont vous vous souvenez, même approximatifs et sans accents.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => { setQ(ex); input.current?.focus(); }} className="min-h-10 rounded-full bg-bg px-3.5 text-sm font-medium ring-1 ring-line transition hover:bg-sand/30">{ex}</button>
              ))}
            </div>
          </>
        )}

        {wantsText && !index && (
          <p className="mt-4 text-sm text-muted" role="status">
            {loadError ? `Recherche par mots indisponible : ${loadError}` : `Préparation de la recherche… ${loading ? Math.round((loading.done / loading.total) * 100) : 0} %`}
          </p>
        )}

        {hits && hits.length > 0 && (
          <ul className="mt-4 space-y-2" aria-label="Versets trouvés">
            {hits.map((h) => (
              <li key={`${h.book}${h.chapter}:${h.verse}`}>
                <button type="button" onClick={() => goHit(h)} className="w-full rounded-2xl bg-bg px-4 py-3 text-left ring-1 ring-line transition hover:bg-sand/20 active:scale-[.99]">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-gold">{BOOK_BY_ID.get(h.book)?.name} {h.chapter}:{h.verse}</span>
                  <span className="mt-0.5 block font-reading text-[1.05rem] leading-snug text-ink">
                    {highlight(h.text, h.terms).map((p, i) => p.hit ? <mark key={i} className="rounded bg-sand/60 px-0.5 text-ink">{p.t}</mark> : <span key={i}>{p.t}</span>)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {hits && hits.length === 0 && !ref && (
          <p className="mt-4 text-sm text-muted">Aucun verset trouvé. Essayez avec d’autres mots, ou une référence comme « Jean 3:16 ».</p>
        )}
      </Sheet>
    </>
  );
}

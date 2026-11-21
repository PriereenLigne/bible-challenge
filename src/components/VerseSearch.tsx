"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { readerHref } from "@/lib/bible/params";
import { formatReference, parseReference } from "@/lib/bible/reference";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/reader/Sheet";

const EXAMPLES = ["Jean 3:16", "Ps 23", "Rm 8 28", "1Co13", "Jr 29.11"];

/** Bouton loupe de l'en-tête : on tape « Jean 3:16 », « Jn3 16 »… et le passage s'ouvre dans la lecture. */
export function VerseSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useMemo(() => parseReference(q), [q]);

  function go(text = q) {
    const r = parseReference(text); if (!r) return;
    setOpen(false); setQ("");
    router.push(readerHref(r.book, r.chapter, undefined, r.verse ?? undefined));
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Rechercher un verset" aria-haspopup="dialog"
        className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-ink/80 transition hover:bg-surface active:scale-95">
        <Icon name="search" size={21} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Rechercher un verset">
        <form role="search" onSubmit={(e) => { e.preventDefault(); go(); }}>
          <label className="relative mt-1 block">
            <span className="sr-only">Référence du verset</span>
            <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. : Jean 3:16" autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="go"
              className="min-h-12 w-full rounded-2xl border border-line bg-bg pl-10 pr-3 text-base" />
          </label>
        </form>
        {ref ? (
          <button type="button" onClick={() => go()}
            className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-forest px-4 text-left text-bg transition active:scale-[.98]">
            <span><span className="block text-xs opacity-80">Ouvrir le passage</span><span className="block font-reading text-lg font-semibold">{formatReference(ref)}</span></span>
            <Icon name="chevron-right" size={22} className="shrink-0" />
          </button>
        ) : q.trim() ? (
          <p className="mt-3 text-sm text-muted">Écrivez le livre puis le chapitre, et si vous voulez le verset : « Jean 3:16 », « Jn 3 16 ».</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => go(ex)} className="min-h-10 rounded-full bg-bg px-3.5 text-sm font-medium ring-1 ring-line transition hover:bg-sand/30">{ex}</button>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}

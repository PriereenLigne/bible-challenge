"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { BOOK_BY_ID } from "@/lib/bible/canon";
import { readerHref } from "@/lib/bible/params";
import { loadBook, loadVersions } from "@/lib/bible/store";
import { localToday } from "@/lib/challenges/active";
import { LEGAL } from "@/lib/legal";
import { shareVerseImage } from "@/lib/share/verse-image";
import { refLabel, verseOfDay } from "@/lib/verses/daily";

/** Carte « Verset du jour » : même verset pour tous, à lire ou à partager en image. */
export function VerseOfDay() {
  const ref = useMemo(() => verseOfDay(localToday()), []);
  const [text, setText] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const label = refLabel(ref, BOOK_BY_ID.get(ref.book)?.name ?? ref.book);

  useEffect(() => {
    let active = true;
    (async () => {
      const v = (await loadVersions())[0]; if (!v) return;
      const book = await loadBook(v, ref.book);
      const ch = book.chapters.find((c) => c.c === ref.chapter);
      const parts = ch?.v.filter(([n]) => n >= ref.verse && n <= (ref.to ?? ref.verse)).map(([, t]) => t) ?? [];
      if (active && parts.length) { setText(parts.join(" ")); setVersion(v.name); }
    })().catch((e) => console.error("Verset du jour :", e));
    return () => { active = false; };
  }, [ref]);

  async function share() {
    if (!text) return;
    setBusy(true); setMsg(null);
    try {
      const r = await shareVerseImage({ text, reference: label, version, footer: `Bible Challenge · ${LEGAL.organisation}` });
      if (r === "downloaded") setMsg("Image enregistrée : vous pouvez la partager depuis votre galerie.");
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!text) return null;
  return (
    <section className="card relative overflow-hidden" aria-label="Verset du jour">
      <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-6 font-reading text-[7rem] leading-none text-gold/20">“</span>
      <p className="eyebrow flex items-center gap-1.5"><Icon name="star" size={13} className="text-gold" />Verset du jour</p>
      <blockquote className="mt-3 font-reading text-[1.15rem] leading-relaxed">{text}</blockquote>
      <p className="mt-2 font-reading font-semibold text-forest">{label}</p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => void share()} disabled={busy} className="btn-ghost min-h-11 flex-1 gap-2 px-3 text-sm"><Icon name="share" size={17} />{busy ? "Préparation…" : "Partager"}</button>
        <Link href={readerHref(ref.book, ref.chapter, undefined, ref.verse)} className="btn-ghost min-h-11 flex-1 gap-2 px-3 text-sm"><Icon name="book" size={17} />Lire le passage</Link>
      </div>
      {msg && <p role="status" className="mt-2 text-center text-xs text-calm">{msg}</p>}
    </section>
  );
}

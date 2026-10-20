"use client";
import { useEffect, useMemo, useState } from "react";
import { BOOK_BY_ID, PROTESTANT_CANON } from "@/lib/bible/canon";
import { kv } from "@/lib/offline/local-db";
import { loadBook, loadVersions, type BibleVersion, type BookText } from "@/lib/bible/store";
import { DownloadPanel } from "@/components/DownloadPanel";
import { Notice } from "@/components/Notice";

interface Pos { book: string; chapter: number }
const sel = "min-h-12 rounded-xl border border-line bg-surface px-3";

function step(p: Pos, dir: 1 | -1): Pos | null {
  const b = BOOK_BY_ID.get(p.book); if (!b) return null;
  const c = p.chapter + dir;
  if (c >= 1 && c <= b.chapters) return { book: p.book, chapter: c };
  const i = PROTESTANT_CANON.findIndex((x) => x.id === p.book) + dir;
  const nb = PROTESTANT_CANON[i];
  return nb ? { book: nb.id, chapter: dir === 1 ? 1 : nb.chapters } : null;
}

export function BibleReader() {
  const [versions, setVersions] = useState<BibleVersion[] | null>(null);
  const [vid, setVid] = useState<string>("");
  const [pos, setPos] = useState<Pos>({ book: "JHN", chapter: 1 });
  const [text, setText] = useState<BookText | null>(null);
  const [size, setSize] = useState(19);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersions().then(async (list) => {
      setVersions(list);
      const last = await kv.get<{ vid: string; pos: Pos; size: number }>("reader:last").catch(() => undefined);
      setVid(last && list.some((v) => v.id === last.vid) ? last.vid : list[0]?.id ?? "");
      if (last?.pos) setPos(last.pos);
      if (last?.size) setSize(last.size);
    });
  }, []);
  useEffect(() => { if (vid) void kv.set("reader:last", { vid, pos, size }).catch((e) => console.error("Position non mémorisée :", e)); }, [vid, pos, size]);

  const version = useMemo(() => versions?.find((v) => v.id === vid) ?? null, [versions, vid]);
  useEffect(() => {
    if (!version) return;
    let active = true; setError(null);
    if (text?.id === pos.book) return;
    loadBook(version, pos.book).then((t) => { if (active) setText(t); }).catch((e) => { if (active) { setText(null); setError((e as Error).message); } });
    return () => { active = false; };
  }, [version, pos.book, text?.id]);

  if (versions === null) return <p className="text-sm text-muted">Chargement…</p>;
  if (!version) return <Notice title="Aucun texte biblique installé"><p>Aucune traduction dont la licence autorise la reproduction n’est installée pour l’instant.</p></Notice>;

  const def = BOOK_BY_ID.get(pos.book);
  const chapter = text?.id === pos.book ? text.chapters.find((c) => c.c === pos.chapter) : undefined;
  const prev = step(pos, -1), next = step(pos, 1);
  const nav = "min-h-12 min-w-12 rounded-xl border border-line px-4 disabled:opacity-40";

  return (
    <div className="space-y-5">
      {version.isTestData && <p role="alert" className="rounded-xl bg-sand/40 p-3 text-sm">DONNÉES DE TEST : ce n’est pas une véritable traduction biblique.</p>}
      <div className="flex flex-wrap gap-2">
        <select aria-label="Livre" className={sel} value={pos.book} onChange={(e) => setPos({ book: e.target.value, chapter: 1 })}>
          <optgroup label="Ancien Testament">{PROTESTANT_CANON.filter((b) => b.testament === "AT").map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
          <optgroup label="Nouveau Testament">{PROTESTANT_CANON.filter((b) => b.testament === "NT").map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
        </select>
        <select aria-label="Chapitre" className={sel} value={pos.chapter} onChange={(e) => setPos({ ...pos, chapter: Number(e.target.value) })}>
          {Array.from({ length: def?.chapters ?? 1 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
        <button type="button" className={nav} aria-label="Plus petit" onClick={() => setSize((s) => Math.max(15, s - 2))}>A−</button>
        <button type="button" className={nav} aria-label="Plus grand" onClick={() => setSize((s) => Math.min(30, s + 2))}>A+</button>
      </div>

      <article lang={version.language} className="font-reading leading-relaxed" style={{ fontSize: size }}>
        <h1 className="mb-3 text-2xl font-semibold text-forest">{def?.name} {pos.chapter}</h1>
        {error && <p role="alert" className="text-calm">{error}</p>}
        {!error && !chapter && <p className="text-muted">Chargement…</p>}
        {chapter?.t && <p className="mb-2 italic text-muted">{chapter.t}</p>}
        {chapter && <p>{chapter.v.map(([n, t]) => <span key={n}><sup className="mr-1 text-[0.6em] text-muted">{n}</sup>{t} </span>)}</p>}
      </article>

      <div className="flex justify-between">
        <button type="button" className={nav} disabled={!prev} onClick={() => prev && setPos(prev)}>← Précédent</button>
        <button type="button" className={nav} disabled={!next} onClick={() => next && setPos(next)}>Suivant →</button>
      </div>
      <p className="text-xs text-muted">{version.name} · {version.attribution}</p>
      <DownloadPanel version={version} />
    </div>
  );
}

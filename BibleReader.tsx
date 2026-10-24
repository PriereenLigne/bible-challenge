"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOOK_BY_ID, PROTESTANT_CANON } from "@/lib/bible/canon";
import { kv, marksStore, readsStore } from "@/lib/offline/local-db";
import { markChapterRead, runSync } from "@/lib/offline/mark-read";
import { setMark } from "@/lib/marks/client";
import { isActive, type LocalMark, type MarkColor } from "@/lib/marks/types";
import { parseReaderParams } from "@/lib/bible/params";
import { loadBook, loadVersions, type BibleVersion, type BookText } from "@/lib/bible/store";
import { localToday, type ChallengeLite } from "@/lib/challenges/active";
import { AudioPlayer } from "@/components/AudioPlayer";
import { DownloadPanel } from "@/components/DownloadPanel";
import { Icon } from "@/components/Icon";
import { NoteBlock } from "@/components/NoteBlock";
import { Notice } from "@/components/Notice";
import { VerseSheet } from "@/components/VerseSheet";

interface Pos { book: string; chapter: number }
const sel = "min-h-12 rounded-2xl border border-line bg-bg px-3 font-medium";

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
  const [challenge, setChallenge] = useState<ChallengeLite | null>(null);
  const [alreadyRead, setAlreadyRead] = useState(false);
  const [markMsg, setMarkMsg] = useState<string | null>(null);
  const [marks, setMarks] = useState<Map<number, LocalMark>>(new Map());
  const [selected, setSelected] = useState<number | null>(null);
  const [jump, setJump] = useState<number | null>(null);
  const [sheetMsg, setSheetMsg] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const posRef = useRef(pos); posRef.current = pos;

  useEffect(() => {
    loadVersions().then(async (list) => {
      setVersions(list);
      const last = await kv.get<{ vid: string; pos: Pos; size: number }>("reader:last").catch(() => undefined);
      setVid(last && list.some((v) => v.id === last.vid) ? last.vid : list[0]?.id ?? "");
      if (last?.pos) setPos(last.pos);
      if (last?.size) setSize(last.size);
      const q = parseReaderParams(window.location.search); // ouverture depuis la lecture du jour ou les favoris
      if (q) {
        setPos({ book: q.book, chapter: q.chapter });
        if (q.verse) setJump(q.verse);
        if (q.challengeId) setChallenge((await kv.get<ChallengeLite>(`challenge:${q.challengeId}`).catch(() => undefined)) ?? null);
      }
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
  const chapter = useMemo(() => (text?.id === pos.book ? text.chapters.find((c) => c.c === pos.chapter) : undefined), [text, pos]);

  // favoris et surlignages du chapitre (locaux), puis fusion avec le serveur
  const reloadMarks = useCallback(async (book: string, ch: number) => {
    const ms = await marksStore.forChapter(book, ch);
    setMarks(new Map(ms.filter(isActive).map((m) => [m.verse, m])));
  }, []);
  useEffect(() => { setSelected(null); setSheetMsg(null); reloadMarks(pos.book, pos.chapter).catch((e) => console.error("Marques :", e)); }, [pos.book, pos.chapter, reloadMarks]);
  useEffect(() => { void runSync().then(() => reloadMarks(posRef.current.book, posRef.current.chapter)).catch((e) => console.error("Synchronisation :", e)); }, [reloadMarks]);
  useEffect(() => {
    if (jump === null || !chapter) return;
    setSelected(jump); setJump(null);
    requestAnimationFrame(() => document.getElementById(`v-${jump}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [jump, chapter]);

  useEffect(() => { if (speaking !== null) document.getElementById(`v-${speaking}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [speaking]);
  const goNext = useCallback(() => { const n = step(posRef.current, 1); if (n) setPos(n); return n !== null; }, []);
  const goPrev = useCallback(() => { const n = step(posRef.current, -1); if (n) setPos(n); return n !== null; }, []);

  const cBook = challenge?.book_ids.includes(pos.book) ?? false;
  const cId = challenge?.id;
  useEffect(() => {
    setMarkMsg(null);
    if (!cId) { setAlreadyRead(false); return; }
    readsStore.forChallenge(cId).then((rs) => setAlreadyRead(rs.some((r) => r.book === pos.book && r.chapter === pos.chapter))).catch((e) => console.error("Lecture locale :", e));
  }, [cId, pos.book, pos.chapter]);

  async function markRead() {
    if (!challenge) return;
    try {
      await markChapterRead(challenge.id, pos.book, pos.chapter, localToday());
      setAlreadyRead(true);
      const pending = await runSync();
      setMarkMsg(pending > 0 ? "Enregistré sur l’appareil. Il sera envoyé dès que la connexion revient." : "Enregistré et synchronisé.");
    } catch (e) { setMarkMsg(`Impossible d’enregistrer : ${(e as Error).message}`); }
  }

  async function applyMark(verse: number, patch: { favorite?: boolean; color?: MarkColor | null }) {
    try {
      const m = await setMark(pos.book, pos.chapter, verse, patch);
      setMarks((prev) => { const n = new Map(prev); if (isActive(m)) n.set(verse, m); else n.delete(verse); return n; });
      setSheetMsg(null);
      void runSync();
    } catch (e) { setSheetMsg(`Impossible d’enregistrer : ${(e as Error).message}`); }
  }
  const quote = (n: number) => `« ${chapter?.v.find(([k]) => k === n)?.[1] ?? ""} » — ${BOOK_BY_ID.get(pos.book)?.name} ${pos.chapter}:${n} (${version?.name ?? ""})`;
  async function copyVerse(n: number) { try { await navigator.clipboard.writeText(quote(n)); setSheetMsg("Verset copié."); } catch { setSheetMsg("Copie impossible sur ce navigateur."); } }
  async function shareVerse(n: number) {
    try { if (navigator.share) await navigator.share({ text: quote(n) }); else await copyVerse(n); }
    catch (e) { if ((e as Error).name !== "AbortError") setSheetMsg("Partage impossible : essayez « Copier »."); }
  }

  if (versions === null) return <p className="text-sm text-muted">Chargement…</p>;
  if (!version) return <Notice title="Aucun texte biblique installé"><p>Aucune traduction dont la licence autorise la reproduction n’est installée pour l’instant.</p></Notice>;

  const def = BOOK_BY_ID.get(pos.book);
  const prev = step(pos, -1), next = step(pos, 1);
  const nav = "btn-ghost min-w-12 disabled:opacity-40";
  const selMark = selected !== null ? marks.get(selected) : undefined;

  return (
    <div className="space-y-5">
      {version.isTestData && <p role="alert" className="rounded-2xl bg-sand/40 p-3 text-sm">DONNÉES DE TEST : ce n’est pas une véritable traduction biblique.</p>}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <select aria-label="Livre" className={`${sel} min-w-0 flex-1`} value={pos.book} onChange={(e) => setPos({ book: e.target.value, chapter: 1 })}>
          <optgroup label="Ancien Testament">{PROTESTANT_CANON.filter((b) => b.testament === "AT").map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
          <optgroup label="Nouveau Testament">{PROTESTANT_CANON.filter((b) => b.testament === "NT").map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
        </select>
        <select aria-label="Chapitre" className={sel} value={pos.chapter} onChange={(e) => setPos({ ...pos, chapter: Number(e.target.value) })}>
          {Array.from({ length: def?.chapters ?? 1 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
        <button type="button" className={`${nav} px-3 text-sm`} aria-label="Texte plus petit" onClick={() => setSize((s) => Math.max(15, s - 2))}>A−</button>
        <button type="button" className={`${nav} px-3 text-lg`} aria-label="Texte plus grand" onClick={() => setSize((s) => Math.min(30, s + 2))}>A+</button>
      </div>

      <AudioPlayer version={version} book={pos.book} chapter={pos.chapter} label={`${BOOK_BY_ID.get(pos.book)?.name ?? ""} ${pos.chapter}`} verses={chapter?.v ?? null} onNext={goNext} onPrev={goPrev} onSpeaking={setSpeaking} />

      <article lang={version.language} className="font-reading" style={{ fontSize: size }}>
        <header className="mb-8 text-center">
          <p className="font-ui text-[0.55em] uppercase tracking-[0.3em] text-muted">{def?.testament === "AT" ? "Ancien Testament" : "Nouveau Testament"}</p>
          <h1 className="mt-1 text-[1.6em] font-semibold leading-tight text-forest">{def?.name}</h1>
          <p className="mt-2 text-[3.4em] font-light leading-none text-gold" aria-label={`Chapitre ${pos.chapter}`}>{pos.chapter}</p>
          <p aria-hidden="true" className="mt-3 text-gold">✦</p>
        </header>
        {error && <p role="alert" className="text-calm">{error}</p>}
        {!error && !chapter && <p className="text-center text-muted">Chargement…</p>}
        {chapter?.t && <p className="mb-5 text-center italic text-muted">{chapter.t}</p>}
        {chapter && (
          <div className="space-y-1">
            {chapter.v.map(([n, t]) => {
              const m = marks.get(n);
              return (
                <p key={n} id={`v-${n}`} role="button" tabIndex={0} aria-pressed={selected === n}
                  onClick={() => { setSelected(selected === n ? null : n); setSheetMsg(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(selected === n ? null : n); setSheetMsg(null); } }}
                  className={`-mx-2 grid cursor-pointer grid-cols-[2.4rem_1fr] gap-x-2 rounded-xl px-2 py-1.5 leading-[1.7] transition ${m?.color ? `hl-${m.color}` : ""} ${selected === n ? "ring-2 ring-calm" : speaking === n ? "bg-sand/50" : "hover:bg-sand/20"}`}>
                  <span className="select-none pt-[0.38em] text-right font-ui text-[0.62em] font-bold text-progress">{n}</span>
                  <span>{t}{m?.favorite && <Icon name="heart" size={14} filled className="ml-1.5 inline align-baseline text-rose-500" />}</span>
                </p>
              );
            })}
          </div>
        )}
        <p aria-hidden="true" className="mt-8 text-center text-gold">✦</p>
      </article>
      {chapter && selected === null && <p className="text-center text-xs text-muted">Touchez un verset pour le surligner, l’ajouter aux favoris, le copier ou le partager.</p>}

      <NoteBlock refKey={`chapter:${pos.book}:${pos.chapter}`} title={`Mes notes sur ${def?.name ?? ""} ${pos.chapter}`} />

      {challenge && cBook && (
        <div className="card">
          <p className="text-sm text-muted">Défi : {challenge.title}</p>
          <button type="button" disabled={alreadyRead} onClick={() => void markRead()} className={`btn mt-2 w-full ${alreadyRead ? "bg-progress/15 text-progress" : "bg-forest text-bg"}`}>
            <Icon name="check" size={18} strokeWidth={2.4} />{alreadyRead ? "Chapitre lu" : "Marquer ce chapitre comme lu"}
          </button>
          {markMsg && <p role="status" className="mt-2 text-sm text-calm">{markMsg}</p>}
          <Link href="/" className="mt-2 inline-flex min-h-11 items-center text-sm text-calm underline">← Retour à ma lecture du jour</Link>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <button type="button" className={`${nav} flex-1`} disabled={!prev} onClick={() => prev && setPos(prev)}><Icon name="chevron-left" size={18} />Précédent</button>
        <button type="button" className={`${nav} flex-1`} disabled={!next} onClick={() => next && setPos(next)}>Suivant<Icon name="chevron-right" size={18} /></button>
      </div>
      <p className="text-center text-xs text-muted">{version.name} · {version.attribution}</p>
      <DownloadPanel version={version} />

      {selected !== null && (
        <VerseSheet label={`${def?.name} ${pos.chapter}:${selected}`} favorite={selMark?.favorite ?? false} color={selMark?.color ?? null} message={sheetMsg}
          onFavorite={() => void applyMark(selected, { favorite: !(selMark?.favorite ?? false) })} onColor={(c) => void applyMark(selected, { color: c })}
          onCopy={() => void copyVerse(selected)} onShare={() => void shareVerse(selected)} onClose={() => { setSelected(null); setSheetMsg(null); }} />
      )}
    </div>
  );
}

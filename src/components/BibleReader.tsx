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
import { Icon } from "@/components/Icon";
import { NoteBlock } from "@/components/NoteBlock";
import { Notice } from "@/components/Notice";
import { VerseSheet } from "@/components/VerseSheet";
import { PassagePicker } from "@/components/reader/PassagePicker";
import { ReaderSettings } from "@/components/reader/ReaderSettings";
import { LEGAL } from "@/lib/legal";
import { shareVerseImage } from "@/lib/share/verse-image";
import { LINE_HEIGHT, normalizePrefs, swipeDirection, type ReaderPrefs } from "@/lib/reader/prefs";

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
  const [prefs, setPrefs] = useState<ReaderPrefs>(normalizePrefs(null));
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeLite | null>(null);
  const [alreadyRead, setAlreadyRead] = useState(false);
  const [markMsg, setMarkMsg] = useState<string | null>(null);
  const [marks, setMarks] = useState<Map<number, LocalMark>>(new Map());
  const [selected, setSelected] = useState<number | null>(null);
  const [jump, setJump] = useState<number | null>(null);
  const [sheetMsg, setSheetMsg] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [follow, setFollow] = useState(true);
  const [seek, setSeek] = useState<{ verse: number; id: number } | null>(null);
  const [audio, setAudio] = useState<{ open: boolean; autoPlay: boolean }>({ open: false, autoPlay: false });
  const [picker, setPicker] = useState(false);
  const [settings, setSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tipSeen, setTipSeen] = useState(true);
  const posRef = useRef(pos); posRef.current = pos;
  const speakingRef = useRef(speaking); speakingRef.current = speaking;
  const restoreY = useRef<number | null>(null);
  const shownKey = useRef("");
  const ready = useRef(false);
  const articleRef = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const overlay = picker || settings || selected !== null;

  useEffect(() => {
    loadVersions().then(async (list) => {
      setVersions(list);
      const last = await kv.get<{ vid: string; pos: Pos; size?: number; scrollY?: number }>("reader:last").catch(() => undefined);
      setPrefs(normalizePrefs(await kv.get("reader:prefs").catch(() => undefined), last?.size));
      setTipSeen(!!(await kv.get<boolean>("reader:tip-seen").catch(() => true)));
      setVid(last && list.some((v) => v.id === last.vid) ? last.vid : list[0]?.id ?? "");
      if (last?.pos) { setPos(last.pos); if (typeof last.scrollY === "number" && last.scrollY > 0) restoreY.current = last.scrollY; }
      const q = parseReaderParams(window.location.search); // ouverture depuis la lecture du jour ou les favoris
      if (q) {
        restoreY.current = null;
        setPos({ book: q.book, chapter: q.chapter });
        if (q.verse) setJump(q.verse);
        if (q.challengeId) setChallenge((await kv.get<ChallengeLite>(`challenge:${q.challengeId}`).catch(() => undefined)) ?? null);
      }
      ready.current = true;
    });
  }, []);
  const saveLast = useCallback((scrollY: number) => { if (vid) void kv.set("reader:last", { vid, pos: posRef.current, scrollY }).catch((e) => console.error("Position non mémorisée :", e)); }, [vid]);
  useEffect(() => { if (ready.current) saveLast(0); }, [vid, pos, saveLast]);
  const updatePrefs = useCallback((p: ReaderPrefs) => { setPrefs(p); void kv.set("reader:prefs", p).catch((e) => console.error("Réglages non mémorisés :", e)); }, []);

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

  // à l'affichage d'un chapitre : verset demandé, sinon position d'avant, sinon haut de page
  useEffect(() => {
    if (!chapter) return;
    const key = `${pos.book}:${pos.chapter}`;
    if (jump !== null) {
      shownKey.current = key; const j = jump; setSelected(j); setJump(null);
      requestAnimationFrame(() => document.getElementById(`v-${j}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    if (shownKey.current === key) return;
    shownKey.current = key;
    if (restoreY.current !== null) { const y = restoreY.current; restoreY.current = null; requestAnimationFrame(() => window.scrollTo(0, y)); return; }
    window.scrollTo(0, 0);
  }, [chapter, jump, pos.book, pos.chapter]);

  // le texte suit la lecture audio ; dès que l'utilisateur fait défiler lui-même, on arrête de le déplacer
  useEffect(() => { if (speaking !== null && follow) document.getElementById(`v-${speaking}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [speaking, follow]);
  useEffect(() => {
    const stop = () => { if (speakingRef.current !== null) setFollow(false); };
    window.addEventListener("wheel", stop, { passive: true }); window.addEventListener("touchmove", stop, { passive: true });
    return () => { window.removeEventListener("wheel", stop); window.removeEventListener("touchmove", stop); };
  }, []);
  useEffect(() => { if (speaking === null) setFollow(true); }, [speaking]);

  // défilement : barre de progression, mode immersif, mémorisation de la position
  useEffect(() => {
    const root = document.documentElement;
    let lastY = window.scrollY; let frame = 0; let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const el = articleRef.current;
        if (el) { const r = el.getBoundingClientRect(); const span = r.height - window.innerHeight * 0.6; setProgress(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1); }
        if (y > lastY + 8 && y > 160) root.dataset.immersive = "1";
        else if (y < lastY - 8 || y < 80) delete root.dataset.immersive;
        lastY = y;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => saveLast(window.scrollY), 600);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (saveTimer) clearTimeout(saveTimer); cancelAnimationFrame(frame); delete root.dataset.immersive; };
  }, [saveLast]);
  useEffect(() => { if (overlay) delete document.documentElement.dataset.immersive; }, [overlay]);

  const goNext = useCallback(() => { const n = step(posRef.current, 1); if (n) setPos(n); return n !== null; }, []);
  const goPrev = useCallback(() => { const n = step(posRef.current, -1); if (n) setPos(n); return n !== null; }, []);

  // flèches du clavier (ordinateur) pour changer de chapitre
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (overlay || e.altKey || e.ctrlKey || e.metaKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
      if (e.key === "ArrowRight") goNext(); else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, goNext, goPrev]);

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
  async function imageVerse(n: number) {
    const t = chapter?.v.find(([k]) => k === n)?.[1]; if (!t || !version) return;
    setSheetMsg("Préparation de l’image…");
    try {
      const r = await shareVerseImage({ text: t, reference: `${BOOK_BY_ID.get(pos.book)?.name ?? ""} ${pos.chapter}:${n}`, version: version.name, footer: `Bible Challenge · ${LEGAL.organisation}` });
      setSheetMsg(r === "downloaded" ? "Image enregistrée : partagez-la depuis votre galerie." : null);
    } catch (e) { setSheetMsg((e as Error).message); }
  }
  function dismissTip() { setTipSeen(true); void kv.set("reader:tip-seen", true).catch(() => {}); }
  function toggleVerse(n: number) { setSelected(selected === n ? null : n); setSheetMsg(null); if (!tipSeen) dismissTip(); }

  if (versions === null) return <p className="py-10 text-center text-sm text-muted">Chargement…</p>;
  if (!version) return <Notice title="Aucun texte biblique installé"><p>Aucune traduction dont la licence autorise la reproduction n’est installée pour l’instant.</p></Notice>;

  const def = BOOK_BY_ID.get(pos.book);
  const prev = step(pos, -1), next = step(pos, 1);
  const name = (p: Pos) => `${BOOK_BY_ID.get(p.book)?.name ?? ""} ${p.chapter}`;
  const selMark = selected !== null ? marks.get(selected) : undefined;
  const bar = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/80 transition hover:bg-surface active:scale-95 disabled:opacity-30";

  return (
    <div>
      {/* Barre de lecture : passage, chapitres voisins, écoute, affichage */}
      <div className="reader-bar sticky top-0 z-30 -mx-4 -mt-5 border-b border-line/60 bg-bg/85 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex h-14 items-center gap-0.5 px-2">
          <button type="button" className={bar} disabled={!prev} onClick={goPrev} aria-label={prev ? `Chapitre précédent : ${name(prev)}` : "Chapitre précédent"}><Icon name="chevron-left" size={22} /></button>
          <button type="button" onClick={() => setPicker(true)} aria-label={`Passage : ${name(pos)}. Changer de passage`} aria-haspopup="dialog"
            className="mx-0.5 flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 transition hover:bg-surface active:scale-[.98]">
            <span className="truncate font-reading text-lg font-semibold text-forest">{name(pos)}</span><Icon name="chevron-down" size={18} className="shrink-0 text-muted" />
          </button>
          <button type="button" className={bar} disabled={!next} onClick={goNext} aria-label={next ? `Chapitre suivant : ${name(next)}` : "Chapitre suivant"}><Icon name="chevron-right" size={22} /></button>
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <button type="button" className={`${bar} ${audio.open ? "bg-forest/10 text-forest" : ""}`} aria-pressed={audio.open} aria-label={audio.open ? "Fermer l’écoute" : "Écouter ce chapitre"}
            onClick={() => setAudio((a) => (a.open ? { open: false, autoPlay: false } : { open: true, autoPlay: true }))}><Icon name="headphones" size={21} /></button>
          <button type="button" className={bar} aria-label="Affichage du texte" aria-haspopup="dialog" onClick={() => setSettings(true)}><Icon name="type" size={21} /></button>
        </div>
        <div className="h-0.5 bg-line/50" aria-hidden="true"><div className="h-full bg-gold transition-[width] duration-150" style={{ width: `${progress * 100}%` }} /></div>
      </div>

      {version.isTestData && <p role="alert" className="mt-4 rounded-2xl bg-sand/40 p-3 text-sm">DONNÉES DE TEST : ce n’est pas une véritable traduction biblique.</p>}

      <article ref={articleRef} lang={version.language} className={prefs.font === "serif" ? "font-reading" : "font-ui"} style={{ fontSize: prefs.size, lineHeight: LINE_HEIGHT[prefs.leading] }}
        onTouchStart={(e) => { const t = e.touches[0]; touch.current = t && e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: Date.now() } : null; }}
        onTouchEnd={(e) => {
          const s = touch.current; const t = e.changedTouches[0]; touch.current = null;
          if (!s || !t || overlay || (window.getSelection()?.toString() ?? "") !== "") return;
          const d = swipeDirection(t.clientX - s.x, t.clientY - s.y, Date.now() - s.t);
          if (d === 1) goNext(); else if (d === -1) goPrev();
        }}>
        <header className="mb-7 mt-8 text-center">
          <p className="font-ui text-[0.55em] font-semibold uppercase tracking-[0.3em] text-muted">{def?.name}</p>
          <p className="mt-1 text-[3em] font-light leading-none text-gold" aria-hidden="true">{pos.chapter}</p>
          <h1 className="sr-only">{name(pos)}</h1>
        </header>
        {error && <p role="alert" className="text-center text-calm">{error}</p>}
        {!error && !chapter && <p className="text-center text-muted">Chargement…</p>}
        {chapter && !tipSeen && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-sand/30 p-3.5 font-ui text-sm leading-normal">
            <Icon name="star" size={18} className="mt-0.5 shrink-0 text-gold" />
            <p className="flex-1 leading-relaxed">Touchez un verset pour le surligner, l’ajouter aux favoris ou l’écouter. Glissez vers la gauche ou la droite pour changer de chapitre.</p>
            <button type="button" onClick={dismissTip} className="min-h-9 shrink-0 rounded-full px-2 font-semibold text-forest">Compris</button>
          </div>
        )}
        {chapter?.t && <p className="mb-5 text-center text-[0.85em] italic text-muted">{chapter.t}</p>}
        {chapter && (
          <div className="space-y-0.5">
            {chapter.v.map(([n, t]) => {
              const m = marks.get(n);
              return (
                <p key={n} id={`v-${n}`} role="button" tabIndex={0} aria-pressed={selected === n} aria-current={speaking === n ? "true" : undefined}
                  onClick={() => toggleVerse(n)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleVerse(n); } }}
                  className={`-mx-2 cursor-pointer scroll-mt-24 rounded-xl px-2 py-1 transition ${prefs.numbers ? "grid grid-cols-[2.1rem_1fr] gap-x-1.5" : ""} ${m?.color ? `hl-${m.color}` : ""} ${selected === n ? "ring-2 ring-calm" : speaking === n ? "bg-gold/20 shadow-[inset_3px_0_0_rgb(var(--c-gold))]" : "hover:bg-sand/20"}`}>
                  {prefs.numbers && <span className="select-none pt-[0.42em] text-right font-ui text-[0.58em] font-bold text-gold">{n}</span>}
                  <span>{t}{m?.favorite && <Icon name="heart" size={14} filled className="ml-1.5 inline align-baseline text-rose-500" />}</span>
                </p>
              );
            })}
          </div>
        )}
        {chapter && <p aria-hidden="true" className="mt-8 text-center text-gold">✦</p>}
      </article>

      {chapter && (
        <div className="mt-8 space-y-4">
          {challenge && cBook && (
            <div className="card text-center">
              <p className="eyebrow">{challenge.title}</p>
              <button type="button" disabled={alreadyRead} onClick={() => void markRead()} className={`btn mt-3 w-full ${alreadyRead ? "bg-progress/15 text-progress" : "bg-forest text-bg"}`}>
                <Icon name="check" size={18} strokeWidth={2.4} />{alreadyRead ? "Chapitre lu" : "J’ai lu ce chapitre"}
              </button>
              {markMsg && <p role="status" className="mt-2 text-sm text-calm">{markMsg}</p>}
              <Link href="/" className="mt-1 inline-flex min-h-11 items-center text-sm text-calm underline">Retour à ma lecture du jour</Link>
            </div>
          )}

          <NoteBlock collapsible refKey={`chapter:${pos.book}:${pos.chapter}`} title={`Mes notes sur ${name(pos)}`} />

          {next && (
            <button type="button" onClick={goNext} className="card group flex w-full items-center justify-between gap-3 text-left transition active:scale-[.99]">
              <span><span className="eyebrow block">Continuer la lecture</span><span className="mt-0.5 block font-reading text-xl font-semibold text-forest">{name(next)}</span></span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest text-bg transition group-hover:translate-x-0.5"><Icon name="chevron-right" size={22} /></span>
            </button>
          )}
          {prev && <button type="button" onClick={goPrev} className="mx-auto flex min-h-11 items-center gap-1 text-sm text-muted"><Icon name="chevron-left" size={16} />{name(prev)}</button>}
          <p className="text-center text-xs text-muted">{version.name}</p>
          {audio.open && <div className="h-20" aria-hidden="true" />}
        </div>
      )}

      {selected !== null && (
        <VerseSheet label={`${def?.name} ${pos.chapter}:${selected}`} favorite={selMark?.favorite ?? false} color={selMark?.color ?? null} message={sheetMsg}
          onFavorite={() => void applyMark(selected, { favorite: !(selMark?.favorite ?? false) })} onColor={(c) => void applyMark(selected, { color: c })}
          onCopy={() => void copyVerse(selected)} onShare={() => void shareVerse(selected)} onImage={() => void imageVerse(selected)}
          onListen={() => { setSeek({ verse: selected, id: Date.now() }); setAudio((a) => (a.open ? a : { open: true, autoPlay: false })); setFollow(true); setSelected(null); setSheetMsg(null); }}
          onClose={() => { setSelected(null); setSheetMsg(null); }} />
      )}

      {audio.open && (
        <AudioPlayer version={version} book={pos.book} chapter={pos.chapter} label={name(pos)} verses={chapter?.v ?? null} onNext={goNext} onPrev={goPrev} onSpeaking={setSpeaking}
          current={speaking} follow={follow} onFollow={() => setFollow(true)} seek={seek} autoPlay={audio.autoPlay} hidden={selected !== null}
          onClose={() => { setAudio({ open: false, autoPlay: false }); setSeek(null); }} />
      )}
      <PassagePicker open={picker} onClose={() => setPicker(false)} current={pos} onPick={setPos} />
      <ReaderSettings open={settings} onClose={() => setSettings(false)} prefs={prefs} onChange={updatePrefs} version={version} />
    </div>
  );
}

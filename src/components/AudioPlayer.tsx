"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { audioCacheSupported, chapterAudioUrl, downloadAudio, isAudioCached, playableSrc } from "@/lib/audio/client";
import { pickVoice } from "@/lib/audio/voice";
import { buildTimeline, timeForVerse, verseAt } from "@/lib/audio/follow";
import type { BibleVersion } from "@/lib/bible/store";
import { kv } from "@/lib/offline/local-db";

type Mode = "rec" | "tts";
const RATES = [0.8, 1, 1.25, 1.5];

export interface AudioPlayerProps {
  version: BibleVersion; label: string; verses: [number, string][] | null;
  onNext: () => boolean; onPrev: () => boolean; onSpeaking: (verse: number | null) => void;
  book: string; chapter: number;
  /** Verset en cours de lecture. */
  current: number | null;
  /** Le texte suit-il la lecture ? Sinon, la barre propose d'y revenir. */
  follow: boolean; onFollow: () => void;
  /** Demande de lecture à partir d'un verset (« Écouter à partir d'ici »). */
  seek: { verse: number; id: number } | null;
  /** Lancer la lecture dès l'ouverture. */
  autoPlay?: boolean;
  /** Masque la barre (panneau d'un verset ouvert) sans couper le son. */
  hidden?: boolean;
  onClose: () => void;
}

/**
 * Écoute d'un chapitre, dans une barre flottante au-dessus du texte :
 * enregistrement humain (Trésor Sonore, CC BY-NC-ND, fichiers non modifiés) ou voix de synthèse du téléphone.
 */
export function AudioPlayer(p: AudioPlayerProps) {
  const aud = p.version.audio;
  const [mode, setMode] = useState<Mode>(aud ? "rec" : "tts");
  const [rate, setRate] = useState(1);
  const [autoNext, setAutoNext] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null | undefined>(undefined); // undefined = recherche en cours
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasVoice, setHasVoice] = useState(true);
  const [more, setMore] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const latest = useRef(p); latest.current = p;
  const rateRef = useRef(rate); rateRef.current = rate;
  const autoRef = useRef(autoNext); autoRef.current = autoNext;
  const wantPlay = useRef(!!p.autoPlay);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const ttsIdx = useRef(0); const token = useRef(0); const ttsOn = useRef(false);
  const timeline = useMemo(() => (p.verses ? buildTimeline(p.verses) : null), [p.verses]);
  const lastVerse = useRef<number | null>(null);
  const pendingSeek = useRef<number | null>(null);

  useEffect(() => { kv.get<{ mode: Mode; rate: number; auto: boolean }>("audio:prefs").then((s) => { if (s) { if (s.mode === "tts" || aud) setMode(s.mode); setRate(s.rate); setAutoNext(s.auto); } }).catch((e) => console.error("Préférences audio :", e)); }, [aud]);
  useEffect(() => { void kv.set("audio:prefs", { mode, rate, auto: autoNext }).catch((e) => console.error("Préférences audio :", e)); }, [mode, rate, autoNext]);

  // écran allumé pendant l'écoute (si le navigateur le permet)
  useEffect(() => {
    if (!playing || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null; let done = false;
    navigator.wakeLock.request("screen").then((l) => { if (done) void l.release(); else lock = l; }).catch(() => {});
    return () => { done = true; void lock?.release(); };
  }, [playing]);

  // ---------- voix de synthèse ----------
  const stopTts = useCallback(() => { token.current++; ttsOn.current = false; if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); }, []);
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") { setHasVoice(false); return; }
    const load = () => { voiceRef.current = pickVoice(speechSynthesis.getVoices(), navigator.onLine); setHasVoice(voiceRef.current !== null); };
    load(); speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const speakFrom: (i: number) => void = useCallback((i: number) => {
    const verses = latest.current.verses;
    if (!verses || typeof speechSynthesis === "undefined") return;
    stopTts();
    if (i >= verses.length) { setPlaying(false); latest.current.onSpeaking(null); ttsIdx.current = 0; if (autoRef.current && latest.current.onNext()) wantPlay.current = true; return; }
    const [n, t] = verses[i] as [number, string];
    const mine = ++token.current; ttsOn.current = true; ttsIdx.current = i;
    setPlaying(true); setStatus(null); latest.current.onSpeaking(n);
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "fr-FR"; u.rate = rateRef.current; if (voiceRef.current) u.voice = voiceRef.current;
    u.onend = () => { if (mine === token.current && ttsOn.current) speakFrom(i + 1); }; // le jeton évite de sauter un verset après un arrêt
    u.onerror = (e) => { if (mine !== token.current || e.error === "canceled" || e.error === "interrupted") return; ttsOn.current = false; setPlaying(false); setStatus("La voix du téléphone a rencontré une erreur."); };
    speechSynthesis.speak(u);
  }, [stopTts]);

  // nouveau chapitre : on repart au début, et on lit tout de suite si la lecture était en cours
  useEffect(() => {
    ttsIdx.current = 0; lastVerse.current = null; latest.current.onSpeaking(null);
    if (mode === "tts") { stopTts(); setPlaying(false); if (wantPlay.current && p.verses) { wantPlay.current = false; const s = pendingSeek.current; pendingSeek.current = null; const i = s === null ? 0 : Math.max(0, p.verses.findIndex(([n]) => n === s)); speakFrom(i); } }
  }, [mode, p.book, p.chapter, p.verses, speakFrom, stopTts]);

  // ---------- enregistrement humain ----------
  useEffect(() => {
    if (mode !== "rec" || !aud) return;
    let active = true; let revoke = () => {};
    setUrl(undefined); setStatus(null); setPlaying(false);
    audioRef.current?.pause(); // l'ancien chapitre ne doit pas continuer pendant la recherche du nouveau
    (async () => {
      try {
        const u = await chapterAudioUrl(aud.item, p.book, p.chapter);
        if (!active) return;
        setUrl(u); if (!u) return;
        setCached(await isAudioCached(u));
        const ps = await playableSrc(u); revoke = ps.revoke;
        if (!active) { revoke(); return; }
        const a = audioRef.current;
        if (a) { a.src = ps.src; a.playbackRate = rateRef.current; if (wantPlay.current) { wantPlay.current = false; await a.play().catch(() => setStatus("Touchez lecture pour commencer.")); } }
      } catch (e) { if (active) { setUrl(null); setStatus((e as Error).message); } }
    })();
    return () => { active = false; revoke(); };
  }, [mode, aud, p.book, p.chapter]);

  // commandes de l'écran verrouillé
  useEffect(() => {
    if (mode !== "rec" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({ title: p.label, artist: "Bible Challenge", album: p.version.name });
    ms.setActionHandler("play", () => void audioRef.current?.play());
    ms.setActionHandler("pause", () => audioRef.current?.pause());
    ms.setActionHandler("nexttrack", () => { wantPlay.current = true; if (!latest.current.onNext()) wantPlay.current = false; });
    ms.setActionHandler("previoustrack", () => { wantPlay.current = true; if (!latest.current.onPrev()) wantPlay.current = false; });
    return () => { for (const a of ["play", "pause", "nexttrack", "previoustrack"] as const) ms.setActionHandler(a, null); };
  }, [mode, p.label, p.version.name]);

  useEffect(() => () => { stopTts(); audioRef.current?.pause(); latest.current.onSpeaking(null); }, [stopTts]);

  // ---------- suivi du texte (voix enregistrée) ----------
  const trackVerse = useCallback(() => {
    const a = audioRef.current; const tl = timeline;
    if (!a || !tl || mode !== "rec") return;
    const v = verseAt(tl, a.currentTime, a.duration);
    if (v !== null && v !== lastVerse.current) { lastVerse.current = v; latest.current.onSpeaking(v); }
  }, [timeline, mode]);
  const applySeek = useCallback(() => {
    const a = audioRef.current; const v = pendingSeek.current;
    if (!a || v === null || !timeline || !Number.isFinite(a.duration)) return;
    const t = timeForVerse(timeline, v, a.duration);
    pendingSeek.current = null;
    if (t !== null) { a.currentTime = t; lastVerse.current = v; latest.current.onSpeaking(v); }
  }, [timeline]);

  // « Écouter à partir d'ici » (le lecteur peut venir de s'ouvrir : on attend alors que tout soit prêt)
  useEffect(() => {
    const s = p.seek; if (!s) return;
    if (mode === "tts") {
      const i = p.verses?.findIndex(([n]) => n === s.verse) ?? -1;
      if (i >= 0) speakFrom(i); else { pendingSeek.current = s.verse; wantPlay.current = true; }
      return;
    }
    pendingSeek.current = s.verse;
    const a = audioRef.current;
    if (!a || !url) { wantPlay.current = true; return; } // le chargement en cours lancera la lecture, le saut suivra
    applySeek();
    void a.play().catch(() => setStatus("Touchez lecture pour continuer."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.seek?.id]);

  // ---------- commandes ----------
  function switchMode(m: Mode) { if (m === mode) return; audioRef.current?.pause(); stopTts(); setPlaying(false); latest.current.onSpeaking(null); wantPlay.current = false; setStatus(null); setMode(m); }
  function toggle() {
    if (mode === "rec") { const a = audioRef.current; if (!a || !url) return; if (a.paused) void a.play().catch(() => setStatus("Lecture impossible : vérifiez la connexion ou téléchargez le chapitre.")); else a.pause(); return; }
    if (playing) { stopTts(); setPlaying(false); return; }
    speakFrom(ttsIdx.current);
  }
  function jump(dir: 1 | -1) {
    wantPlay.current = playing;
    const moved = dir === 1 ? p.onNext() : p.onPrev();
    if (!moved) wantPlay.current = false;
  }
  function changeRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length] as number;
    setRate(next); rateRef.current = next;
    if (audioRef.current) audioRef.current.playbackRate = next;
    if (mode === "tts" && playing) speakFrom(ttsIdx.current);
  }
  async function download() {
    if (!url) return;
    setBusy(true); setStatus(null);
    try { await downloadAudio(url); setCached(true); }
    catch (e) { setStatus((e as Error).message); }
    finally { setBusy(false); }
  }

  const disabled = mode === "rec" ? !url : !p.verses || !hasVoice;
  const recFailed = mode === "rec" && url === null;
  let sub: React.ReactNode = p.current !== null ? `Verset ${p.current}` : mode === "rec" ? "Voix enregistrée" : "Voix du téléphone";
  if (mode === "rec" && url === undefined) sub = "Préparation…";
  if (mode === "tts" && !hasVoice) sub = "Aucune voix française sur cet appareil";
  if (status) sub = status;
  if (recFailed && !status) sub = "Pas d’enregistrement pour ce chapitre";

  const icon = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-bg active:scale-95 disabled:opacity-40";
  const seg = (m: Mode, text: string) => (
    <button type="button" role="radio" aria-checked={mode === m} onClick={() => switchMode(m)} disabled={m === "rec" && !aud}
      className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-medium transition disabled:opacity-40 ${mode === m ? "bg-surface text-ink shadow-card" : "text-muted"}`}>{text}</button>
  );

  return (
    <div role="region" aria-label={`Écoute de ${p.label}`} className={`audio-dock fixed inset-x-3 z-40 mx-auto max-w-md animate-fade-up overflow-hidden rounded-[1.6rem] border border-line bg-surface/95 shadow-lift backdrop-blur-xl ${p.hidden ? "invisible" : ""}`}>
      {more && (
        <div className="space-y-3 border-b border-line p-3">
          <div role="radiogroup" aria-label="Type de voix" className="flex rounded-2xl border border-line bg-bg p-1">{seg("rec", "Voix enregistrée")}{seg("tts", "Voix du téléphone")}</div>
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="btn-ghost min-h-11 flex-1 gap-1.5 px-3 text-sm" onClick={() => jump(-1)}><Icon name="skip-back" size={16} filled />Chap. précédent</button>
            <button type="button" className="btn-ghost min-h-11 flex-1 gap-1.5 px-3 text-sm" onClick={() => jump(1)}>Chap. suivant<Icon name="skip-forward" size={16} filled /></button>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 px-1 text-sm"><span>Enchaîner avec le chapitre suivant</span>
            <input type="checkbox" role="switch" className="h-5 w-5 accent-[rgb(var(--c-progress))]" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} /></label>
          {mode === "rec" && url && audioCacheSupported() && (cached
            ? <p className="px-1 text-sm font-medium text-progress">Ce chapitre est disponible sans connexion ✓</p>
            : <button type="button" onClick={() => void download()} disabled={busy} className="btn-ghost min-h-11 w-full gap-1.5 text-sm"><Icon name="download" size={16} />{busy ? "Téléchargement…" : "Garder pour écouter sans connexion"}</button>)}
          {mode === "rec" && aud && <p className="px-1 text-[0.7rem] leading-relaxed text-muted">Enregistrement : <a className="underline" href={aud.sourceUrl} target="_blank" rel="noopener noreferrer">{aud.provider}</a> · <a className="underline" href={aud.licenseUrl} target="_blank" rel="noopener noreferrer">{aud.license}</a></p>}
          {mode === "tts" && <p className="px-1 text-[0.7rem] leading-relaxed text-muted">La qualité dépend des voix installées sur votre téléphone (réglages de synthèse vocale).</p>}
        </div>
      )}

      <div className="flex items-center gap-1 p-2">
        <button type="button" disabled={disabled} onClick={toggle} aria-label={playing ? "Pause" : "Lecture"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-bg shadow-card transition active:scale-95 disabled:opacity-40">
          <Icon name={playing ? "pause" : "play"} size={22} filled={!playing} strokeWidth={playing ? 3 : 1.8} />
        </button>
        <div className="min-w-0 flex-1 px-2 leading-tight">
          <p className="truncate text-sm font-semibold">{p.label}</p>
          <p role="status" className="truncate text-xs text-muted">{sub}</p>
        </div>
        {recFailed && hasVoice && <button type="button" onClick={() => switchMode("tts")} className="min-h-11 shrink-0 rounded-full bg-forest/10 px-3 text-xs font-semibold text-forest">Voix du téléphone</button>}
        {!recFailed && !p.follow && p.current !== null && <button type="button" onClick={p.onFollow} className="min-h-11 shrink-0 rounded-full bg-forest/10 px-3 text-sm font-semibold text-forest">Suivre</button>}
        <button type="button" onClick={changeRate} aria-label={`Vitesse ${rate}`} className="min-h-11 min-w-11 shrink-0 rounded-full px-1.5 text-sm font-semibold text-muted hover:bg-bg">{rate}×</button>
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} aria-label="Options d’écoute" className={`${icon} ${more ? "bg-bg text-ink" : ""}`}><Icon name="more" size={22} strokeWidth={3.2} /></button>
        <button type="button" onClick={p.onClose} aria-label="Fermer le lecteur" className={icon}><Icon name="x" size={19} /></button>
      </div>

      <audio ref={audioRef} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={trackVerse} onSeeked={trackVerse} onLoadedMetadata={() => { applySeek(); trackVerse(); }}
        onEnded={() => { setPlaying(false); if (autoRef.current && latest.current.onNext()) wantPlay.current = true; }}
        onError={() => { if (audioRef.current?.getAttribute("src")) setStatus("Lecture impossible : vérifiez la connexion."); }} />
    </div>
  );
}

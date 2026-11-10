"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { audioCacheSupported, chapterAudioUrl, downloadAudio, isAudioCached, playableSrc } from "@/lib/audio/client";
import { pickVoice } from "@/lib/audio/voice";
import type { BibleVersion } from "@/lib/bible/store";
import { kv } from "@/lib/offline/local-db";

type Mode = "rec" | "tts";
const RATES = [0.8, 1, 1.25, 1.5];

export interface AudioPlayerProps {
  version: BibleVersion; label: string; verses: [number, string][] | null;
  onNext: () => boolean; onPrev: () => boolean; onSpeaking: (verse: number | null) => void;
  book: string; chapter: number;
}

/**
 * Écoute d'un chapitre : enregistrement humain (Trésor Sonore, CC BY-NC-ND, fichiers non modifiés)
 * ou voix de synthèse du téléphone (le texte est dans le domaine public).
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const latest = useRef(p); latest.current = p;
  const rateRef = useRef(rate); rateRef.current = rate;
  const autoRef = useRef(autoNext); autoRef.current = autoNext;
  const wantPlay = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const ttsIdx = useRef(0); const token = useRef(0); const ttsOn = useRef(false);

  useEffect(() => { kv.get<{ mode: Mode; rate: number; auto: boolean }>("audio:prefs").then((s) => { if (s) { if (s.mode === "tts" || aud) setMode(s.mode); setRate(s.rate); setAutoNext(s.auto); } }).catch((e) => console.error("Préférences audio :", e)); }, [aud]);
  useEffect(() => { void kv.set("audio:prefs", { mode, rate, auto: autoNext }).catch((e) => console.error("Préférences audio :", e)); }, [mode, rate, autoNext]);

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
    ttsIdx.current = 0; latest.current.onSpeaking(null);
    if (mode === "tts") { stopTts(); setPlaying(false); if (wantPlay.current && p.verses) { wantPlay.current = false; speakFrom(0); } }
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
        if (a) { a.src = ps.src; a.playbackRate = rateRef.current; if (wantPlay.current) { wantPlay.current = false; await a.play().catch(() => setStatus("Appuyez sur lecture pour continuer.")); } }
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

  // ---------- commandes ----------
  function switchMode(m: Mode) { if (m === mode) return; audioRef.current?.pause(); stopTts(); setPlaying(false); latest.current.onSpeaking(null); wantPlay.current = false; setMode(m); }
  function toggle() {
    if (mode === "rec") { const a = audioRef.current; if (!a || !url) return; if (a.paused) void a.play().catch(() => setStatus("Lecture impossible : vérifiez la connexion ou téléchargez le chapitre.")); else a.pause(); return; }
    if (playing) { stopTts(); setPlaying(false); return; }
    speakFrom(ttsIdx.current);
  }
  function jump(dir: 1 | -1) {
    const was = playing; wantPlay.current = was;
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
    try { await downloadAudio(url); setCached(true); setStatus("Chapitre disponible hors connexion."); }
    catch (e) { setStatus((e as Error).message); }
    finally { setBusy(false); }
  }

  const disabled = mode === "rec" ? !url : !p.verses || !hasVoice;
  const seg = (m: Mode, text: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} disabled={m === "rec" && !aud}
      className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-medium transition disabled:opacity-40 ${mode === m ? "bg-surface text-ink shadow-card" : "text-muted"}`}>{text}</button>
  );
  const round = "flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface shadow-card transition active:scale-95 disabled:opacity-40";

  return (
    <section className="card p-4" aria-label="Écouter le chapitre">
      <div className="flex items-center gap-2"><Icon name="headphones" size={20} className="text-forest" /><h2 className="font-medium">Écouter {p.label}</h2></div>
      <div role="tablist" aria-label="Type de voix" className="mt-3 flex rounded-2xl border border-line bg-bg p-1">{seg("rec", "Voix enregistrée")}{seg("tts", "Voix du téléphone")}</div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button type="button" className={round} aria-label="Chapitre précédent" onClick={() => jump(-1)}><Icon name="skip-back" size={20} filled /></button>
        <button type="button" disabled={disabled} onClick={toggle} aria-label={playing ? "Pause" : "Lecture"} className="flex h-16 w-16 items-center justify-center rounded-full bg-forest text-bg shadow-lift transition active:scale-95 disabled:opacity-40">
          <Icon name={playing ? "pause" : "play"} size={28} filled={!playing} strokeWidth={playing ? 3 : 1.8} />
        </button>
        <button type="button" className={round} aria-label="Chapitre suivant" onClick={() => jump(1)}><Icon name="skip-forward" size={20} filled /></button>
        <button type="button" onClick={changeRate} aria-label={`Vitesse ${rate}`} className="min-h-12 min-w-14 rounded-full border border-line bg-surface px-3 text-sm font-semibold shadow-card">{rate}×</button>
      </div>

      <label className="mt-3 flex min-h-11 items-center justify-center gap-2 text-sm text-muted"><input type="checkbox" className="h-5 w-5" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />Enchaîner avec le chapitre suivant</label>

      {mode === "rec" && (
        <div className="mt-2 space-y-2 text-center text-sm">
          {url === undefined && <p className="text-muted">Recherche de l’enregistrement…</p>}
          {url === null && !status && <p className="text-muted">Pas d’enregistrement pour ce chapitre.</p>}
          {url && audioCacheSupported() && (cached ? <p className="font-medium text-progress">Disponible hors connexion ✓</p> : <button type="button" onClick={() => void download()} disabled={busy} className="btn-ghost min-h-11 px-4 text-sm"><Icon name="download" size={16} />{busy ? "Téléchargement…" : "Télécharger ce chapitre"}</button>)}
          <p className="text-xs leading-relaxed text-muted">Enregistrement : <a className="underline" href={aud?.sourceUrl} target="_blank" rel="noopener noreferrer">{aud?.provider}</a>, licence <a className="underline" href={aud?.licenseUrl} target="_blank" rel="noopener noreferrer">{aud?.license}</a> (usage non commercial, sans modification).</p>
        </div>
      )}
      {mode === "tts" && <p className="mt-2 text-center text-xs leading-relaxed text-muted">{hasVoice ? "Lecture par la voix de votre téléphone, verset par verset. La qualité dépend des voix installées." : "Aucune voix française trouvée sur cet appareil : ajoutez-en une dans les réglages de synthèse vocale de votre téléphone."}</p>}
      <audio ref={audioRef} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); if (autoRef.current && latest.current.onNext()) wantPlay.current = true; }}
        onError={() => { if (audioRef.current?.getAttribute("src")) setStatus("Lecture impossible : vérifiez la connexion ou téléchargez le chapitre."); }} />
      {status && <p role="status" className="mt-2 text-center text-sm text-calm">{status}</p>}
    </section>
  );
}

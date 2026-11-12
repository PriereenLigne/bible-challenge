"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { kv } from "@/lib/offline/local-db";
import { downloadReminderIcs } from "@/lib/reminders/export";
import { DEFAULT_REMINDER, isValidTime, type ReminderSettings } from "@/lib/reminders/settings";
import { normalizePrefs, SIZE_MAX, SIZE_MIN, type ReaderPrefs } from "@/lib/reader/prefs";
import { LEGAL } from "@/lib/legal";

export const ONBOARDED_KEY = "onboarded:v1";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "flag", title: "Un programme à votre rythme", text: "Toute la Bible, le Nouveau Testament, les Psaumes… le calendrier se crée pour vous." },
  { icon: "headphones", title: "Lire ou écouter", text: "Le texte se surligne pendant l’écoute, même sans connexion." },
  { icon: "users", title: "Avancer ensemble", text: "Lisez en équipe avec votre famille, votre groupe ou votre église." },
];

/** Premier lancement : trois écrans simples, que l'on peut passer à tout moment. */
export function Onboarding({ signedIn, hasChallenge }: { signedIn: boolean; hasChallenge: boolean }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<ReaderPrefs>(normalizePrefs(null));
  const [rem, setRem] = useState<ReminderSettings>({ ...DEFAULT_REMINDER, enabled: true });
  const [icsDone, setIcsDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (await kv.get<boolean>(ONBOARDED_KEY)) return;
      setPrefs(normalizePrefs(await kv.get("reader:prefs"), (await kv.get<{ size?: number }>("reader:last"))?.size));
      const r = await kv.get<ReminderSettings>("reminder"); if (r) setRem({ ...r, enabled: true });
      setShow(true);
    })().catch((e) => console.error("Accueil :", e));
  }, []);
  useEffect(() => { if (!show) return; const prev = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = prev; }; }, [show]);

  function finish(saveReminder: boolean) {
    void kv.set(ONBOARDED_KEY, true);
    void kv.set("reader:prefs", prefs);
    if (saveReminder) void kv.set("reminder", rem);
    setShow(false);
  }
  if (!show) return null;

  const last = 2;
  const next = () => setStep((s) => Math.min(last, s + 1));
  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label="Bienvenue" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-3">
        <div className="flex gap-1.5" aria-label={`Étape ${step + 1} sur ${last + 1}`}>
          {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-forest" : "w-1.5 bg-line"}`} />)}
        </div>
        <button type="button" onClick={() => finish(false)} className="min-h-11 px-2 text-sm font-medium text-muted">Passer</button>
      </div>

      <div key={step} className="mx-auto flex w-full max-w-md flex-1 animate-fade-up flex-col overflow-y-auto px-5 pb-4 pt-4">
        {step === 0 && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={72} height={72} className="rounded-2xl shadow-lift" />
            <h1 className="mt-6 font-reading text-[2rem] font-semibold leading-tight text-forest">Bienvenue sur Bible Challenge</h1>
            <p className="mt-2 text-muted">Lire la Bible chaque jour, seul ou ensemble. Une application gratuite de {LEGAL.organisation}.</p>
            <ul className="mt-7 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest/10 text-forest"><Icon name={f.icon} size={22} /></span>
                  <span><span className="block font-semibold">{f.title}</span><span className="text-sm text-muted">{f.text}</span></span>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-reading text-[1.8rem] font-semibold leading-tight text-forest">Votre confort de lecture</h1>
            <p className="mt-2 text-muted">Réglez la taille du texte pour lire sans effort. Vous pourrez la changer à tout moment avec le bouton « Aa ».</p>
            <p className="mt-6 rounded-3xl border border-line bg-surface p-5 font-reading shadow-card" style={{ fontSize: prefs.size, lineHeight: 1.7 }}>
              L’Éternel est mon berger : je ne manquerai de rien.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="font-semibold text-muted">A</span>
              <input type="range" min={SIZE_MIN} max={SIZE_MAX} value={prefs.size} aria-label="Taille du texte" onChange={(e) => setPrefs({ ...prefs, size: Number(e.target.value) })} className="h-2 flex-1 accent-[rgb(var(--c-progress))]" />
              <span className="text-2xl font-semibold text-muted">A</span>
            </div>
            <p className="eyebrow mb-2 mt-7">Apparence</p>
            <ThemeToggle />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-reading text-[1.8rem] font-semibold leading-tight text-forest">Un rendez-vous chaque jour</h1>
            <p className="mt-2 text-muted">Choisissez votre moment de lecture. La régularité compte plus que la durée.</p>
            <label className="mt-6 block">
              <span className="eyebrow">Heure de lecture</span>
              <input type="time" value={rem.time} onChange={(e) => { if (isValidTime(e.target.value)) setRem({ ...rem, time: e.target.value }); }}
                className="mt-2 block min-h-14 w-full rounded-2xl border border-line bg-surface px-4 text-center font-reading text-3xl shadow-card" />
            </label>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {[["06:00", "Au réveil"], ["12:30", "À midi"], ["21:00", "Le soir"]].map(([t, l]) => (
                <button key={t} type="button" onClick={() => setRem({ ...rem, time: t as string })} aria-pressed={rem.time === t}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${rem.time === t ? "border-transparent bg-forest text-bg" : "border-line bg-surface text-muted"}`}>{l}</button>
              ))}
            </div>
            <div className="mt-6 rounded-3xl border border-line bg-surface p-4 shadow-card">
              <p className="flex items-center gap-2 font-semibold"><Icon name="calendar" size={18} className="text-forest" />Alarme sur votre téléphone</p>
              <p className="mt-1 text-sm text-muted">Ajoutez le rappel à votre calendrier : il sonnera même application fermée.</p>
              <button type="button" onClick={() => { downloadReminderIcs(rem); setIcsDone(true); }} className="btn-ghost mt-3 min-h-11 w-full text-sm">
                {icsDone ? <><Icon name="check" size={17} />Fichier créé : ouvrez-le</> : <><Icon name="download" size={17} />Ajouter à mon calendrier</>}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-md space-y-2 px-5 pb-5">
        {step < last && <button type="button" onClick={next} className="btn w-full bg-forest text-bg">Continuer<Icon name="chevron-right" size={18} /></button>}
        {step === last && (signedIn
          ? <Link href={hasChallenge ? "/" : "/defis"} onClick={() => finish(true)} className="btn w-full bg-forest text-bg">{hasChallenge ? "C’est parti" : "Choisir mon programme"}<Icon name="chevron-right" size={18} /></Link>
          : <>
              <Link href="/connexion?mode=inscription" onClick={() => finish(true)} className="btn w-full bg-forest text-bg">Créer mon compte<Icon name="chevron-right" size={18} /></Link>
              <Link href="/lire" onClick={() => finish(true)} className="btn-ghost w-full">Lire sans compte</Link>
            </>)}
      </div>
    </div>
  );
}

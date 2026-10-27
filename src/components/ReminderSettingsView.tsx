"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { kv } from "@/lib/offline/local-db";
import { buildReminderIcs } from "@/lib/reminders/ics";
import { DAY_LABELS, DEFAULT_REMINDER, isValidTime, type ReminderSettings } from "@/lib/reminders/settings";
import { localToday } from "@/lib/challenges/active";

export function ReminderSettingsView() {
  const [s, setS] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { kv.get<ReminderSettings>("reminder").then((r) => { if (r) setS(r); setLoaded(true); }).catch((e) => { console.error("Rappel :", e); setLoaded(true); }); }, []);

  function update(next: ReminderSettings) {
    setS(next); setMsg(null);
    void kv.set("reminder", next).catch((e) => setMsg(`Réglage non enregistré : ${(e as Error).message}`));
  }
  function exportIcs() {
    try {
      const ics = buildReminderIcs({ time: s.time, days: s.days, url: window.location.origin, today: localToday(), now: new Date() });
      const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = "rappel-bible-challenge.ics"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMsg("Fichier créé : ouvrez-le pour l’ajouter à votre calendrier. L’alarme sonnera même application fermée.");
    } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <div className="stagger space-y-4">
      <section className="card">
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span><span className="block font-medium">Me rappeler de lire</span><span className="text-sm text-muted">Un bandeau discret dans l’application, à l’heure choisie</span></span>
          <input type="checkbox" className="h-6 w-6" checked={s.enabled} disabled={!loaded} onChange={(e) => update({ ...s, enabled: e.target.checked })} />
        </label>
        <label className="mt-4 block text-sm font-medium">Heure
          <input type="time" value={s.time} onChange={(e) => { if (isValidTime(e.target.value)) update({ ...s, time: e.target.value }); }} className="mt-1 block min-h-12 w-full rounded-2xl border border-line bg-bg px-3 text-lg" />
        </label>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Jours</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAY_LABELS.map((l, d) => {
              const on = s.days.includes(d);
              return <button key={l} type="button" aria-pressed={on} onClick={() => update({ ...s, days: on ? s.days.filter((x) => x !== d) : [...s.days, d].sort() })} className={`min-h-11 min-w-12 rounded-full border px-3 text-sm font-medium transition ${on ? "border-transparent bg-forest text-bg" : "border-line bg-surface text-muted"}`}>{l}</button>;
            })}
          </div>
        </fieldset>
      </section>

      <section className="card">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sand/50 text-forest"><Icon name="calendar" size={22} /></span><div><h2 className="font-medium">Alarme dans mon calendrier</h2><p className="text-sm text-muted">La méthode la plus fiable</p></div></div>
        <p className="mt-3 text-sm leading-relaxed text-muted">Votre téléphone sonnera à l’heure choisie, même si l’application est fermée. Le fichier s’ajoute à l’application Calendrier de votre téléphone.</p>
        <button type="button" onClick={exportIcs} disabled={s.days.length === 0} className="btn-ghost mt-3 w-full"><Icon name="download" size={18} />Ajouter à mon calendrier (.ics)</button>
      </section>

      <section className="rounded-3xl border border-dashed border-line p-4 text-sm leading-relaxed text-muted">
        <p className="font-medium text-ink">Ce qui n’est pas (encore) possible</p>
        <p className="mt-1">Les notifications « push » envoyées par un serveur ne sont pas encore en place : elles demandent une configuration supplémentaire et restent peu fiables sur iPhone pour une application installée depuis le navigateur. Le bandeau ci-dessus ne s’affiche que lorsque vous ouvrez l’application. Ce réglage est propre à cet appareil.</p>
      </section>
      {msg && <p role="status" className="text-sm text-calm">{msg}</p>}
      <Link href="/profil" className="inline-block text-sm text-calm underline">← Tableau de bord</Link>
    </div>
  );
}

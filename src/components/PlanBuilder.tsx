"use client";
import { useMemo, useState } from "react";
import { BOOK_BY_ID } from "@/lib/bible/canon";
import { generatePlan } from "@/lib/plans/generate";
import { DURATIONS, SCOPES, type ScopeId } from "@/lib/plans/scopes";

const today = () => new Date().toISOString().slice(0, 10);
const label = (b: string, from: number, to: number) => `${BOOK_BY_ID.get(b)?.name ?? b} ${from === to ? from : `${from}–${to}`}`;
const field = "mt-1 block min-h-12 w-full rounded-xl border border-line bg-surface px-3";

export function PlanBuilder() {
  const [scope, setScope] = useState<ScopeId>("nt");
  const [durId, setDurId] = useState<string>("3m");
  const [start, setStart] = useState(today());
  const days = DURATIONS.find((d) => d.id === durId)?.days ?? 90;
  const plan = useMemo(() => generatePlan(SCOPES[scope].books, days, start), [scope, days, start]);
  const perDay = (plan.totalChapters / days).toFixed(1);
  const rest = plan.days.filter((d) => d.rest).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">Programme
          <select className={field} value={scope} onChange={(e) => setScope(e.target.value as ScopeId)}>
            {Object.entries(SCOPES).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
          </select>
        </label>
        <label className="text-sm">Durée
          <select className={field} value={durId} onChange={(e) => setDurId(e.target.value)}>
            {DURATIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        <label className="text-sm">Date de début
          <input type="date" className={field} value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </label>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5" aria-live="polite">
        <p className="font-reading text-xl">{plan.totalChapters} chapitres sur {days} jours</p>
        <p className="mt-1 text-sm text-muted">
          Environ {perDay} chapitre(s) par jour. Fin prévue le {plan.days[plan.days.length - 1]?.date}.
          {rest > 0 && ` ${rest} jour(s) sans lecture, car il y a plus de jours que de chapitres.`}
        </p>
        <h2 className="mt-4 text-sm font-semibold">Les 7 premiers jours</h2>
        <ol className="mt-2 divide-y divide-line">
          {plan.days.slice(0, 7).map((d) => (
            <li key={d.dayIndex} className="flex justify-between gap-3 py-2 text-sm">
              <span className="text-muted">Jour {d.dayIndex + 1}</span>
              <span className="text-right">{d.rest ? "Repos" : d.passages.map((p) => label(p.book, p.from, p.to)).join(", ")}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className="text-sm text-muted">L’enregistrement du défi sera disponible après la connexion à Supabase (phase suivante). Cet aperçu est calculé sur votre appareil, sans Internet.</p>
    </div>
  );
}

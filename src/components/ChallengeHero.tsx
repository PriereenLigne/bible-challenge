import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProgressRing } from "@/components/ProgressRing";

export interface HeroProps {
  firstName: string; title: string; teamName?: string | null;
  dayNumber: number; totalDays: number; percent: number; daysDone: number; streak: number;
  rankText: string | null; cta: { label: string; href: string };
}
const longDate = () => new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function ChallengeHero(p: HeroProps) {
  return (
    <section className="hero animate-fade-up" aria-label="Votre défi en cours">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] muted capitalize">{longDate()}</p>
          <h1 className="mt-1 truncate font-reading text-[1.65rem] font-semibold leading-tight">Bonjour {p.firstName}</h1>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur" title="Jours de lecture consécutifs">
          <Icon name="flame" size={16} filled className="text-sand" />{p.streak}<span className="sr-only"> jour(s) consécutif(s)</span>
        </span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <ProgressRing value={p.percent} size={116} stroke={10} label="Contenu lu">
          <span className="text-center"><span className="block font-reading text-[2rem] font-semibold leading-none">{Math.round(p.percent)}<span className="text-base">%</span></span><span className="mt-0.5 block text-[0.65rem] uppercase tracking-widest muted">lu</span></span>
        </ProgressRing>
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm muted">{p.title}</p>
          <p className="font-reading text-xl font-semibold">Jour {p.dayNumber} <span className="text-base font-normal muted">sur {p.totalDays}</span></p>
          <p className="text-sm muted">{p.daysDone} jour{p.daysDone > 1 ? "s" : ""} terminé{p.daysDone > 1 ? "s" : ""}</p>
          {p.rankText && <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold"><Icon name="trophy" size={13} className="text-sand" />{p.rankText}</p>}
        </div>
      </div>

      <Link href={p.cta.href} className="btn-sand mt-5 w-full">{p.cta.label}<Icon name="chevron-right" size={18} /></Link>
    </section>
  );
}

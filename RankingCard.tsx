"use client";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { rankMembers, ordinalFr, type RankedMember } from "@/lib/ranking/rank";
import type { MemberProgress } from "@/lib/teams/stats";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const HEIGHT: Record<number, string> = { 1: "h-24", 2: "h-20", 3: "h-16" };

function Row({ m, totalDays }: { m: RankedMember; totalDays: number }) {
  const pct = totalDays > 0 ? Math.min(100, (m.daysDone / totalDays) * 100) : 0;
  return (
    <li className={`flex items-center gap-3 rounded-2xl p-2.5 ${m.isMe ? "bg-sand/30 ring-1 ring-sand" : ""}`}>
      <span className="w-8 text-center font-reading text-lg font-semibold text-muted">{ordinalFr(m.rank)}</span>
      <Avatar name={m.name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{m.name}{m.isMe ? " (vous)" : ""}</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-progress" style={{ width: `${pct}%` }} /></div>
      </div>
      <p className="text-right text-xs text-muted"><span className="block font-semibold text-ink">{m.daysDone} j</span>{m.chaptersRead} ch.</p>
    </li>
  );
}

export function RankingCard({ rows, myId, teamName, showRanking, totalDays, stale }: { rows: readonly MemberProgress[]; myId: string; teamName: string; showRanking: boolean; totalDays: number; stale?: string | null }) {
  const [all, setAll] = useState(false);
  const r = useMemo(() => rankMembers(rows, myId), [rows, myId]);

  const podium = useMemo(() => {
    const top = r.ranked.filter((m) => m.rank <= 3);
    return top.length === 3 && new Set(top.map((m) => m.rank)).size === 3 ? [top[1], top[0], top[2]] as RankedMember[] : top;
  }, [r.ranked]);
  const meOutside = r.me && r.me.rank > 3 ? r.me : null;
  const rest = r.ranked.filter((m) => m.rank > 3);

  return (
    <section className="card animate-fade-up" aria-label={`Classement de l’équipe ${teamName}`}>
      <div className="flex items-center justify-between gap-2">
        <div><p className="eyebrow">Classement</p><h2 className="font-reading text-xl font-semibold">{teamName}</h2></div>
        <Icon name="trophy" size={26} className="text-gold" />
      </div>

      {!showRanking ? <p className="mt-3 text-sm text-muted">Les responsables ont désactivé le classement : vous lisez ensemble, sans comparaison.</p> : r.ranked.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Personne n’a encore partagé sa progression. Le classement apparaîtra dès les premières lectures.</p>
      ) : (
        <>
          <div className="mt-5 flex items-end justify-center gap-3">
            {podium.map((m) => (
              <div key={m.userId} className="flex w-24 flex-col items-center text-center">
                <span className="text-2xl" aria-hidden="true">{MEDAL[m.rank]}</span>
                <Avatar name={m.name} size={m.rank === 1 ? 52 : 44} ring={m.rank === 1} />
                <p className="mt-1 w-full truncate text-xs font-semibold">{m.name}{m.isMe ? " (vous)" : ""}</p>
                <div className={`mt-1 flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-b from-sand/70 to-sand/20 pt-2 ${HEIGHT[m.rank] ?? "h-14"}`}>
                  <span className="font-reading text-sm font-semibold">{m.daysDone} j</span>
                </div>
              </div>
            ))}
          </div>

          {r.hint && <p className="mt-4 rounded-2xl bg-progress/10 px-4 py-3 text-center text-sm font-medium text-progress">{r.hint}</p>}

          {(meOutside || (all && rest.length > 0)) && (
            <ul className="mt-3 space-y-1">
              {(all ? rest : meOutside ? [meOutside] : []).map((m) => <Row key={m.userId} m={m} totalDays={totalDays} />)}
            </ul>
          )}
          {rest.length > 0 && <button type="button" onClick={() => setAll(!all)} className="mt-2 min-h-11 w-full text-sm font-medium text-calm underline">{all ? "Réduire" : "Voir tout le classement"}</button>}
        </>
      )}

      {r.notSharing.length > 0 && showRanking && <p className="mt-3 text-xs text-muted">{r.notSharing.length} membre{r.notSharing.length > 1 ? "s" : ""} ne partage{r.notSharing.length > 1 ? "nt" : ""} pas sa progression (non classé{r.notSharing.length > 1 ? "s" : ""}).</p>}
      <p className="mt-3 text-[0.7rem] leading-relaxed text-muted">Classement par jours terminés (lecture et quiz), puis par chapitres lus. Il est facultatif : chacun peut masquer sa progression.{stale ? ` Dernière mise à jour : ${stale}.` : ""}</p>
    </section>
  );
}

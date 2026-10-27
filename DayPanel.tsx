"use client";
import Link from "next/link";
import { DayQuiz } from "@/components/DayQuiz";
import { Icon } from "@/components/Icon";
import { NoteBlock } from "@/components/NoteBlock";
import { BOOK_BY_ID } from "@/lib/bible/canon";
import { readerHref } from "@/lib/bible/params";
import { chaptersOfDay, type DayStatus } from "@/lib/challenges/day-status";
import { readKey, type DayDone, type LocalRead } from "@/lib/offline/local-db";
import type { GeneratedPlan } from "@/lib/plans/generate";

const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const CELL: Record<DayStatus, string> = {
  done: "bg-progress text-white", quiz: "border-2 border-progress text-progress", partial: "bg-sand/60", todo: "border border-line text-muted", rest: "border border-dashed border-line text-muted/60",
};
const CELL_LABEL: Record<DayStatus, string> = { done: "terminé", quiz: "quiz à passer", partial: "lecture commencée", todo: "à faire", rest: "repos" };
const arrow = "flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface shadow-card transition active:scale-95 disabled:opacity-40";

export interface DayPanelProps {
  cid: string; plan: GeneratedPlan; reads: Map<string, LocalRead>; done: Map<number, DayDone>;
  dayIdx: number; todayIdx: number; rawIdx: number; statuses: DayStatus[];
  onSelect: (i: number | null) => void; onMark: (book: string, chapter: number) => void; onDayDone: (d: DayDone) => void;
}

export function DayPanel({ cid, plan, reads, done, dayIdx, todayIdx, rawIdx, statuses, onSelect, onMark, onDayDone }: DayPanelProps) {
  const total = plan.days.length;
  const day = plan.days[dayIdx]!;
  const chapters = chaptersOfDay(day);
  const readCount = chapters.filter((c) => reads.has(readKey(cid, c.book, c.chapter))).length;
  const allRead = chapters.length > 0 && readCount === chapters.length;
  const dayDone = done.get(dayIdx);
  const isToday = dayIdx === todayIdx && rawIdx >= 0 && rawIdx < total;

  return (
    <section id="lecture" className="space-y-4 scroll-mt-20" aria-label="Lecture du jour">
      <div className="card animate-fade-up">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={arrow} aria-label="Jour précédent" disabled={dayIdx <= 0} onClick={() => onSelect(dayIdx - 1)}><Icon name="chevron-left" size={22} /></button>
          <div className="text-center">
            <p className="font-reading text-xl font-semibold">Jour {dayIdx + 1} <span className="text-sm font-normal text-muted">sur {total}</span></p>
            <p className="text-xs capitalize text-muted">{longDate(day.date)}{isToday ? " · aujourd’hui" : ""}</p>
          </div>
          <button type="button" className={arrow} aria-label="Jour suivant" disabled={dayIdx >= total - 1} onClick={() => onSelect(dayIdx + 1)}><Icon name="chevron-right" size={22} /></button>
        </div>
        {dayIdx !== todayIdx && <button type="button" onClick={() => onSelect(null)} className="mt-2 min-h-11 w-full text-sm font-medium text-calm underline">Revenir à aujourd’hui</button>}
        {rawIdx < 0 && <p className="mt-2 text-center text-sm text-calm">Le défi commence dans {-rawIdx} jour(s). Vous pouvez déjà prendre de l’avance.</p>}
        {rawIdx >= total && <p className="mt-2 text-center text-sm text-calm">Le calendrier prévu est terminé. Poursuivez à votre rythme.</p>}

        {day.rest ? <p className="mt-4 rounded-2xl bg-bg p-4 text-center text-sm text-muted">Jour de repos : aucune lecture prévue. Profitez-en pour méditer ou relire.</p> : (
          <>
            <div className="mt-4 flex items-center justify-between text-xs text-muted"><span>{readCount} / {chapters.length} chapitre{chapters.length > 1 ? "s" : ""} lu{readCount > 1 ? "s" : ""}</span>{allRead ? <span className="font-semibold text-progress">Lecture terminée ✓</span> : chapters[0] && <Link href={readerHref(chapters[0].book, chapters[0].chapter, cid)} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-calm"><Icon name="headphones" size={16} />Écouter</Link>}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-progress transition-all duration-700" style={{ width: `${chapters.length ? (readCount / chapters.length) * 100 : 0}%` }} /></div>
            <ul className="mt-4 space-y-2">
              {chapters.map(({ book, chapter }) => {
                const isRead = reads.has(readKey(cid, book, chapter));
                return (
                  <li key={`${book}:${chapter}`} className={`flex items-center gap-3 rounded-2xl border p-2.5 transition ${isRead ? "border-progress/30 bg-progress/10" : "border-line bg-bg/60"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isRead ? "bg-progress text-white animate-pop" : "border border-line bg-surface text-muted"}`}><Icon name={isRead ? "check" : "book"} size={17} strokeWidth={2.2} /></span>
                    <Link href={readerHref(book, chapter, cid)} className="min-h-11 flex-1 py-2.5 font-reading text-lg leading-none">{BOOK_BY_ID.get(book)?.name ?? book} {chapter}</Link>
                    <button type="button" disabled={isRead} onClick={() => onMark(book, chapter)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition active:scale-95 ${isRead ? "text-progress" : "bg-forest text-bg"}`}>{isRead ? "Lu" : "Marquer lu"}</button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {!day.rest && (dayDone ? (
        <div className="animate-pop flex items-center gap-3 rounded-3xl bg-progress p-4 text-white shadow-lift">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20"><Icon name="award" size={24} /></span>
          <div><p className="font-reading text-lg font-semibold">Jour {dayIdx + 1} terminé</p><p className="text-sm text-white/85">Quiz réussi : {dayDone.score} sur {dayDone.total}</p></div>
        </div>
      ) : allRead ? (
        <DayQuiz key={`${cid}:${dayIdx}`} challengeId={cid} dayIndex={dayIdx} chapters={chapters} onCompleted={onDayDone} />
      ) : (
        <div className="flex items-center gap-3 rounded-3xl border border-dashed border-line p-4 text-sm text-muted"><Icon name="lock" size={20} /><p>Le quiz du jour s’ouvre dès que tous les chapitres sont marqués comme lus.</p></div>
      ))}

      {!day.rest && <NoteBlock refKey={`day:${cid}:${dayIdx}`} title="Ma méditation du jour" placeholder="Qu’est-ce que Dieu vous a dit à travers ces passages ? Une phrase, une prière, une décision…" />}

      <details className="card group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-medium"><span className="flex items-center gap-2"><Icon name="calendar" size={18} />Tous les jours</span><Icon name="chevron-right" size={18} className="transition group-open:rotate-90" /></summary>
        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-10">
          {plan.days.map((d, i) => (
            <button key={d.dayIndex} type="button" onClick={() => onSelect(i)} aria-label={`Jour ${i + 1}, ${CELL_LABEL[statuses[i] ?? "todo"]}`} aria-current={i === dayIdx ? "true" : undefined}
              className={`min-h-10 rounded-xl text-xs font-medium transition active:scale-95 ${CELL[statuses[i] ?? "todo"]} ${i === dayIdx ? "ring-2 ring-calm" : ""} ${i === todayIdx && rawIdx >= 0 && rawIdx < total ? "font-bold underline decoration-2 underline-offset-2" : ""}`}>{i + 1}</button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Plein : terminé · cadre épais : quiz à passer · sable : commencé · cadre fin : à faire · pointillé : repos.</p>
      </details>
    </section>
  );
}

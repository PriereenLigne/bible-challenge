"use client";
import { useCallback, useEffect, useState } from "react";
import { daysStore, marksStore, notesStore, readsStore } from "@/lib/offline/local-db";
import { isActive } from "@/lib/marks/types";
import type { DayInput, ReadInput } from "@/lib/stats/dashboard";

export interface LocalData { reads: ReadInput[]; days: DayInput[]; noteTimes: number[]; notesCount: number; favoritesCount: number }

/** Données personnelles lues sur l'appareil (fonctionne hors connexion). */
export function useUserStats() {
  const [data, setData] = useState<LocalData | null>(null);
  const reload = useCallback(async () => {
    try {
      const [reads, days, notes, marks] = await Promise.all([readsStore.all(), daysStore.all(), notesStore.all(), marksStore.all()]);
      const filled = notes.filter((n) => n.body.trim() !== "");
      setData({
        reads: reads.map((r) => ({ challengeId: r.challengeId, book: r.book, chapter: r.chapter, readOn: r.readOn })),
        days: days.map((d) => ({ challengeId: d.challengeId, dayIndex: d.dayIndex, doneOn: d.doneOn, score: d.score, total: d.total })),
        noteTimes: filled.map((n) => n.updatedAt), notesCount: filled.length,
        favoritesCount: marks.filter((m) => m.favorite).length,
      });
    } catch (e) { console.error("Statistiques locales :", e); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { data, reload };
}

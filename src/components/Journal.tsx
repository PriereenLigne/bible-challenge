"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NoteBlock } from "@/components/NoteBlock";
import { Notice } from "@/components/Notice";
import { kv, notesStore } from "@/lib/offline/local-db";
import { runSync } from "@/lib/offline/mark-read";
import { describeRef, exportNotesText, searchNotes, type JournalNote } from "@/lib/notes/journal";
import type { ChallengeLite } from "@/lib/challenges/active";

export function Journal() {
  const [notes, setNotes] = useState<JournalNote[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const all = (await notesStore.all()).map((n) => ({ refKey: n.refKey, body: n.body, updatedAt: n.updatedAt }));
      const t: Record<string, string> = {};
      for (const n of all) { const m = /^day:([0-9a-f-]{36}):/.exec(n.refKey); if (m?.[1] && !t[m[1]]) { const c = await kv.get<ChallengeLite>(`challenge:${m[1]}`); if (c) t[m[1]] = c.title; } }
      setTitles(t); setNotes(all);
    } catch (e) { setError(`Lecture du journal : ${(e as Error).message}`); }
  }, []);
  useEffect(() => { void reload().then(() => runSync()).then(() => reload()).catch((e) => console.error("Journal :", e)); }, [reload]); // affiche tout de suite le local, puis fusionne avec le serveur

  const labelOf = useCallback((n: { refKey: string }) => describeRef(n.refKey, titles[/^day:([0-9a-f-]{36}):/.exec(n.refKey)?.[1] ?? ""]).label, [titles]);
  const shown = useMemo(() => searchNotes(notes ?? [], q, labelOf), [notes, q, labelOf]);

  function exportAll() {
    const text = exportNotesText(searchNotes(notes ?? [], "", labelOf), labelOf, new Date());
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "bible-challenge-journal.txt"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  if (notes === null) return error ? <p role="alert" className="text-sm text-calm">{error}</p> : <p className="text-sm text-muted">Chargement…</p>;
  if (notes.every((n) => n.body.trim() === "")) return <Notice title="Votre journal est vide"><p>Les notes que vous écrivez sous un chapitre ou dans « Ma méditation du jour » apparaîtront ici.</p></Notice>;

  return (
    <div className="space-y-4">
      <label className="block text-sm">Rechercher dans mes notes
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Un mot, un livre, un défi…" className="mt-1 block min-h-12 w-full rounded-xl border border-line bg-surface px-3" />
      </label>
      <p className="text-sm text-muted">{shown.length} note(s) · privées, visibles uniquement par vous.</p>
      <ul className="space-y-3">
        {shown.map((n) => {
          const ref = describeRef(n.refKey, titles[/^day:([0-9a-f-]{36}):/.exec(n.refKey)?.[1] ?? ""]);
          const isOpen = open === n.refKey;
          return (
            <li key={n.refKey} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-medium">{ref.label}</h2>
                {n.updatedAt > 0 && <span className="text-xs text-muted">{new Date(n.updatedAt).toLocaleDateString("fr-FR")}</span>}
              </div>
              {!isOpen && <p className="mt-1 line-clamp-2 whitespace-pre-line font-reading text-muted">{n.body}</p>}
              {isOpen && <div className="mt-2"><NoteBlock refKey={n.refKey} title="Modifier cette note" /></div>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="min-h-11 rounded-xl border border-line px-4 text-sm" onClick={() => { setOpen(isOpen ? null : n.refKey); if (isOpen) void reload(); }}>{isOpen ? "Fermer" : "Ouvrir"}</button>
                {ref.href && <Link href={ref.href} className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm">Lire le chapitre</Link>}
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={exportAll} className="min-h-12 w-full rounded-xl border border-line px-5 font-medium">Exporter mes notes (.txt)</button>
      {error && <p role="alert" className="text-sm text-calm">{error}</p>}
    </div>
  );
}

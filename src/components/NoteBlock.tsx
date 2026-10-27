"use client";
import { useEffect, useRef, useState } from "react";
import { notesStore } from "@/lib/offline/local-db";
import { saveNote } from "@/lib/notes/client";
import { runSync } from "@/lib/offline/mark-read";

/** Bloc-notes privé : enregistré sur l'appareil à chaque pause de frappe, synchronisé ensuite. Fonctionne hors connexion. */
export function NoteBlock({ refKey, title, placeholder }: { refKey: string; title: string; placeholder?: string }) {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const latest = useRef(""); const dirty = useRef(false); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current) return;
    dirty.current = false;
    const body = latest.current;
    try {
      await saveNote(refKey, body);
      setStatus("Enregistré sur l’appareil");
      await runSync();
      const n = await notesStore.get(refKey); // une fusion a pu avoir lieu (modification faite sur un autre appareil)
      if (n && !dirty.current && n.body !== latest.current) { latest.current = n.body; setText(n.body); setStatus("Une version écrite sur un autre appareil a été fusionnée avec la vôtre : rien n’est perdu."); }
      else if (n && !n.dirty) setStatus("Enregistré et synchronisé");
    } catch (e) { setStatus(`Enregistrement impossible : ${(e as Error).message}`); }
  }

  useEffect(() => {
    let active = true; setLoaded(false); dirty.current = false;
    notesStore.get(refKey).then((n) => { if (!active) return; latest.current = n?.body ?? ""; setText(latest.current); setStatus(n && n.dirty ? "En attente de synchronisation" : ""); setLoaded(true); })
      .catch((e) => { if (active) setStatus(`Lecture de la note impossible : ${(e as Error).message}`); });
    return () => { active = false; void flush(); }; // ne perd pas un texte en cours de frappe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <label className="block text-sm font-semibold" htmlFor={`note-${refKey}`}>{title}</label>
      <textarea id={`note-${refKey}`} disabled={!loaded} value={text} rows={5} maxLength={20000} placeholder={placeholder ?? "Écrivez ici ce qui vous a marqué…"}
        onChange={(e) => { setText(e.target.value); latest.current = e.target.value; dirty.current = true; setStatus("…"); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void flush(), 900); }}
        onBlur={() => void flush()}
        className="mt-2 block w-full rounded-xl border border-line bg-bg p-3 font-reading leading-relaxed" />
      <p role="status" className="mt-1 min-h-5 text-xs text-muted">{status || "Privée : visible uniquement par vous."}</p>
    </section>
  );
}

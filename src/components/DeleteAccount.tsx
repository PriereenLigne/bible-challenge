"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/reader/Sheet";
import { getSupabase } from "@/lib/supabase/client";
import { LEGAL } from "@/lib/legal";

const WORD = "SUPPRIMER";

/** Efface toutes les données personnelles gardées sur cet appareil (le texte biblique téléchargé reste). */
async function clearDevice(): Promise<void> {
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase("bible-challenge"); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  try { for (const k of Object.keys(localStorage)) if (k.startsWith("bc-") || k.startsWith("sb-")) localStorage.removeItem(k); } catch { /* stockage indisponible */ }
  try { if (typeof caches !== "undefined") await caches.delete("bc-audio-v1"); } catch { /* rien à effacer */ }
}

/** Suppression définitive du compte, avec confirmation explicite. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    const sb = getSupabase(); if (!sb) return;
    setBusy(true); setErr(null);
    try {
      const { error } = await sb.rpc("delete_my_account");
      if (error) {
        const missing = /delete_my_account|function|schema cache/i.test(error.message);
        throw new Error(missing ? `La suppression depuis l’application n’est pas encore activée sur le serveur. Écrivez-nous à ${LEGAL.email} : nous supprimerons votre compte sous 30 jours.` : error.message);
      }
      await sb.auth.signOut().catch(() => {});
      await clearDevice();
      setDone(true);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setTyped(""); setErr(null); }} className="mx-auto flex min-h-11 items-center gap-1.5 text-sm text-muted underline">Supprimer mon compte</button>
      <Sheet open={open} onClose={() => { if (done) window.location.assign("/"); else if (!busy) setOpen(false); }} title={done ? "Compte supprimé" : "Supprimer mon compte"}>
        {done ? (
          <div className="space-y-4 pt-2 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-progress/15 text-progress"><Icon name="check" size={28} strokeWidth={2.4} /></span>
            <p>Votre compte et toutes vos données ont été supprimés. Merci d’avoir lu la Parole avec nous.</p>
            <button type="button" onClick={() => window.location.assign("/")} className="btn w-full bg-forest text-bg">Revenir à l’accueil</button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <p className="text-sm leading-relaxed">Cette action est <strong>définitive</strong>. Seront effacés : votre compte, vos défis et votre progression, vos notes, vos favoris et surlignages, et votre place dans vos équipes.</p>
            <p className="text-sm leading-relaxed text-muted">Si vous avez créé une équipe, elle est confiée à un autre membre ; si vous y étiez seul, elle est supprimée. Pensez à exporter vos notes depuis « Mon journal » si vous souhaitez les garder.</p>
            <label className="block text-sm">Pour confirmer, tapez <strong>{WORD}</strong>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false}
                className="mt-1 block min-h-12 w-full rounded-2xl border border-line bg-bg px-3 text-base tracking-widest" />
            </label>
            <button type="button" disabled={busy || typed.trim().toUpperCase() !== WORD} onClick={() => void run()}
              className="btn w-full bg-rose-600 text-white disabled:opacity-40">{busy ? "Suppression…" : "Supprimer définitivement"}</button>
            {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn-ghost w-full">Annuler</button>
          </div>
        )}
      </Sheet>
    </>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { PROTESTANT_CANON } from "@/lib/bible/canon";
import { cacheSupported, downloadVersion, downloadedBooks, removeDownload, type BibleVersion } from "@/lib/bible/store";

const IDS = PROTESTANT_CANON.map((b) => b.id);

export function DownloadPanel({ version }: { version: BibleVersion }) {
  const [have, setHave] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = useCallback(() => { downloadedBooks(version, IDS).then(setHave).catch((e) => setMsg(`Lecture du stockage : ${(e as Error).message}`)); }, [version]);
  useEffect(refresh, [refresh]);

  async function start() {
    setBusy(true); setMsg(null);
    try { await downloadVersion(version, IDS, setHave); setMsg("Traduction téléchargée : lisible sans connexion."); }
    catch (e) { setMsg(`${(e as Error).message} Vous pouvez relancer : les livres déjà téléchargés sont conservés.`); refresh(); }
    finally { setBusy(false); }
  }
  async function remove() { await removeDownload(version); setHave(0); setMsg("Téléchargement supprimé. Vos notes et votre progression ne sont pas touchées."); }

  const mb = (version.sizeBytes / 1e6).toFixed(1);
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">Mes téléchargements</h2>
      {!version.allowOffline ? <p className="mt-2 text-sm text-muted">Le téléchargement hors connexion n’est pas autorisé pour cette traduction.</p>
        : !cacheSupported() ? <p className="mt-2 text-sm text-muted">Le stockage hors connexion n’est pas disponible dans ce navigateur.</p>
        : (
          <>
            <p className="mt-2 text-sm text-muted">{version.name} : {have}/66 livres sur l’appareil. Taille complète estimée : {mb} Mo.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {have < 66 && <button type="button" onClick={start} disabled={busy} className="min-h-12 rounded-xl bg-forest px-5 font-medium text-bg disabled:opacity-60">{busy ? `Téléchargement… ${have}/66` : have > 0 ? "Reprendre le téléchargement" : "Télécharger toute la Bible"}</button>}
              {have > 0 && !busy && <button type="button" onClick={() => void remove()} className="min-h-12 rounded-xl border border-line px-5 font-medium">Supprimer</button>}
            </div>
          </>
        )}
      {msg && <p role="status" className="mt-3 text-sm text-calm">{msg}</p>}
    </section>
  );
}

"use client";
import { DownloadPanel } from "@/components/DownloadPanel";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet } from "@/components/reader/Sheet";
import type { BibleVersion } from "@/lib/bible/store";
import { LINE_HEIGHT, SIZE_MAX, SIZE_MIN, type Leading, type ReaderPrefs, type ReadingFont } from "@/lib/reader/prefs";

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-2xl border border-line bg-bg p-1">
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`min-h-11 flex-1 rounded-xl text-sm font-medium transition ${value === v ? "bg-surface text-ink shadow-card" : "text-muted"}`}>{text}</button>
      ))}
    </div>
  );
}

/** Réglages d'affichage, avec aperçu immédiat, puis apparence et lecture hors connexion. */
export function ReaderSettings({ open, onClose, prefs, onChange, version }: {
  open: boolean; onClose: () => void; prefs: ReaderPrefs; onChange: (p: ReaderPrefs) => void; version: BibleVersion;
}) {
  const set = <K extends keyof ReaderPrefs>(k: K, v: ReaderPrefs[K]) => onChange({ ...prefs, [k]: v });
  const round = "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-bg font-semibold transition active:scale-95 disabled:opacity-40";
  return (
    <Sheet open={open} onClose={onClose} title="Affichage">
      <div className="space-y-6 pt-1">
        <p className={`rounded-2xl bg-bg px-4 py-3 text-center ${prefs.font === "serif" ? "font-reading" : "font-ui"}`} style={{ fontSize: prefs.size, lineHeight: LINE_HEIGHT[prefs.leading] }}>
          L’Éternel est mon berger : je ne manquerai de rien.
        </p>

        <div>
          <p className="eyebrow mb-2">Taille du texte</p>
          <div className="flex items-center gap-3">
            <button type="button" className={`${round} text-sm`} aria-label="Texte plus petit" disabled={prefs.size <= SIZE_MIN} onClick={() => set("size", Math.max(SIZE_MIN, prefs.size - 1))}>A</button>
            <input type="range" min={SIZE_MIN} max={SIZE_MAX} step={1} value={prefs.size} aria-label="Taille du texte" onChange={(e) => set("size", Number(e.target.value))} className="h-2 flex-1 accent-[rgb(var(--c-progress))]" />
            <button type="button" className={`${round} text-xl`} aria-label="Texte plus grand" disabled={prefs.size >= SIZE_MAX} onClick={() => set("size", Math.min(SIZE_MAX, prefs.size + 1))}>A</button>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">Espacement des lignes</p>
          <Segmented<Leading> label="Espacement des lignes" value={prefs.leading} onChange={(v) => set("leading", v)} options={[["compact", "Serré"], ["normal", "Normal"], ["airy", "Aéré"]]} />
        </div>

        <div>
          <p className="eyebrow mb-2">Police</p>
          <Segmented<ReadingFont> label="Police" value={prefs.font} onChange={(v) => set("font", v)} options={[["serif", "Classique"], ["sans", "Moderne"]]} />
        </div>

        <label className="flex min-h-12 items-center justify-between gap-3">
          <span className="font-medium">Numéros des versets</span>
          <input type="checkbox" role="switch" checked={prefs.numbers} onChange={(e) => set("numbers", e.target.checked)} className="h-6 w-6 accent-[rgb(var(--c-progress))]" />
        </label>

        <div>
          <p className="eyebrow mb-2">Apparence</p>
          <ThemeToggle />
        </div>

        <div>
          <p className="eyebrow mb-2 flex items-center gap-1.5"><Icon name="download" size={14} />Lire sans connexion</p>
          <DownloadPanel version={version} bare />
        </div>

        <p className="text-center text-xs leading-relaxed text-muted">{version.name} · {version.attribution}</p>
      </div>
    </Sheet>
  );
}

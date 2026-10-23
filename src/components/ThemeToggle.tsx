"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

type Mode = "auto" | "light" | "dark";
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("auto");
  useEffect(() => { try { const t = localStorage.getItem("bc-theme"); if (t === "light" || t === "dark") setMode(t); } catch (e) { console.error("Thème :", e); } }, []);
  function apply(m: Mode) {
    setMode(m);
    try {
      if (m === "auto") { localStorage.removeItem("bc-theme"); delete document.documentElement.dataset.theme; }
      else { localStorage.setItem("bc-theme", m); document.documentElement.dataset.theme = m; }
    } catch (e) { console.error("Thème non mémorisé :", e); }
  }
  const opts: { m: Mode; label: string; icon: "sun" | "moon" | null }[] = [{ m: "auto", label: "Auto", icon: null }, { m: "light", label: "Clair", icon: "sun" }, { m: "dark", label: "Sombre", icon: "moon" }];
  return (
    <div role="radiogroup" aria-label="Apparence" className="flex rounded-2xl border border-line bg-bg p-1">
      {opts.map((o) => (
        <button key={o.m} type="button" role="radio" aria-checked={mode === o.m} onClick={() => apply(o.m)}
          className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition ${mode === o.m ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
          {o.icon && <Icon name={o.icon} size={16} />}{o.label}
        </button>
      ))}
    </div>
  );
}

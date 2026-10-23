"use client";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { ChallengeLite } from "@/lib/challenges/active";

export function ChallengeSwitcher({ challenges, selectedId, onSelect }: { challenges: ChallengeLite[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <nav aria-label="Mes défis" className="-mx-4 overflow-x-auto px-4 no-scrollbar">
      <ul className="flex w-max gap-2 pb-1">
        {challenges.map((c) => {
          const on = c.id === selectedId;
          return (
            <li key={c.id}>
              <button type="button" onClick={() => onSelect(c.id)} aria-pressed={on}
                className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition active:scale-[.97] ${on ? "border-transparent bg-forest text-bg shadow-lift" : "border-line bg-surface text-ink hover:bg-bg"}`}>
                {c.team_id && <Icon name="users" size={15} />}
                <span className="max-w-[11rem] truncate">{c.title}</span>
              </button>
            </li>
          );
        })}
        <li><Link href="/defis" className="chip min-h-11 text-muted hover:text-ink"><Icon name="plus" size={16} />Nouveau</Link></li>
      </ul>
    </nav>
  );
}

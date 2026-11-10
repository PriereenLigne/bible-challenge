"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { BOOK_BY_ID } from "@/lib/bible/canon";
import { kv } from "@/lib/offline/local-db";

/** « Reprendre ma lecture » : rouvre le lecteur exactement là où l'on s'était arrêté. */
export function ResumeReading() {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    kv.get<{ pos?: { book: string; chapter: number } }>("reader:last").then((l) => {
      const b = l?.pos ? BOOK_BY_ID.get(l.pos.book) : undefined;
      if (b && l?.pos) setLabel(`${b.name} ${l.pos.chapter}`);
    }).catch(() => {});
  }, []);
  if (!label) return null;
  return (
    <Link href="/lire" className="card flex items-center gap-3 transition active:scale-[.99]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand/50 text-forest"><Icon name="book" size={22} /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm text-muted">Reprendre ma lecture</span><span className="block truncate font-reading text-lg font-semibold">{label}</span></span>
      <Icon name="chevron-right" size={18} className="text-muted" />
    </Link>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/lire", label: "Lire", icon: "book" },
  { href: "/defis", label: "Défis", icon: "flag" },
  { href: "/communaute", label: "Équipes", icon: "users" },
  { href: "/profil", label: "Profil", icon: "user" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-40 px-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}>
      <ul className="mx-auto flex max-w-md items-center justify-between rounded-[1.6rem] border border-line bg-surface/90 p-1.5 shadow-lift backdrop-blur-xl">
        {ITEMS.map((i) => {
          const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <li key={i.href} className="flex-1">
              <Link href={i.href} aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.68rem] font-medium transition ${active ? "bg-forest/10 text-forest" : "text-muted hover:text-ink"}`}>
                <Icon name={i.icon} size={22} filled={active && i.icon !== "book" && i.icon !== "flag"} strokeWidth={active ? 2.1 : 1.7} />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import Link from "next/link";
import { Icon } from "@/components/Icon";

export function ReminderBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <aside className="animate-fade-up flex items-center gap-3 rounded-3xl border border-sand bg-sand/25 p-4" role="status">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand/60 text-forest"><Icon name="bell" size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">C’est l’heure de votre lecture 🌿</p>
        <p className="text-sm text-muted">Quelques minutes suffisent. <Link href="/profil/rappels" className="underline">Régler mes rappels</Link></p>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Masquer le rappel" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sand/40"><Icon name="x" size={18} /></button>
    </aside>
  );
}

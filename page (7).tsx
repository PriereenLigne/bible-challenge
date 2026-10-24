import Link from "next/link";
import { FavoritesView } from "@/components/FavoritesView";
export const metadata = { title: "Favoris et surlignages · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <Link href="/profil" className="text-sm text-calm underline">← Tableau de bord</Link>
      <h1 className="font-reading text-3xl font-semibold text-forest">Mes versets</h1>
      <FavoritesView />
    </div>
  );
}

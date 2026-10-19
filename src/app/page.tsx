import Link from "next/link";
import { Notice } from "@/components/Notice";

export default function Home() {
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Bonjour</h1>
      <Notice title="Aucun défi en cours">
        <p>Choisissez un programme et une durée : le calendrier de lecture est généré pour vous, jour après jour.</p>
        <Link href="/defis" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-forest px-5 font-medium text-bg">Choisir un programme</Link>
      </Notice>
      <Notice title="État de la synchronisation">
        <p>Aucune modification locale en attente.</p>
      </Notice>
    </div>
  );
}

import { Notice } from "@/components/Notice";
export const metadata = { title: "Profil · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Profil</h1>
      <Notice title="Pas encore disponible">
        <p>La connexion, les préférences et la confidentialité arrivent avec l’authentification Supabase (phase 2).</p>
      </Notice>
    </div>
  );
}

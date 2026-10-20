import { Notice } from "@/components/Notice";
export const metadata = { title: "Lire · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Lire</h1>
      <Notice title="Aucun texte biblique installé">
        <p>Le lecteur attend une traduction dont la licence autorise la reproduction et le téléchargement hors connexion. Aucun texte n’est intégré tant que cette autorisation n’est pas enregistrée dans le registre des licences.</p>
      </Notice>
    </div>
  );
}

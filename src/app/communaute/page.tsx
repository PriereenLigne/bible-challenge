import { Notice } from "@/components/Notice";
export const metadata = { title: "Communauté · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Communauté</h1>
      <Notice title="Pas encore disponible">
        <p>Les équipes, invitations et défis partagés arrivent en phase 5. Ils nécessitent la base de données et l’authentification.</p>
      </Notice>
    </div>
  );
}

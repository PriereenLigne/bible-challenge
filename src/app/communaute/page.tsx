import { TeamsHome } from "@/components/TeamsHome";
export const metadata = { title: "Communauté · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Communauté</h1>
      <TeamsHome />
    </div>
  );
}

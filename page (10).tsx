import { PlanBuilder } from "@/components/PlanBuilder";
export const metadata = { title: "Défis · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Choisir un programme</h1>
      <PlanBuilder />
    </div>
  );
}

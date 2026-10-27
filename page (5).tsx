import { BibleReader } from "@/components/BibleReader";
export const metadata = { title: "Lire · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <BibleReader />
    </div>
  );
}

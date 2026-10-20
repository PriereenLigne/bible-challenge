import { BibleReader } from "@/components/BibleReader";
export const metadata = { title: "Lire · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="sr-only">Lire</h1>
      <BibleReader />
    </div>
  );
}

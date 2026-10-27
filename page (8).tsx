import Link from "next/link";
import { Journal } from "@/components/Journal";
export const metadata = { title: "Mon journal · Bible Challenge" };
export default function Page() {
  return (
    <div className="space-y-5">
      <Link href="/profil" className="text-sm text-calm underline">← Profil</Link>
      <h1 className="font-reading text-3xl font-semibold text-forest">Mon journal</h1>
      <Journal />
    </div>
  );
}

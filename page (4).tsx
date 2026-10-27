import { TodayReading } from "@/components/TodayReading";

export default function Home() {
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Bonjour</h1>
      <TodayReading />
    </div>
  );
}

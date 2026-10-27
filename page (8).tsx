import { ReminderSettingsView } from "@/components/ReminderSettingsView";
export const metadata = { title: "Rappels · Bible Challenge" };
export default function Page() {
  return (<div className="space-y-5"><h1 className="font-reading text-3xl font-semibold text-forest">Rappels quotidiens</h1><ReminderSettingsView /></div>);
}

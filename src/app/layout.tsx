import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Bible Challenge", description: "Lisez la Bible chaque jour, seul ou en équipe, même sans connexion.",
  manifest: "/manifest.webmanifest", icons: { icon: "/logo.svg" },
};
export const viewport: Viewport = { themeColor: "#173F35", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <main className="mx-auto w-full max-w-2xl px-4 pt-6">{children}</main>
        <BottomNav />
        <ServiceWorker />
      </body>
    </html>
  );
}

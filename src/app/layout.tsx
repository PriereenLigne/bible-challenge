import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Bible Challenge", description: "Lisez la Bible chaque jour, seul ou en équipe, même sans connexion.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/logo.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#173F35", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Applique le thème choisi avant l'affichage, pour éviter un flash clair → sombre.
const THEME_SCRIPT = `try{var t=localStorage.getItem("bc-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body>
        <AuthProvider>
          <AppHeader />
          <main className="mx-auto w-full max-w-2xl px-4 pb-36 pt-5">{children}</main>
        </AuthProvider>
        <BottomNav />
        <ServiceWorker />
      </body>
    </html>
  );
}

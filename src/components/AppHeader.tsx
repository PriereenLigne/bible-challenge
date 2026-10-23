import Link from "next/link";
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Bible Challenge, accueil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={30} height={30} className="rounded-lg shadow-card" />
          <span className="font-reading text-lg font-semibold tracking-tight text-forest">Bible Challenge</span>
        </Link>
      </div>
    </header>
  );
}

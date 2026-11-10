import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/** Mise en page commune des pages légales : titre, date, sections lisibles, contact. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <article className="space-y-5">
      <header>
        <p className="eyebrow">Mise à jour : {LEGAL.updated}</p>
        <h1 className="mt-1 font-reading text-3xl font-semibold text-forest">{title}</h1>
        <p className="mt-3 text-muted">{intro}</p>
      </header>
      <div className="card space-y-6 leading-relaxed">{children}</div>
      <Contact />
      <p className="text-center text-sm">
        <Link href="/confidentialite" className="text-calm underline">Confidentialité</Link>
        <span className="mx-2 text-muted">·</span>
        <Link href="/conditions" className="text-calm underline">Conditions d’utilisation</Link>
      </p>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-reading text-xl font-semibold text-forest">{title}</h2>
      <div className="mt-2 space-y-2 text-[0.95rem]">{children}</div>
    </section>
  );
}

export function Contact() {
  return (
    <section className="card" aria-label="Contact">
      <p className="eyebrow">Responsable et contact</p>
      <p className="mt-2 font-medium">{LEGAL.organisation}</p>
      <p className="text-sm text-muted">Responsable : {LEGAL.owner}</p>
      <ul className="mt-2 space-y-1 text-sm">
        <li>E-mail : <a className="text-calm underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
        <li>WhatsApp : <a className="text-calm underline" href={LEGAL.whatsappLink} target="_blank" rel="noopener noreferrer">{LEGAL.whatsapp}</a></li>
      </ul>
    </section>
  );
}

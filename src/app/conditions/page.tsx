import Link from "next/link";
import { LegalPage, Section } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Conditions d’utilisation · Bible Challenge" };

export default function Page() {
  return (
    <LegalPage title="Conditions d’utilisation"
      intro="Ces conditions fixent les règles d’utilisation de Bible Challenge. En créant un compte, vous les acceptez.">

      <Section title="1. Le service">
        <p>Bible Challenge aide à lire la Bible régulièrement, seul ou en équipe : programmes de lecture, suivi de progression, quiz, notes, favoris, écoute audio et utilisation sans connexion. L’application est éditée par <strong>{LEGAL.owner}</strong>.</p>
      </Section>

      <Section title="2. Une application gratuite et non commerciale">
        <p>L’application est <strong>gratuite</strong>, <strong>sans publicité</strong> et <strong>sans offre payante</strong>. Cet engagement est durable : il est aussi une condition de la licence de l’enregistrement audio utilisé (voir l’article 5).</p>
      </Section>

      <Section title="3. Votre compte">
        <ul className="list-disc space-y-1 pl-5">
          <li>Le compte est facultatif : la lecture est accessible sans inscription.</li>
          <li>Vous vous engagez à fournir une adresse e-mail valide et à garder votre mot de passe confidentiel. Toute action réalisée avec votre compte est réputée faite par vous.</li>
          <li>Un mineur ne peut créer un compte qu’avec l’accord d’un parent ou d’un tuteur.</li>
          <li>Vous pouvez demander la suppression de votre compte à tout moment, par e-mail ou WhatsApp (voir plus bas).</li>
        </ul>
      </Section>

      <Section title="4. La vie en équipe">
        <p>Les équipes sont des espaces d’encouragement. Les noms d’équipe, prénoms et pseudos doivent rester respectueux : aucun propos injurieux, discriminatoire, ou contraire à l’ordre public. Le responsable d’une équipe peut révoquer ses invitations, et chaque membre peut quitter une équipe à tout moment. Nous pouvons supprimer une équipe ou suspendre un compte qui ne respecte pas ces règles.</p>
      </Section>

      <Section title="5. Les textes et l’audio">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Texte biblique</strong> : Louis Segond 1910, version du domaine public.</li>
          <li><strong>Voix enregistrée</strong> : enregistrement « Trésor Sonore », diffusé sous licence Creative Commons Attribution – Pas d’utilisation commerciale – Pas de modification 4.0 (CC BY-NC-ND 4.0). Les fichiers sont lus tels quels, sans modification. Vous pouvez les écouter et les télécharger pour un usage personnel, mais pas les revendre ni les modifier.</li>
          <li><strong>Vos notes</strong> vous appartiennent. Elles sont privées et ne sont utilisées que pour vous les afficher.</li>
        </ul>
      </Section>

      <Section title="6. Disponibilité">
        <p>Nous faisons de notre mieux pour que l’application fonctionne en permanence, y compris sans connexion, mais nous ne pouvons pas le garantir : maintenance, panne d’un prestataire ou d’Internet. Le service peut évoluer : des fonctions peuvent être ajoutées, modifiées ou retirées. Gardez une copie de vos notes importantes : le journal permet de les exporter.</p>
      </Section>

      <Section title="7. Responsabilité">
        <p>L’application est fournie gratuitement et « en l’état ». Sa responsabilité ne saurait être engagée pour une perte de données due à un appareil, à un navigateur ou à une suppression de données faite par l’utilisateur, ni pour une indisponibilité temporaire du service. Les quiz et statistiques sont des aides à la lecture et n’ont aucune valeur d’évaluation officielle.</p>
      </Section>

      <Section title="8. Données personnelles">
        <p>L’utilisation de vos données est décrite dans la <Link href="/confidentialite" className="text-calm underline">politique de confidentialité</Link>.</p>
      </Section>

      <Section title="9. Droit applicable">
        <p>Ces conditions sont soumises au droit de la {LEGAL.country}. En cas de désaccord, nous chercherons d’abord une solution amiable : contactez-nous.</p>
      </Section>
    </LegalPage>
  );
}

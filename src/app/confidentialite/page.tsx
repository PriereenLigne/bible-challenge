import { LegalPage, Section } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Politique de confidentialité · Bible Challenge" };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité"
      intro="Bible Challenge est une application gratuite, sans publicité, pour lire la Bible chaque jour, seul ou en équipe. Cette page explique, simplement, quelles informations nous enregistrons, pourquoi, et comment vous gardez la main dessus.">

      <Section title="1. Qui est responsable de vos données ?">
        <p>Le responsable du traitement est <strong>{LEGAL.owner}</strong>, joignable par e-mail à <a className="text-calm underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ou sur WhatsApp au {LEGAL.whatsapp}.</p>
        <p>Le traitement est régi par le Livre V de la loi n° 2017-20 du 20 avril 2018 portant Code du numérique en {LEGAL.country}, telle que modifiée.</p>
      </Section>

      <Section title="2. Ce que nous enregistrons">
        <p>Vous pouvez lire la Bible <strong>sans créer de compte</strong>. Un compte sert seulement à retrouver votre progression sur plusieurs appareils et à rejoindre une équipe. Avec un compte, nous enregistrons :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Votre compte</strong> : adresse e-mail, prénom ou pseudo, mot de passe (jamais stocké en clair : seule une empreinte chiffrée est conservée), fuseau horaire.</li>
          <li><strong>Votre lecture</strong> : les défis que vous suivez, les chapitres marqués comme lus, les jours terminés et les résultats des quiz.</li>
          <li><strong>Vos contenus personnels</strong> : vos notes, vos versets favoris et vos surlignages.</li>
          <li><strong>Vos équipes</strong> : les équipes rejointes, votre rôle, les invitations, et votre choix de partager ou non votre progression.</li>
        </ul>
        <p>Nous n’enregistrons <strong>pas</strong> votre position, vos contacts, ni votre numéro de téléphone. L’application ne contient <strong>aucune publicité</strong> et <strong>aucun traceur publicitaire</strong>, et nous ne vendons ni ne louons jamais vos données.</p>
      </Section>

      <Section title="3. Ce qui reste sur votre appareil">
        <p>Pour fonctionner sans connexion, l’application garde sur votre téléphone ou ordinateur une copie de vos lectures, notes et favoris en attente d’envoi, vos préférences (thème, taille du texte, réglages audio), ainsi que les livres et chapitres audio que vous choisissez de télécharger. Ces données ne quittent l’appareil que pour être synchronisées avec votre compte. Vous pouvez les effacer à tout moment en supprimant les données du site dans les réglages de votre navigateur.</p>
      </Section>

      <Section title="4. Pourquoi nous les utilisons">
        <ul className="list-disc space-y-1 pl-5">
          <li>Faire fonctionner votre compte, vos défis, votre progression, vos badges et vos rappels.</li>
          <li>Synchroniser vos données entre vos appareils.</li>
          <li>Permettre la lecture en équipe, si vous en rejoignez une.</li>
          <li>Vous envoyer les e-mails indispensables : confirmation d’inscription et réinitialisation du mot de passe. Aucune lettre d’information n’est envoyée.</li>
        </ul>
        <p>Ces traitements reposent sur votre consentement, donné en créant votre compte, et sur la nécessité de vous fournir le service demandé.</p>
      </Section>

      <Section title="5. Qui peut voir vos informations">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Vos notes, favoris et surlignages sont privés</strong> : vous seul y avez accès.</li>
          <li>Dans une équipe, les autres membres voient votre prénom ou pseudo et votre rôle. Ils ne voient votre progression que si vous laissez le partage activé ; vous pouvez le désactiver à tout moment dans l’équipe.</li>
          <li>Chaque accès à la base de données est filtré par des règles de sécurité qui empêchent un utilisateur de lire les données d’un autre.</li>
        </ul>
      </Section>

      <Section title="6. Les services techniques que nous utilisons">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Supabase</strong> : base de données et gestion des comptes (connexion, e-mails de confirmation).</li>
          <li><strong>Vercel</strong> : hébergement du site.</li>
          <li><strong>Internet Archive</strong> (archive.org) : quand vous écoutez la voix enregistrée, votre appareil télécharge le fichier audio directement depuis archive.org, qui reçoit donc l’adresse technique (adresse IP) de votre connexion.</li>
          <li><strong>La voix de votre téléphone</strong> : la lecture par synthèse vocale est assurée par votre appareil. Selon les voix installées, le fabricant de votre téléphone peut traiter le texte lu, c’est-à-dire uniquement le texte biblique.</li>
        </ul>
        <p>Ces prestataires peuvent héberger les données sur des serveurs situés hors du Bénin. Ils n’utilisent vos données que pour fournir leur service technique.</p>
      </Section>

      <Section title="7. Combien de temps nous les gardons">
        <p>Vos données sont conservées tant que votre compte existe. Si vous demandez la suppression de votre compte, toutes les données qui y sont liées (profil, lectures, notes, favoris, appartenance aux équipes) sont effacées dans un délai de 30 jours.</p>
      </Section>

      <Section title="8. Vos droits">
        <p>Vous pouvez à tout moment demander à <strong>consulter</strong>, <strong>corriger</strong>, <strong>récupérer</strong> ou <strong>supprimer</strong> vos données, ou vous opposer à leur utilisation. Écrivez-nous à <a className="text-calm underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ou sur WhatsApp au {LEGAL.whatsapp} depuis l’adresse ou le numéro associé à votre demande ; nous répondons dans un délai d’un mois au plus.</p>
        <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l’Autorité de Protection des Données à caractère Personnel (APDP) du Bénin.</p>
      </Section>

      <Section title="9. Enfants">
        <p>Les enfants peuvent utiliser l’application pour lire la Bible sans compte. La création d’un compte par un mineur doit se faire avec l’accord et sous la responsabilité d’un parent ou d’un tuteur.</p>
      </Section>

      <Section title="10. Modifications">
        <p>Nous pouvons mettre à jour cette politique, par exemple si une nouvelle fonction est ajoutée. La date de mise à jour figure en haut de la page. En cas de changement important, un message vous en informera dans l’application.</p>
      </Section>
    </LegalPage>
  );
}

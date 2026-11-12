/** Traduit les erreurs de connexion de Supabase en messages clairs, en français. */
export function authErrorMessage(raw: string, code?: string): string {
  const m = `${code ?? ""} ${raw}`.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) return "Cette adresse n’a pas encore été confirmée. Ouvrez l’e-mail de confirmation, ou écrivez-nous si vous ne l’avez pas reçu.";
  if (m.includes("already registered") || m.includes("user_already_exists") || m.includes("already been registered")) return "Un compte existe déjà avec cette adresse : connectez-vous.";
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit") || m.includes("too many")) return "Trop de tentatives en peu de temps. Patientez quelques minutes, puis réessayez.";
  if (m.includes("password should be") || m.includes("weak_password")) return "Mot de passe trop faible : au moins 8 caractères.";
  if (m.includes("unable to validate email") || m.includes("invalid email") || m.includes("email_address_invalid")) return "Adresse e-mail invalide : vérifiez-la.";
  if (m.includes("signups not allowed") || m.includes("signup_disabled")) return "Les inscriptions sont momentanément fermées.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "Ce mode de connexion n’est pas encore activé.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Serveur injoignable : vérifiez votre connexion Internet.";
  return raw;
}

/** Le bouton Google n'apparaît que s'il a été activé côté Supabase et signalé au site (variable d'environnement). */
export const googleEnabled = () => process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";

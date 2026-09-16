import type { CicoLocale } from './locale';
import { PassportBridgeError } from './passport';

const messages = {
  en: {
    unavailable: 'Allow pop-ups for midnight.vote, then try connecting again.',
    closed: 'Passport was closed before sharing your profile. Reopen it to continue.',
    timeout: 'Passport did not answer in time. Return here after signing in, then try again.',
    denied: 'Profile sharing was not completed. You can retry or explore with a demo Passport.',
    wrong_network:
      'This Passport account uses a different network. Check the account network before retrying.',
    fallback: 'We could not complete the Passport connection. Please try again.',
  },
  es: {
    unavailable: 'Permití las ventanas emergentes de midnight.vote y volvé a conectar.',
    closed: 'Passport se cerró antes de compartir tu perfil. Abrilo de nuevo para continuar.',
    timeout: 'Passport no respondió a tiempo. Volvé después de ingresar e intentá otra vez.',
    denied:
      'No se completó el permiso de perfil. Podés reintentar o explorar con un Passport de demo.',
    wrong_network: 'Esta cuenta usa otra red. Revisá la red de tu cuenta antes de reintentar.',
    fallback: 'No pudimos completar la conexión. Intentá otra vez o usá un Passport de demo.',
  },
  fr: {
    unavailable: 'Autorisez les fenêtres contextuelles de midnight.vote, puis réessayez.',
    closed: 'Passport a été fermé avant le partage du profil. Rouvrez-le pour continuer.',
    timeout: 'Passport n’a pas répondu à temps. Revenez après la connexion, puis réessayez.',
    denied: 'Le partage du profil n’a pas abouti. Réessayez ou explorez avec un Passport de démo.',
    wrong_network: 'Ce compte utilise un autre réseau. Vérifiez le réseau avant de réessayer.',
    fallback: 'La connexion n’a pas abouti. Réessayez ou utilisez un Passport de démo.',
  },
};

export function passportErrorCopy(error: unknown, locale: CicoLocale): string {
  const copy = messages[locale];
  const code = error instanceof PassportBridgeError ? error.code : 'fallback';
  return code in copy ? copy[code as keyof typeof copy] : copy.fallback;
}

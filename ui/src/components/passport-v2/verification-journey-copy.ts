/**
 * Copy for the document verification journey, in the pilot's three languages.
 *
 * Held apart from the component because there is a lot of it and because two
 * lines in here carry a claim the rest of the product has to keep. The
 * reference journey this follows tells the reader their identity is erased
 * immediately after the vote and that nothing reaches a third-party server.
 * That is true of the chip read, which happens inside RariMe on the phone, and
 * of the MRZ read, which happens in this tab and is discarded. It is not true
 * of the verification result, which crosses CICO. So `boundaryNote` says which
 * is which rather than repeating the stronger claim wholesale.
 */

export interface VerificationJourneyCopy {
  readonly processTitle: string;
  readonly stepOf: (n: number, total: number) => string;
  readonly next: string;
  readonly skip: string;
  readonly close: string;

  readonly step1Title: string;
  readonly step1Body: string;
  readonly step1Warning: string;
  readonly step2Title: string;
  readonly step2Body: string;
  readonly step3Title: string;
  readonly step3Body: string;

  readonly videoTitle: string;
  readonly videoBody: string;
  readonly videoPlaceholder: string;

  readonly analysisTitle: string;
  readonly analysisStart: string;
  readonly analysisBody: string;

  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly permissionAllow: string;
  readonly permissionDenied: string;
  readonly permissionDeniedBody: string;
  readonly permissionInsecure: string;
  readonly permissionInsecureBody: string;
  readonly permissionNoDevice: string;
  readonly permissionNoDeviceBody: string;
  readonly permissionInUse: string;
  readonly permissionInUseBody: string;
  readonly permissionUnsupported: string;
  readonly permissionUnsupportedBody: string;
  readonly permissionRetry: string;

  readonly captureTitle: string;
  readonly captureBody: string;
  readonly captureHintFlat: string;
  readonly captureHintGlare: string;
  readonly captureHintFill: string;
  readonly captureScanning: string;
  readonly captureRecognitionOff: string;
  readonly captureManual: string;
  readonly captureFrameLabel: string;

  readonly manualTitle: string;
  readonly manualBody: string;
  readonly manualDocumentNumber: string;
  readonly manualBirthDate: string;
  readonly manualExpiryDate: string;
  readonly manualValidate: string;
  readonly manualBackToScanner: string;
  readonly manualAssurance: string;

  readonly errorMalformed: string;
  readonly errorUnsupportedFormat: string;
  readonly errorCheckDigit: string;
  readonly errorExpired: string;
  readonly errorInvalidDate: string;
  readonly errorUnderage: string;

  readonly readTitle: string;
  readonly readBody: string;
  readonly readHintClose: string;
  readonly readHintStill: string;
  readonly boundaryTitle: string;
  readonly boundaryNote: string;
  readonly chipInBrowserNote: string;
}

export const VERIFICATION_JOURNEY_COPY: Record<'es' | 'en' | 'fr', VerificationJourneyCopy> = {
  es: {
    processTitle: 'Proceso de votación',
    stepOf: (n, total) => `Paso ${n} de ${total}`,
    next: 'Continuar',
    skip: 'Saltar',
    close: 'Cerrar',

    step1Title: 'Comprobá que tu voto es único (y que no sos un robot)',
    step1Body:
      'Validá tu edad y tu nacionalidad. Los datos viajan cifrados y no quedan ligados a vos.',
    step1Warning:
      'Tu identidad no se conserva: los datos personales no se pueden rastrear y se descartan apenas termina la comprobación.',
    step2Title: 'Verificá tu edad y nacionalidad en tu propio dispositivo',
    step2Body:
      'El chip del pasaporte se lee en tu teléfono. Los datos del documento no se transfieren ni se guardan en un servidor de terceros.',
    step3Title: 'Voto anónimo',
    step3Body:
      'Una vez comprobados los datos, la aplicación produce una credencial anónima que te permite votar.',

    videoTitle: 'Cómo se ve el proceso',
    videoBody: 'Un recorrido de menos de un minuto. Podés saltarlo y volver cuando quieras.',
    videoPlaceholder: 'Video del recorrido — pendiente de grabar',

    analysisTitle: 'Análisis del pasaporte',
    analysisStart: 'Comenzar el análisis',
    analysisBody: 'Vas a necesitar tu pasaporte físico y unos dos minutos.',

    permissionTitle: 'Necesitamos tu cámara',
    permissionBody:
      'La cámara se usa solo para leer la página de datos del pasaporte, en este dispositivo. Las imágenes no se suben ni se guardan.',
    permissionAllow: 'Permitir la cámara',
    permissionDenied: 'La cámara está bloqueada',
    permissionDeniedBody:
      'Tu navegador tiene el permiso denegado para este sitio. Habilitalo desde el ícono de la barra de direcciones, o cargá los datos a mano.',
    permissionInsecure: 'Esta conexión no permite usar la cámara',
    permissionInsecureBody:
      'Los navegadores solo abren la cámara sobre HTTPS. Abrí el sitio con https:// o cargá los datos a mano.',
    permissionNoDevice: 'No encontramos una cámara',
    permissionNoDeviceBody:
      'Este dispositivo no expone ninguna cámara. Podés cargar los datos a mano y seguir.',
    permissionInUse: 'La cámara está ocupada',
    permissionInUseBody:
      'Otra aplicación la está usando. Cerrala y volvé a intentar, o cargá los datos a mano.',
    permissionUnsupported: 'Este navegador no puede abrir la cámara',
    permissionUnsupportedBody: 'Podés cargar los datos a mano y seguir con el resto del proceso.',
    permissionRetry: 'Intentar de nuevo',

    captureTitle: 'Mostrá la página de datos',
    captureBody:
      'Poné la página con tu foto dentro del marco. Las dos líneas de abajo del todo son las que leemos.',
    captureHintFlat: 'Apoyá el pasaporte sobre una superficie plana',
    captureHintGlare: 'Evitá el reflejo directo de una lámpara',
    captureHintFill: 'Que la página llene el marco de lado a lado',
    captureScanning: 'Buscando la zona legible…',
    captureRecognitionOff:
      'Este navegador no reconoce texto automáticamente. Sacá la foto y cargá los tres datos a mano.',
    captureManual: 'Cargar los datos a mano',
    captureFrameLabel: 'Vista de la cámara para la página del pasaporte',

    manualTitle: 'Cargá los datos del documento',
    manualBody: 'Están en la página de tu foto, en el mismo bloque de dos líneas.',
    manualDocumentNumber: 'Número de documento',
    manualBirthDate: 'Fecha de nacimiento',
    manualExpiryDate: 'Fecha de vencimiento',
    manualValidate: 'Validar',
    manualBackToScanner: 'Volver al escáner',
    manualAssurance:
      'La carga manual no verifica los dígitos de control del documento, así que vale menos que una lectura de la cámara. El chip sigue siendo el que decide.',

    errorMalformed: 'No pudimos leer ese dato. Revisalo y probá de nuevo.',
    errorUnsupportedFormat: 'Eso no parece un pasaporte. El piloto solo acepta pasaportes.',
    errorCheckDigit: 'La lectura no cierra. Movés un poco el documento y volvemos a intentar.',
    errorExpired: 'Ese documento está vencido.',
    errorInvalidDate: 'Esa fecha no es válida.',
    errorUnderage: 'Esta consulta requiere ser mayor de edad.',

    readTitle: 'Lectura del chip de tu pasaporte',
    readBody:
      'El chip se lee con NFC, y eso ocurre en la app RariMe de tu teléfono — no en esta pestaña.',
    readHintClose: 'Acercá el pasaporte al teléfono',
    readHintStill: 'Mantenelo pegado y sin moverlo durante la lectura',
    boundaryTitle: 'Qué sale de tu dispositivo',
    boundaryNote:
      'La imagen de la cámara y los datos del documento no salen de este dispositivo. Lo que sí viaja es el resultado de la comprobación: país, mayoría de edad y nivel de verificación.',
    chipInBrowserNote:
      'Un navegador no puede leer el chip de un pasaporte: hace falta NFC con comandos de tarjeta, que la web no expone. Por eso este paso pasa a RariMe en lugar de simular una lectura.',
  },

  en: {
    processTitle: 'Voting process',
    stepOf: (n, total) => `Step ${n} of ${total}`,
    next: 'Continue',
    skip: 'Skip',
    close: 'Close',

    step1Title: 'Prove your vote is unique (and that you are not a robot)',
    step1Body:
      'Validate your age and nationality. The data is encrypted and cannot be traced back to you.',
    step1Warning:
      'Your identity is not kept: personal data cannot be traced and is discarded as soon as the check completes.',
    step2Title: 'Verify your age and nationality on your own device',
    step2Body:
      'The chip inside your passport is read on your phone. The document data is not transferred to or stored on a third-party server.',
    step3Title: 'Anonymous vote',
    step3Body:
      'Once the data is checked, the app produces an anonymous credential that lets you vote.',

    videoTitle: 'What the process looks like',
    videoBody: 'Under a minute. You can skip it and come back whenever you like.',
    videoPlaceholder: 'Walkthrough video — not yet recorded',

    analysisTitle: 'Passport analysis',
    analysisStart: 'Start the analysis',
    analysisBody: 'You will need your physical passport and about two minutes.',

    permissionTitle: 'We need your camera',
    permissionBody:
      'The camera is used only to read your passport data page, on this device. No image is uploaded or stored.',
    permissionAllow: 'Allow the camera',
    permissionDenied: 'The camera is blocked',
    permissionDeniedBody:
      'Your browser has denied this site the camera. Re-enable it from the address bar icon, or enter the details by hand.',
    permissionInsecure: 'This connection cannot open the camera',
    permissionInsecureBody:
      'Browsers only open the camera over HTTPS. Open the site with https://, or enter the details by hand.',
    permissionNoDevice: 'No camera found',
    permissionNoDeviceBody:
      'This device exposes no camera. You can enter the details by hand and carry on.',
    permissionInUse: 'The camera is busy',
    permissionInUseBody:
      'Another application is using it. Close that and retry, or enter the details by hand.',
    permissionUnsupported: 'This browser cannot open the camera',
    permissionUnsupportedBody: 'You can enter the details by hand and carry on with the rest.',
    permissionRetry: 'Try again',

    captureTitle: 'Show the data page',
    captureBody:
      'Put the page with your photo inside the frame. The two lines along the bottom are what we read.',
    captureHintFlat: 'Rest the passport on a flat surface',
    captureHintGlare: 'Avoid a lamp reflecting off the page',
    captureHintFill: 'Let the page fill the frame edge to edge',
    captureScanning: 'Looking for the readable zone…',
    captureRecognitionOff:
      'This browser does not recognise text automatically. Read the page and enter the three details by hand.',
    captureManual: 'Enter the details by hand',
    captureFrameLabel: 'Camera view for the passport data page',

    manualTitle: 'Enter the document details',
    manualBody: 'They are on your photo page, in the same two-line block.',
    manualDocumentNumber: 'Document number',
    manualBirthDate: 'Date of birth',
    manualExpiryDate: 'Expiry date',
    manualValidate: 'Validate',
    manualBackToScanner: 'Back to the scanner',
    manualAssurance:
      'Typing the details does not verify the document check digits, so it is weaker than a camera read. The chip is still what decides.',

    errorMalformed: 'We could not read that. Check it and try again.',
    errorUnsupportedFormat: 'That does not look like a passport. The pilot accepts passports only.',
    errorCheckDigit: 'That read does not add up. Move the document slightly and we will retry.',
    errorExpired: 'That document has expired.',
    errorInvalidDate: 'That date is not valid.',
    errorUnderage: 'This consultation requires you to be an adult.',

    readTitle: "Reading your passport's chip",
    readBody:
      'The chip is read over NFC, and that happens in the RariMe app on your phone — not in this tab.',
    readHintClose: 'Hold the passport against your phone',
    readHintStill: 'Keep it pressed and still while it reads',
    boundaryTitle: 'What leaves your device',
    boundaryNote:
      'The camera image and the document details never leave this device. What does travel is the result of the check: country, adult status, and verification level.',
    chipInBrowserNote:
      'A browser cannot read a passport chip: it needs NFC with smart-card commands, which the web does not expose. That is why this step moves to RariMe rather than simulating a read.',
  },

  fr: {
    processTitle: 'Processus de vote',
    stepOf: (n, total) => `Étape ${n} sur ${total}`,
    next: 'Continuer',
    skip: 'Passer',
    close: 'Fermer',

    step1Title: "Validez le caractère unique de votre vote (et que vous n'êtes pas un robot)",
    step1Body:
      'Validez votre âge et votre nationalité. Vos données sont chiffrées et non traçables.',
    step1Warning:
      'Votre identité ne sera pas conservée : vos données personnelles sont impossibles à retracer et sont effacées dès la fin de la vérification.',
    step2Title: 'Vérifiez votre âge et nationalité localement sur votre appareil',
    step2Body:
      "Cette application vérifie les données de la puce NFC à l'intérieur de votre passeport. Les données ne sont ni transférées ni conservées sur un serveur tiers.",
    step3Title: 'Vote anonyme',
    step3Body:
      "Une fois vos données vérifiées comme authentiques, l'application produit un jeton anonyme vous permettant de voter.",

    videoTitle: 'À quoi ressemble le processus',
    videoBody: "Moins d'une minute. Vous pouvez passer et y revenir quand vous voulez.",
    videoPlaceholder: 'Vidéo du parcours — pas encore enregistrée',

    analysisTitle: 'Analyse du Passeport',
    analysisStart: "Démarrer l'analyse",
    analysisBody: 'Il vous faudra votre passeport physique et environ deux minutes.',

    permissionTitle: 'Nous avons besoin de votre caméra',
    permissionBody:
      "La caméra sert uniquement à lire la page de données de votre passeport, sur cet appareil. Aucune image n'est envoyée ni conservée.",
    permissionAllow: 'Autoriser la caméra',
    permissionDenied: 'La caméra est bloquée',
    permissionDeniedBody:
      "Votre navigateur refuse la caméra à ce site. Réactivez-la depuis l'icône de la barre d'adresse, ou saisissez les informations à la main.",
    permissionInsecure: "Cette connexion ne permet pas d'ouvrir la caméra",
    permissionInsecureBody:
      "Les navigateurs n'ouvrent la caméra qu'en HTTPS. Ouvrez le site en https://, ou saisissez les informations à la main.",
    permissionNoDevice: 'Aucune caméra détectée',
    permissionNoDeviceBody:
      "Cet appareil n'expose aucune caméra. Vous pouvez saisir les informations à la main et continuer.",
    permissionInUse: 'La caméra est occupée',
    permissionInUseBody:
      "Une autre application l'utilise. Fermez-la et réessayez, ou saisissez les informations à la main.",
    permissionUnsupported: 'Ce navigateur ne peut pas ouvrir la caméra',
    permissionUnsupportedBody:
      'Vous pouvez saisir les informations à la main et poursuivre le reste du processus.',
    permissionRetry: 'Réessayer',

    captureTitle: 'Présentez la page de données',
    captureBody:
      'Placez la page avec votre photo dans le cadre. Ce sont les deux lignes tout en bas que nous lisons.',
    captureHintFlat: 'Posez le passeport sur une surface plane',
    captureHintGlare: "Évitez le reflet direct d'une lampe",
    captureHintFill: 'La page doit remplir le cadre de bord à bord',
    captureScanning: 'Recherche de la zone lisible…',
    captureRecognitionOff:
      'Ce navigateur ne reconnaît pas le texte automatiquement. Lisez la page et saisissez les trois informations à la main.',
    captureManual: 'Saisir les informations à la main',
    captureFrameLabel: 'Vue de la caméra pour la page de données du passeport',

    manualTitle: 'Saisissez les informations du document',
    manualBody: 'Elles figurent sur votre page photo, dans le même bloc de deux lignes.',
    manualDocumentNumber: 'Numéro du document',
    manualBirthDate: 'Date de naissance',
    manualExpiryDate: "Date d'expiration",
    manualValidate: 'Valider',
    manualBackToScanner: 'Retourner au scanner',
    manualAssurance:
      "La saisie manuelle ne vérifie pas les chiffres de contrôle du document : elle vaut donc moins qu'une lecture par la caméra. C'est la puce qui tranche.",

    errorMalformed: "Nous n'avons pas pu lire cette information. Vérifiez-la et réessayez.",
    errorUnsupportedFormat:
      "Cela ne ressemble pas à un passeport. Le pilote n'accepte que les passeports.",
    errorCheckDigit: 'Cette lecture ne concorde pas. Bougez légèrement le document et on réessaie.',
    errorExpired: 'Ce document est expiré.',
    errorInvalidDate: "Cette date n'est pas valide.",
    errorUnderage: 'Cette consultation exige que vous soyez majeur.',

    readTitle: 'Lecture de la puce de votre passeport',
    readBody:
      "La puce se lit en NFC, et cela se passe dans l'application RariMe sur votre téléphone — pas dans cet onglet.",
    readHintClose: 'Approchez votre passeport du téléphone',
    readHintStill: 'Gardez votre passeport bien collé contre le téléphone, sans bouger',
    boundaryTitle: 'Ce qui quitte votre appareil',
    boundaryNote:
      "L'image de la caméra et les informations du document ne quittent jamais cet appareil. Ce qui circule, c'est le résultat de la vérification : pays, majorité et niveau de vérification.",
    chipInBrowserNote:
      "Un navigateur ne peut pas lire la puce d'un passeport : il faut du NFC avec des commandes de carte à puce, que le web n'expose pas. C'est pourquoi cette étape passe à RariMe plutôt que de simuler une lecture.",
  },
};

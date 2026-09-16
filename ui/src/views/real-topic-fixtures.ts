import type { Poll } from './poll-model';
// Editorial demo questions. Never included in provider/runtime catalogues.
export const REAL_TOPIC_FIXTURES: Poll[] = [
  {
    id: 'switzerland-bitcoin',
    subject: 'economy',
    aliases: ['bitcoin', 'snb', 'bns', 'swiss bitcoin initiative'],
    title: '¿Debería el BNS mantener Bitcoin?',
    description:
      'La iniciativa Bitcoin propone añadir Bitcoin junto al oro en la disposición constitucional sobre reservas. Explorá la diversificación y las exigencias de la estabilidad monetaria.',
    question: '¿Debería el BNS mantener Bitcoin?',
    whyNow:
      'El comité no propone una asignación fija. Esta app no afirma que la iniciativa haya alcanzado una votación ni que sea ley.',
    evidence:
      'El comité no propone una asignación fija. Esta app no afirma que la iniciativa haya alcanzado una votación ni que sea ley.',
    legalFrame:
      'Consulta de prueba no oficial · tema real. Las fechas son de demostración, no de una votación oficial.',
    evidenceLabel: 'TEMA REAL · VOTO DE PRUEBA',
    argumentsFor: [
      'El comité argumenta que Bitcoin podría diversificar las reservas más allá de activos vinculados a otros Estados.',
    ],
    argumentsAgainst: [
      'El BNS prioriza la liquidez y preservar el valor de las reservas. Un activo volátil plantea dudas sobre esos objetivos.',
    ],
    uncertainty:
      'La asignación, custodia, límites de riesgo y estado actual del procedimiento necesitan más verificación.',
    opened: 'September 15, 2026',
    deadline: 'December 31, 2026',
    opensAt: '2026-09-15T00:00:00Z',
    closesAt: '2026-12-31T23:59:59Z',
    eligible: '18+',
    participation: 'Demo',
    runtimeScope: 'country',
    runtimeCountryCode: 'CH',
    sources: [
      {
        label: 'Federal Chancellery · initiative 568',
        href: 'https://www.bk.admin.ch/de/details-volksinitiativen?initiative=568',
        detail: 'Official initiative register; consult for procedural updates.',
      },
      {
        label: 'Bitcoin initiative · proponents',
        href: 'https://initiativebtc.ch/en/faq/',
        detail: 'The committee’s proposal and supporting arguments.',
      },
      {
        label: 'Swiss National Bank · reserve objectives',
        href: 'https://www.snb.ch/en/the-snb/mandates-goals/investment-assets',
        detail: 'Official liquidity, diversification and value-preservation objectives.',
      },
    ],
    translations: {
      en: {
        title: 'Should the SNB hold Bitcoin?',
        description:
          'The Bitcoin initiative proposes adding Bitcoin alongside gold in Switzerland’s constitutional reserve provision. Explore the case for diversification and the demands of monetary stability.',
        question: 'Should the SNB hold Bitcoin?',
        whyNow:
          'The initiative committee does not propose a fixed allocation. This app does not assert that the initiative has qualified for a ballot or become law.',
        evidence:
          'The initiative committee does not propose a fixed allocation. This app does not assert that the initiative has qualified for a ballot or become law.',
        legalFrame:
          'Unofficial mock consultation · real-world topic. App dates are demonstration dates, not official ballot dates.',
        evidenceLabel: 'REAL TOPIC · MOCK VOTE',
        argumentsFor: [
          'The initiative committee argues that Bitcoin could diversify reserves beyond assets linked to foreign states.',
        ],
        argumentsAgainst: [
          'The SNB prioritises liquidity and preserving reserve value. A volatile asset raises questions about meeting those objectives.',
        ],
        uncertainty:
          'Allocation, custody, risk limits and the initiative’s current procedural status need further verification.',
      },
      es: {
        title: '¿Debería el BNS mantener Bitcoin?',
        description:
          'La iniciativa Bitcoin propone añadir Bitcoin junto al oro en la disposición constitucional sobre reservas. Explorá la diversificación y las exigencias de la estabilidad monetaria.',
        question: '¿Debería el BNS mantener Bitcoin?',
        whyNow:
          'El comité no propone una asignación fija. Esta app no afirma que la iniciativa haya alcanzado una votación ni que sea ley.',
        evidence:
          'El comité no propone una asignación fija. Esta app no afirma que la iniciativa haya alcanzado una votación ni que sea ley.',
        legalFrame:
          'Consulta de prueba no oficial · tema real. Las fechas son de demostración, no de una votación oficial.',
        evidenceLabel: 'TEMA REAL · VOTO DE PRUEBA',
        argumentsFor: [
          'El comité argumenta que Bitcoin podría diversificar las reservas más allá de activos vinculados a otros Estados.',
        ],
        argumentsAgainst: [
          'El BNS prioriza la liquidez y preservar el valor de las reservas. Un activo volátil plantea dudas sobre esos objetivos.',
        ],
        uncertainty:
          'La asignación, custodia, límites de riesgo y estado actual del procedimiento necesitan más verificación.',
      },
      fr: {
        title: 'La BNS devrait-elle détenir du bitcoin ?',
        description:
          'L’initiative Bitcoin propose d’ajouter le bitcoin à l’or dans la disposition constitutionnelle sur les réserves. Explorez la diversification et les exigences de stabilité monétaire.',
        question: 'La BNS devrait-elle détenir du bitcoin ?',
        whyNow:
          'Le comité ne propose pas de part fixe. Cette app n’affirme ni qu’un scrutin a été obtenu, ni que la proposition est devenue loi.',
        evidence:
          'Le comité ne propose pas de part fixe. Cette app n’affirme ni qu’un scrutin a été obtenu, ni que la proposition est devenue loi.',
        legalFrame:
          'Consultation fictive non officielle · sujet réel. Les dates de l’app sont fictives, pas celles d’un scrutin officiel.',
        evidenceLabel: 'SUJET RÉEL · VOTE FICTIF',
        argumentsFor: [
          'Le comité estime que le bitcoin pourrait diversifier les réserves au-delà des actifs liés à d’autres États.',
        ],
        argumentsAgainst: [
          'La BNS privilégie la liquidité et la préservation des réserves. Un actif volatil soulève des questions sur ces objectifs.',
        ],
        uncertainty:
          'La part allouée, la conservation, les limites de risque et le statut actuel de la procédure restent à vérifier.',
      },
    },
  },
  {
    id: 'global-repair',
    subject: 'climate',
    aliases: ['right to repair', 'repair', 'reparacion', 'reparation'],
    title: '¿Reparar más y reemplazar menos?',
    description:
      '¿Debería ser más fácil reparar que reemplazar? Un debate global inspirado en la directiva europea de 2024, no una votación sobre una ley de la UE.',
    question: '¿Reparar más y reemplazar menos?',
    whyNow:
      'El Consejo adoptó la directiva el 30 de mayo de 2024. Abarca bienes sujetos a requisitos de reparabilidad de la UE, no todos los productos del mundo.',
    evidence:
      'El Consejo adoptó la directiva el 30 de mayo de 2024. Abarca bienes sujetos a requisitos de reparabilidad de la UE, no todos los productos del mundo.',
    legalFrame:
      'Consulta de prueba no oficial · tema real. Las fechas son de demostración, no de una votación oficial.',
    evidenceLabel: 'TEMA REAL · VOTO DE PRUEBA',
    argumentsFor: [
      'Alargar la vida útil puede reducir residuos y ofrecer alternativas al reemplazo.',
    ],
    argumentsAgainst: [
      'Los costes, repuestos y servicios disponibles pueden seguir dificultando la reparación.',
    ],
    uncertainty:
      'La aplicación local, precios y beneficios ambientales varían por producto y lugar.',
    opened: 'September 15, 2026',
    deadline: 'December 31, 2026',
    opensAt: '2026-09-15T00:00:00Z',
    closesAt: '2026-12-31T23:59:59Z',
    eligible: '18+',
    participation: 'Demo',
    runtimeScope: 'global',
    sources: [
      {
        label: 'Council of the EU · 30 May 2024',
        href: 'https://www.consilium.europa.eu/en/press/press-releases/2024/05/30/circular-economy-council-gives-final-approval-to-right-to-repair-directive/',
        detail: 'Official adoption announcement and scope.',
      },
    ],
    translations: {
      en: {
        title: 'Repair more. Replace less?',
        description:
          'Should repair be easier than replacement? A global discussion inspired by the EU’s 2024 right-to-repair directive, not a vote on an EU law.',
        question: 'Repair more. Replace less?',
        whyNow:
          'The Council adopted the directive on 30 May 2024. Its measures concern goods covered by EU repairability requirements; they are not a universal right covering every product everywhere.',
        evidence:
          'The Council adopted the directive on 30 May 2024. Its measures concern goods covered by EU repairability requirements; they are not a universal right covering every product everywhere.',
        legalFrame:
          'Unofficial mock consultation · real-world topic. App dates are demonstration dates, not official ballot dates.',
        evidenceLabel: 'REAL TOPIC · MOCK VOTE',
        argumentsFor: [
          'Longer product life can reduce waste and give consumers alternatives to replacement.',
        ],
        argumentsAgainst: [
          'Repair costs, spare parts and service availability may still make repair impractical.',
        ],
        uncertainty:
          'Local implementation, repair prices and the environmental benefit vary by product and place.',
      },
      es: {
        title: '¿Reparar más y reemplazar menos?',
        description:
          '¿Debería ser más fácil reparar que reemplazar? Un debate global inspirado en la directiva europea de 2024, no una votación sobre una ley de la UE.',
        question: '¿Reparar más y reemplazar menos?',
        whyNow:
          'El Consejo adoptó la directiva el 30 de mayo de 2024. Abarca bienes sujetos a requisitos de reparabilidad de la UE, no todos los productos del mundo.',
        evidence:
          'El Consejo adoptó la directiva el 30 de mayo de 2024. Abarca bienes sujetos a requisitos de reparabilidad de la UE, no todos los productos del mundo.',
        legalFrame:
          'Consulta de prueba no oficial · tema real. Las fechas son de demostración, no de una votación oficial.',
        evidenceLabel: 'TEMA REAL · VOTO DE PRUEBA',
        argumentsFor: [
          'Alargar la vida útil puede reducir residuos y ofrecer alternativas al reemplazo.',
        ],
        argumentsAgainst: [
          'Los costes, repuestos y servicios disponibles pueden seguir dificultando la reparación.',
        ],
        uncertainty:
          'La aplicación local, precios y beneficios ambientales varían por producto y lugar.',
      },
      fr: {
        title: 'Réparer plus, remplacer moins ?',
        description:
          'La réparation devrait-elle être plus simple que le remplacement ? Un débat mondial inspiré de la directive européenne de 2024, pas un vote sur une loi de l’UE.',
        question: 'Réparer plus, remplacer moins ?',
        whyNow:
          'Le Conseil a adopté la directive le 30 mai 2024. Elle concerne les biens couverts par les exigences européennes de réparabilité, pas tous les produits partout.',
        evidence:
          'Le Conseil a adopté la directive le 30 mai 2024. Elle concerne les biens couverts par les exigences européennes de réparabilité, pas tous les produits partout.',
        legalFrame:
          'Consultation fictive non officielle · sujet réel. Les dates de l’app sont fictives, pas celles d’un scrutin officiel.',
        evidenceLabel: 'SUJET RÉEL · VOTE FICTIF',
        argumentsFor: [
          'Prolonger la durée de vie peut réduire les déchets et offrir une alternative au remplacement.',
        ],
        argumentsAgainst: [
          'Les coûts, pièces et services disponibles peuvent encore rendre la réparation peu pratique.',
        ],
        uncertainty:
          'L’application locale, les prix et les bénéfices environnementaux varient selon le produit et le lieu.',
      },
    },
  },
  {
    id: 'spain-water-data',
    subject: 'climate',
    aliases: ['perte'],
    title: '¿Redes de agua más inteligentes?',
    description:
      '¿Debería la inversión en agua priorizar el seguimiento digital para conocer el consumo y detectar pérdidas? Explorá el PERTE español de digitalización del agua.',
    question: '¿Redes de agua más inteligentes?',
    whyNow:
      'MITECO describe un programa de digitalización, innovación y formación para modernizar la gestión del agua. Esta pregunta fue creada para la app.',
    evidence:
      'MITECO describe un programa de digitalización, innovación y formación para modernizar la gestión del agua. Esta pregunta fue creada para la app.',
    legalFrame:
      'Consulta de prueba no oficial · tema real. Las fechas son de demostración, no de una votación oficial.',
    evidenceLabel: 'TEMA REAL · VOTO DE PRUEBA',
    argumentsFor: [
      'Mejor información podría orientar el mantenimiento y el uso eficiente del agua.',
    ],
    argumentsAgainst: [
      'Los sensores requieren mantenimiento y personal; el seguimiento digital no sustituye reparar la infraestructura.',
    ],
    uncertainty:
      'Los ahorros dependen de redes, datos y ejecución. Aquí no se afirman ahorros medidos.',
    opened: 'September 15, 2026',
    deadline: 'December 31, 2026',
    opensAt: '2026-09-15T00:00:00Z',
    closesAt: '2026-12-31T23:59:59Z',
    eligible: '18+',
    participation: 'Demo',
    runtimeScope: 'country',
    runtimeCountryCode: 'ES',
    sources: [
      {
        label: 'MITECO · PERTE digitalización del agua',
        href: 'https://www.miteco.gob.es/es/agua/temas/pertes.html',
        detail: 'Official programme overview.',
      },
    ],
    translations: {
      en: {
        title: 'Smarter water networks?',
        description:
          'Should water investment prioritise digital monitoring to understand use and detect losses? Explore Spain’s PERTE water-digitalisation programme.',
        question: 'Smarter water networks?',
        whyNow:
          'MITECO describes a programme combining digitalisation, innovation and training to modernise water management. This question is authored for the app.',
        evidence:
          'MITECO describes a programme combining digitalisation, innovation and training to modernise water management. This question is authored for the app.',
        legalFrame:
          'Unofficial mock consultation · real-world topic. App dates are demonstration dates, not official ballot dates.',
        evidenceLabel: 'REAL TOPIC · MOCK VOTE',
        argumentsFor: [
          'Better information could help target maintenance and use scarce water more efficiently.',
        ],
        argumentsAgainst: [
          'Sensors need maintenance and skilled staff; digital monitoring cannot replace repairing infrastructure.',
        ],
        uncertainty:
          'Savings depend on local networks, data quality and follow-through. No measured savings are claimed here.',
      },
      es: {
        title: '¿Redes de agua más inteligentes?',
        description:
          '¿Debería la inversión en agua priorizar el seguimiento digital para conocer el consumo y detectar pérdidas? Explorá el PERTE español de digitalización del agua.',
        question: '¿Redes de agua más inteligentes?',
        whyNow:
          'MITECO describe un programa de digitalización, innovación y formación para modernizar la gestión del agua. Esta pregunta fue creada para la app.',
        evidence:
          'MITECO describe un programa de digitalización, innovación y formación para modernizar la gestión del agua. Esta pregunta fue creada para la app.',
        legalFrame:
          'Consulta de prueba no oficial · tema real. Las fechas son de demostración, no de una votación oficial.',
        evidenceLabel: 'TEMA REAL · VOTO DE PRUEBA',
        argumentsFor: [
          'Mejor información podría orientar el mantenimiento y el uso eficiente del agua.',
        ],
        argumentsAgainst: [
          'Los sensores requieren mantenimiento y personal; el seguimiento digital no sustituye reparar la infraestructura.',
        ],
        uncertainty:
          'Los ahorros dependen de redes, datos y ejecución. Aquí no se afirman ahorros medidos.',
      },
      fr: {
        title: 'Des réseaux d’eau plus intelligents ?',
        description:
          'Faut-il privilégier le suivi numérique pour comprendre les usages et détecter les pertes ? Explorez le programme espagnol PERTE de numérisation de l’eau.',
        question: 'Des réseaux d’eau plus intelligents ?',
        whyNow:
          'Le MITECO décrit un programme de numérisation, d’innovation et de formation pour moderniser la gestion de l’eau. Cette question est rédigée pour l’app.',
        evidence:
          'Le MITECO décrit un programme de numérisation, d’innovation et de formation pour moderniser la gestion de l’eau. Cette question est rédigée pour l’app.',
        legalFrame:
          'Consultation fictive non officielle · sujet réel. Les dates de l’app sont fictives, pas celles d’un scrutin officiel.',
        evidenceLabel: 'SUJET RÉEL · VOTE FICTIF',
        argumentsFor: [
          'De meilleures informations pourraient orienter l’entretien et l’usage efficace de l’eau.',
        ],
        argumentsAgainst: [
          'Les capteurs nécessitent entretien et compétences ; le suivi ne remplace pas la réparation des infrastructures.',
        ],
        uncertainty:
          'Les économies dépendent des réseaux, des données et de l’exécution. Aucun gain mesuré n’est affirmé ici.',
      },
    },
  },
];

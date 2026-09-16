import type { Poll } from './poll-model';

// Product fixtures only. Runtime catalogues never include this array.
const concepts = [
  {
    id: 'switzerland-rail',
    country: 'CH',
    subject: 'mobility',
    image: '/art/consultations/swiss-rail.webp',
    titles: [
      'Better connections, closer communities',
      'Mejores conexiones, comunidades más cerca',
      'Mieux relier nos communautés',
    ],
    descriptions: [
      'Should a Swiss pilot explore more frequent regional trains and simpler connections between towns?',
      '¿Debería un piloto suizo explorar trenes regionales más frecuentes y conexiones más simples entre localidades?',
      'Un projet pilote suisse devrait-il étudier des trains régionaux plus fréquents et des correspondances plus simples ?',
    ],
  },
  {
    id: 'switzerland-housing',
    country: 'CH',
    subject: 'housing',
    titles: ['More room to call home', 'Más espacio para un hogar', 'Plus de place pour se loger'],
    descriptions: [
      'Should a Swiss pilot study converting vacant buildings into accessible, long-term rental homes?',
      '¿Debería un piloto suizo estudiar la conversión de edificios vacíos en viviendas de alquiler accesibles y estables?',
      'Un projet pilote suisse devrait-il étudier la transformation de bâtiments vacants en logements locatifs accessibles et durables ?',
    ],
  },
  {
    id: 'switzerland-nature',
    country: 'CH',
    subject: 'climate',
    image: '/art/landscape/midnight-mountains.webp',
    titles: [
      'Space for nature, near home',
      'Naturaleza cerca de casa',
      'La nature près de chez nous',
    ],
    descriptions: [
      'Should a Swiss pilot explore shaded public spaces and better connections between local habitats?',
      '¿Debería un piloto suizo explorar espacios públicos con sombra y mejores conexiones entre hábitats locales?',
      'Un projet pilote suisse devrait-il étudier des espaces publics ombragés et des liens entre les habitats naturels ?',
    ],
  },
  {
    id: 'italy-mobility',
    country: 'IT',
    subject: 'mobility',
    titles: [
      'A simpler everyday journey',
      'Un viaje cotidiano más simple',
      'Des trajets quotidiens plus simples',
    ],
    descriptions: [
      'Should an Italian pilot explore safer walking routes between schools and public transport?',
      '¿Debería un piloto italiano explorar rutas peatonales más seguras entre escuelas y transporte público?',
      'Un projet pilote italien devrait-il étudier des trajets piétons plus sûrs entre écoles et transports publics ?',
    ],
  },
  {
    id: 'spain-water',
    country: 'ES',
    subject: 'climate',
    titles: ['Making every drop count', 'Que cada gota cuente', 'Chaque goutte compte'],
    descriptions: [
      'Should a Spanish pilot explore rainwater collection and lower water use in public buildings?',
      '¿Debería un piloto español explorar la recolección de lluvia y un menor consumo de agua en edificios públicos?',
      'Un projet pilote espagnol devrait-il étudier la récupération de pluie et une consommation d’eau réduite dans les bâtiments publics ?',
    ],
  },
] as const;
const context = {
  en: {
    whyNow: 'A fictional proposal to explore the product experience.',
    legalFrame: 'Mock consultation. No official status or legal effect.',
    evidence: 'No project, funding or measured outcome is claimed.',
    evidenceLabel: 'MOCK CONSULTATION',
    argumentsFor: ['A small pilot could reveal what works before wider investment.'],
    argumentsAgainst: ['Costs, access and unintended effects need careful review.'],
    uncertainty:
      'The location, budget, delivery plan and expected effects have not been established.',
  },
  es: {
    whyNow: 'Una propuesta ficticia para explorar la experiencia del producto.',
    legalFrame: 'Consulta de prueba. Sin carácter oficial ni efecto legal.',
    evidence: 'No se afirma que exista un proyecto, financiación o resultado medido.',
    evidenceLabel: 'CONSULTA DE PRUEBA',
    argumentsFor: ['Un piloto pequeño podría mostrar qué funciona antes de ampliar la inversión.'],
    argumentsAgainst: [
      'Los costes, el acceso y los efectos imprevistos necesitan una revisión cuidadosa.',
    ],
    uncertainty: 'No se han definido el lugar, el presupuesto, el plan ni los efectos esperados.',
  },
  fr: {
    whyNow: 'Une proposition fictive pour découvrir le produit.',
    legalFrame: 'Consultation fictive. Aucun statut officiel ni effet juridique.',
    evidence: 'Aucun projet, financement ou résultat mesuré n’est revendiqué.',
    evidenceLabel: 'CONSULTATION FICTIVE',
    argumentsFor: [
      'Un petit pilote pourrait éclairer les choix avant un investissement plus large.',
    ],
    argumentsAgainst: [
      'Les coûts, l’accès et les effets imprévus demandent une analyse attentive.',
    ],
    uncertainty: 'Le lieu, le budget, le calendrier et les effets attendus ne sont pas définis.',
  },
};
export const DISCOVERY_FIXTURES: Poll[] = concepts.map((c) => {
  const translations = Object.fromEntries(
    (['en', 'es', 'fr'] as const).map((locale, index) => [
      locale,
      {
        ...context[locale],
        title: c.titles[index],
        description: c.descriptions[index],
        question: c.descriptions[index],
      },
    ]),
  );
  return {
    id: c.id,
    title: c.titles[1],
    description: c.descriptions[1],
    question: c.descriptions[1],
    ...context.es,
    opened: 'September 15, 2026',
    deadline: 'December 31, 2026',
    opensAt: '2026-09-15T00:00:00Z',
    closesAt: '2026-12-31T23:59:59Z',
    eligible: '18+',
    participation: 'Demo',
    sources: [],
    runtimeScope: 'country',
    runtimeCountryCode: c.country,
    subject: c.subject,
    media: 'image' in c ? { image: c.image } : undefined,
    translations,
  };
});

export const BUDGET_COPY = {
  en: {
    duration: '5 questions · About 3 minutes',
    titles: ['How much borrowing feels acceptable?', 'How would you fund a new priority?'],
    bodies: [
      'Imagine a normal economic year, without an emergency. What annual government deficit would you be comfortable considering?',
      'Imagine a worthwhile new public service, with a clear cost but no spare budget. Which approach would you examine first?',
    ],
    definition:
      'A deficit means government spends more than it receives in a year. Here, percentages are of the country’s annual economic output (GDP), not of the government budget. These are hypothetical ranges, not recommendations.',
    options: [
      [
        ['balance', 'No deficit', 'Aim for a balanced budget or surplus.'],
        ['low', 'Up to 1% of GDP', 'Allow a small annual gap.'],
        ['moderate', 'More than 1%, up to 3%', 'Allow a larger gap if its purpose is clear.'],
        ['higher', 'More than 3%', 'Consider a larger gap with a credible plan.'],
        [
          'depends',
          'It depends on the circumstances',
          'Debt, interest costs and the economy matter.',
        ],
        ['unsure', 'I’m not sure yet', 'I would like more context first.'],
      ],
      [
        [
          'reprioritise',
          'Move money from other spending',
          'Consider what would receive less support.',
        ],
        ['revenue', 'Raise additional revenue', 'Consider who pays and how much.'],
        [
          'borrow',
          'Borrow with a repayment plan',
          'Consider interest costs and future flexibility.',
        ],
        ['phase', 'Start smaller or wait', 'Consider the cost of delaying the benefits.'],
        ['mix', 'Compare a mix of approaches', 'I would need the numbers before choosing.'],
        ['unsure', 'I’m not sure yet', 'I would like more context first.'],
      ],
    ],
    groups: ['Borrowing tolerance', 'Funding approach'],
  },
  es: {
    duration: '5 preguntas · Unos 3 minutos',
    titles: [
      '¿Cuánto endeudamiento te parece aceptable?',
      '¿Cómo financiarías una nueva prioridad?',
    ],
    bodies: [
      'Imaginá un año económico normal, sin emergencia. ¿Qué déficit público anual considerarías aceptable?',
      'Imaginá un nuevo servicio público útil, con un coste claro pero sin presupuesto disponible. ¿Qué opción estudiarías primero?',
    ],
    definition:
      'Hay déficit cuando el Estado gasta más de lo que ingresa en un año. Los porcentajes son del producto anual del país (PIB), no del presupuesto público. Son rangos hipotéticos, no recomendaciones.',
    options: [
      [
        ['balance', 'Sin déficit', 'Buscar equilibrio o superávit.'],
        ['low', 'Hasta el 1% del PIB', 'Permitir una pequeña diferencia anual.'],
        ['moderate', 'Más del 1%, hasta el 3%', 'Permitir más si el propósito está claro.'],
        ['higher', 'Más del 3%', 'Considerarlo con un plan creíble.'],
        [
          'depends',
          'Depende de las circunstancias',
          'Importan la deuda, los intereses y la economía.',
        ],
        ['unsure', 'Aún no lo sé', 'Necesito más contexto.'],
      ],
      [
        ['reprioritise', 'Reasignar otros gastos', 'Considerar qué recibiría menos apoyo.'],
        ['revenue', 'Aumentar los ingresos', 'Considerar quién paga y cuánto.'],
        ['borrow', 'Pedir prestado con un plan', 'Considerar intereses y flexibilidad futura.'],
        ['phase', 'Empezar con menos o esperar', 'Considerar el coste de retrasar beneficios.'],
        ['mix', 'Comparar una combinación', 'Necesito los números antes de elegir.'],
        ['unsure', 'Aún no lo sé', 'Necesito más contexto.'],
      ],
    ],
    groups: ['Tolerancia al déficit', 'Forma de financiación'],
  },
  fr: {
    duration: '5 questions · Environ 3 minutes',
    titles: [
      'Quel niveau d’emprunt vous paraît acceptable ?',
      'Comment financer une nouvelle priorité ?',
    ],
    bodies: [
      'Imaginez une année économique normale, sans urgence. Quel déficit public annuel seriez-vous prêt à envisager ?',
      'Imaginez un nouveau service public utile, au coût connu, sans budget disponible. Quelle option examineriez-vous d’abord ?',
    ],
    definition:
      'Un déficit signifie que l’État dépense plus que ses recettes annuelles. Les pourcentages portent sur la production annuelle du pays (PIB), pas sur le budget public. Ces fourchettes sont hypothétiques, pas des recommandations.',
    options: [
      [
        ['balance', 'Aucun déficit', 'Viser l’équilibre ou un excédent.'],
        ['low', 'Jusqu’à 1 % du PIB', 'Accepter un petit écart annuel.'],
        ['moderate', 'Plus de 1 %, jusqu’à 3 %', 'Accepter davantage si le but est clair.'],
        ['higher', 'Plus de 3 %', 'L’envisager avec un plan crédible.'],
        ['depends', 'Cela dépend du contexte', 'La dette, les intérêts et l’économie comptent.'],
        ['unsure', 'Je ne sais pas encore', 'J’aimerais davantage de contexte.'],
      ],
      [
        [
          'reprioritise',
          'Réaffecter d’autres dépenses',
          'Examiner ce qui recevrait moins de soutien.',
        ],
        ['revenue', 'Augmenter les recettes', 'Examiner qui paie et combien.'],
        ['borrow', 'Emprunter avec un plan', 'Examiner les intérêts et la flexibilité future.'],
        ['phase', 'Commencer plus petit ou attendre', 'Examiner le coût des bénéfices retardés.'],
        ['mix', 'Comparer plusieurs approches', 'J’ai besoin des chiffres avant de choisir.'],
        ['unsure', 'Je ne sais pas encore', 'J’aimerais davantage de contexte.'],
      ],
    ],
    groups: ['Tolérance au déficit', 'Mode de financement'],
  },
} as const;

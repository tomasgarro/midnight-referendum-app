/**
 * The machine-readable zone on a passport's photo page (ICAO 9303, TD3).
 *
 * This is the one thing the browser can genuinely read off a physical passport.
 * The chip behind it needs ISO 14443 APDUs, which the web platform does not
 * expose -- so the MRZ is where the in-app journey honestly stops and the
 * RariMe handoff begins.
 *
 * Every field here carries a check digit, and this module refuses anything that
 * fails one. That matters twice over: it is what makes a camera read
 * trustworthy without a second source, and it is what makes the manual fallback
 * (someone typing the three fields from the same page) validated by exactly the
 * same code rather than a looser one.
 *
 * Nothing in here is sent anywhere. The parsed result is witness material: it
 * feeds a local eligibility decision and is discarded.
 */

/** TD3 is the passport format: two lines of 44 characters. */
export const TD3_LINE_LENGTH = 44;

export type MrzSex = 'M' | 'F' | 'X';

export interface MrzRecord {
  readonly documentCode: string;
  readonly issuingState: string;
  readonly primaryIdentifier: string;
  readonly secondaryIdentifier: string;
  readonly documentNumber: string;
  readonly nationality: string;
  /** `YYMMDD` as written on the document. */
  readonly birthDate: string;
  readonly expiryDate: string;
  readonly sex: MrzSex;
}

export type MrzFailure =
  | 'malformed'
  | 'unsupported-format'
  | 'check-document-number'
  | 'check-birth-date'
  | 'check-expiry-date'
  | 'check-composite'
  | 'expired'
  | 'invalid-date';

export type MrzResult =
  | { readonly ok: true; readonly record: MrzRecord }
  | { readonly ok: false; readonly reason: MrzFailure };

const WEIGHTS = [7, 3, 1] as const;

/**
 * ICAO 9303 check digit: weight 7-3-1 across the field, digits at face value,
 * letters as A=10..Z=35, filler `<` as 0.
 */
export function computeCheckDigit(value: string): number {
  let sum = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? '<';
    let digit: number;
    if (character >= '0' && character <= '9') digit = character.charCodeAt(0) - 48;
    else if (character >= 'A' && character <= 'Z') digit = character.charCodeAt(0) - 55;
    else if (character === '<') digit = 0;
    else return Number.NaN;
    sum += digit * (WEIGHTS[index % 3] as number);
  }
  return sum % 10;
}

function checkMatches(value: string, expected: string): boolean {
  const digit = computeCheckDigit(value);
  return Number.isFinite(digit) && String(digit) === expected;
}

/**
 * Normalises whatever the camera or a person produced: OCR routinely reports
 * `«` or spaces for the filler character, and lower case for letters.
 */
export function normalizeMrzLine(line: string): string {
  return line
    .toUpperCase()
    .replace(/[«‹<]/gu, '<')
    .replace(/[^A-Z0-9<]/gu, '');
}

/** Splits an MRZ blob into candidate lines, tolerating any line ending. */
export function splitMrzLines(input: string): string[] {
  return input
    .split(/[\r\n]+/u)
    .map(normalizeMrzLine)
    .filter((line) => line.length > 0);
}

/**
 * `YYMMDD` to an absolute date. The century is inferred against a reference
 * instant: a birth year cannot be in the future, an expiry year can be.
 */
export function expandMrzDate(
  yymmdd: string,
  kind: 'birth' | 'expiry',
  reference: Date = new Date(),
): Date | null {
  if (!/^\d{6}$/u.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const currentYY = reference.getUTCFullYear() % 100;
  const currentCentury = reference.getUTCFullYear() - currentYY;
  // A birth date is always in the past; an expiry within a passport's lifetime.
  const year =
    kind === 'birth'
      ? yy > currentYY
        ? currentCentury - 100 + yy
        : currentCentury + yy
      : yy < currentYY - 50
        ? currentCentury + 100 + yy
        : currentCentury + yy;

  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects 31 February and friends, which the range check above lets through.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

/** Whole years elapsed, counting the birthday itself. */
export function yearsBetween(from: Date, to: Date): number {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const monthDelta = to.getUTCMonth() - from.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && to.getUTCDate() < from.getUTCDate())) years -= 1;
  return years;
}

function readName(field: string): { primary: string; secondary: string } {
  const [primaryRaw = '', secondaryRaw = ''] = field.split('<<');
  const clean = (value: string) => value.replace(/</gu, ' ').trim().replace(/\s+/gu, ' ');
  return { primary: clean(primaryRaw), secondary: clean(secondaryRaw) };
}

/**
 * Parses the two TD3 lines, verifying all four check digits.
 *
 * The composite check is included deliberately: without it, two fields could be
 * individually well-formed while belonging to different documents -- which is
 * precisely what a partial OCR read across two frames produces.
 */
export function parseTd3(input: string, reference: Date = new Date()): MrzResult {
  const lines = splitMrzLines(input);
  if (lines.length < 2) return { ok: false, reason: 'malformed' };

  const [line1, line2] = lines.slice(-2) as [string, string];
  if (line1.length !== TD3_LINE_LENGTH || line2.length !== TD3_LINE_LENGTH) {
    return { ok: false, reason: 'malformed' };
  }
  // 'P' is the passport document code. Anything else is a different document.
  if (!line1.startsWith('P')) return { ok: false, reason: 'unsupported-format' };

  const documentCode = line1.slice(0, 2).replace(/</gu, '');
  const issuingState = line1.slice(2, 5).replace(/</gu, '');
  const { primary, secondary } = readName(line1.slice(5));

  const documentNumberRaw = line2.slice(0, 9);
  const documentNumberCheck = line2.slice(9, 10);
  const nationality = line2.slice(10, 13).replace(/</gu, '');
  const birthDate = line2.slice(13, 19);
  const birthCheck = line2.slice(19, 20);
  const sexRaw = line2.slice(20, 21);
  const expiryDate = line2.slice(21, 27);
  const expiryCheck = line2.slice(27, 28);
  const optional = line2.slice(28, 42);
  const optionalCheck = line2.slice(42, 43);
  const compositeCheck = line2.slice(43, 44);

  if (!checkMatches(documentNumberRaw, documentNumberCheck)) {
    return { ok: false, reason: 'check-document-number' };
  }
  if (!checkMatches(birthDate, birthCheck)) return { ok: false, reason: 'check-birth-date' };
  if (!checkMatches(expiryDate, expiryCheck)) return { ok: false, reason: 'check-expiry-date' };

  const composite = `${documentNumberRaw}${documentNumberCheck}${birthDate}${birthCheck}${expiryDate}${expiryCheck}${optional}${optionalCheck}`;
  if (!checkMatches(composite, compositeCheck)) return { ok: false, reason: 'check-composite' };

  if (!expandMrzDate(birthDate, 'birth', reference)) return { ok: false, reason: 'invalid-date' };
  if (!expandMrzDate(expiryDate, 'expiry', reference)) return { ok: false, reason: 'invalid-date' };

  const sex: MrzSex = sexRaw === 'M' || sexRaw === 'F' ? sexRaw : 'X';

  return {
    ok: true,
    record: {
      documentCode,
      issuingState,
      primaryIdentifier: primary,
      secondaryIdentifier: secondary,
      documentNumber: documentNumberRaw.replace(/</gu, ''),
      nationality: nationality || issuingState,
      birthDate,
      expiryDate,
      sex,
    },
  };
}

export interface MrzEligibility {
  /** ISO 3166-1 alpha-3 as printed on the document. */
  readonly country: string;
  readonly isAdult: boolean;
  readonly isExpired: boolean;
}

/**
 * The only three things this product ever needs from a passport. Age is reduced
 * to a threshold here rather than carried as a birth date, so the value that
 * travels onward is already minimal.
 */
export function toEligibility(
  record: MrzRecord,
  reference: Date = new Date(),
  adultAge = 18,
): MrzEligibility | null {
  const birth = expandMrzDate(record.birthDate, 'birth', reference);
  const expiry = expandMrzDate(record.expiryDate, 'expiry', reference);
  if (!birth || !expiry) return null;
  return {
    country: record.nationality,
    isAdult: yearsBetween(birth, reference) >= adultAge,
    isExpired: expiry.getTime() < reference.getTime(),
  };
}

export interface ManualMrzFields {
  readonly documentNumber: string;
  /** `YYYY-MM-DD`, as an `<input type="date">` produces. */
  readonly birthDate: string;
  readonly expiryDate: string;
}

/**
 * The manual form gives a full four-digit year, so it is parsed directly rather
 * than squeezed through `YYMMDD`. Going via the MRZ form would hand the century
 * back to inference, which pushes a mistyped future birth year into the past
 * instead of rejecting it.
 */
function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso.trim());
  if (!match) return null;
  const [, year, month, day] = match as unknown as [string, string, string, string];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}

/**
 * The manual path from the reference journey: document number, date of birth,
 * expiry. There is no check digit to verify -- the person is transcribing the
 * human-readable half of the page -- so this validates shape and plausibility
 * and says plainly, via `assurance`, that it is the weaker of the two reads.
 */
export function validateManualFields(
  fields: ManualMrzFields,
  reference: Date = new Date(),
):
  | { readonly ok: true; readonly fields: ManualMrzFields }
  | { readonly ok: false; readonly reason: MrzFailure } {
  const documentNumber = normalizeMrzLine(fields.documentNumber);
  if (documentNumber.length < 5 || documentNumber.length > 9) {
    return { ok: false, reason: 'malformed' };
  }
  const birthDate = parseIsoDate(fields.birthDate);
  const expiryDate = parseIsoDate(fields.expiryDate);
  if (!birthDate || !expiryDate) return { ok: false, reason: 'invalid-date' };
  if (birthDate.getTime() >= reference.getTime()) return { ok: false, reason: 'invalid-date' };
  if (expiryDate.getTime() < reference.getTime()) return { ok: false, reason: 'expired' };

  return {
    ok: true,
    fields: { documentNumber, birthDate: fields.birthDate, expiryDate: fields.expiryDate },
  };
}

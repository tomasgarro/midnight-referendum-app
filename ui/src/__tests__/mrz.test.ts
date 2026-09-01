import { describe, expect, it } from 'vitest';
import {
  computeCheckDigit,
  expandMrzDate,
  normalizeMrzLine,
  parseTd3,
  toEligibility,
  validateManualFields,
  yearsBetween,
} from '../integration/mrz';

/**
 * The specimen from ICAO Doc 9303 Part 4. Using the published example rather
 * than a hand-built string is the point: if the check-digit implementation were
 * subtly wrong, a self-generated fixture would agree with it.
 */
const LINE1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
const LINE2 = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';
const SPECIMEN = `${LINE1}\n${LINE2}`;

/** Before the specimen's 2012 expiry, so the document reads as valid. */
const DURING_VALIDITY = new Date('2010-06-01T00:00:00Z');

function mutate(line: string, index: number, character: string): string {
  return line.slice(0, index) + character + line.slice(index + 1);
}

describe('ICAO 9303 check digits', () => {
  it('matches the published worked examples', () => {
    expect(computeCheckDigit('D23145890734')).toBe(9);
    expect(computeCheckDigit('L898902C3')).toBe(6);
    expect(computeCheckDigit('740812')).toBe(2);
    expect(computeCheckDigit('120415')).toBe(9);
  });

  it('treats filler as zero and rejects characters outside the alphabet', () => {
    expect(computeCheckDigit('<<<<<<')).toBe(0);
    expect(Number.isNaN(computeCheckDigit('AB*DEF'))).toBe(true);
  });
});

describe('parseTd3', () => {
  it('reads the specimen passport', () => {
    const result = parseTd3(SPECIMEN, DURING_VALIDITY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record).toMatchObject({
      documentCode: 'P',
      issuingState: 'UTO',
      primaryIdentifier: 'ERIKSSON',
      secondaryIdentifier: 'ANNA MARIA',
      documentNumber: 'L898902C3',
      nationality: 'UTO',
      birthDate: '740812',
      expiryDate: '120415',
      sex: 'F',
    });
  });

  it('tolerates OCR noise: lower case, spaces, and guillemets for filler', () => {
    const noisy = `${LINE1.toLowerCase().replace(/</gu, '«')}\n${LINE2.toLowerCase().replace(/</gu, '‹')}`;
    expect(parseTd3(noisy, DURING_VALIDITY).ok).toBe(true);
  });

  it('names which check digit failed rather than reporting a generic error', () => {
    // Document number digit 6 -> 5.
    const badDocument = parseTd3(`${LINE1}\n${mutate(LINE2, 9, '5')}`, DURING_VALIDITY);
    expect(badDocument).toEqual({ ok: false, reason: 'check-document-number' });

    // Birth check digit 2 -> 3.
    const badBirth = parseTd3(`${LINE1}\n${mutate(LINE2, 19, '3')}`, DURING_VALIDITY);
    expect(badBirth).toEqual({ ok: false, reason: 'check-birth-date' });

    // Expiry check digit 9 -> 8.
    const badExpiry = parseTd3(`${LINE1}\n${mutate(LINE2, 27, '8')}`, DURING_VALIDITY);
    expect(badExpiry).toEqual({ ok: false, reason: 'check-expiry-date' });
  });

  it('rejects a composite mismatch, which is what a two-frame OCR splice looks like', () => {
    const spliced = mutate(LINE2, 43, '9');
    expect(parseTd3(`${LINE1}\n${spliced}`, DURING_VALIDITY)).toEqual({
      ok: false,
      reason: 'check-composite',
    });
  });

  it('rejects short lines, single lines, and non-passport documents', () => {
    expect(parseTd3('too short', DURING_VALIDITY)).toEqual({ ok: false, reason: 'malformed' });
    expect(parseTd3(LINE2, DURING_VALIDITY)).toEqual({ ok: false, reason: 'malformed' });
    expect(parseTd3(`${LINE1.slice(0, 40)}\n${LINE2}`, DURING_VALIDITY)).toEqual({
      ok: false,
      reason: 'malformed',
    });
    // 'I' is an identity card, not a passport.
    expect(parseTd3(`${mutate(LINE1, 0, 'I')}\n${LINE2}`, DURING_VALIDITY)).toEqual({
      ok: false,
      reason: 'unsupported-format',
    });
  });
});

describe('date handling', () => {
  it('puts a birth year in the past and an expiry year in the future', () => {
    const reference = new Date('2026-09-01T00:00:00Z');
    // 74 with a reference of 26 must be 1974, not 2074.
    expect(expandMrzDate('740812', 'birth', reference)?.getUTCFullYear()).toBe(1974);
    // 30 as an expiry is 2030.
    expect(expandMrzDate('300415', 'expiry', reference)?.getUTCFullYear()).toBe(2030);
  });

  it('rejects impossible calendar dates rather than rolling them over', () => {
    expect(expandMrzDate('740230', 'birth')).toBeNull();
    expect(expandMrzDate('741301', 'birth')).toBeNull();
    expect(expandMrzDate('7408', 'birth')).toBeNull();
  });

  it('counts the birthday itself as the day the age changes', () => {
    const birth = new Date('2008-09-01T00:00:00Z');
    expect(yearsBetween(birth, new Date('2026-08-31T00:00:00Z'))).toBe(17);
    expect(yearsBetween(birth, new Date('2026-09-01T00:00:00Z'))).toBe(18);
  });
});

describe('toEligibility', () => {
  it('reduces the record to country, adulthood, and expiry', () => {
    const parsed = parseTd3(SPECIMEN, DURING_VALIDITY);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(toEligibility(parsed.record, DURING_VALIDITY)).toEqual({
      country: 'UTO',
      isAdult: true,
      isExpired: false,
    });
  });

  it('reports a document read after its expiry as expired', () => {
    const parsed = parseTd3(SPECIMEN, DURING_VALIDITY);
    if (!parsed.ok) throw new Error('specimen must parse');
    expect(toEligibility(parsed.record, new Date('2026-09-01T00:00:00Z'))?.isExpired).toBe(true);
  });

  it('carries no birth date into the result', () => {
    const parsed = parseTd3(SPECIMEN, DURING_VALIDITY);
    if (!parsed.ok) throw new Error('specimen must parse');
    const eligibility = toEligibility(parsed.record, DURING_VALIDITY);
    expect(Object.keys(eligibility ?? {})).toEqual(['country', 'isAdult', 'isExpired']);
  });
});

describe('validateManualFields', () => {
  const now = new Date('2026-09-01T00:00:00Z');

  it('accepts a plausible transcription and normalises the document number', () => {
    expect(
      validateManualFields(
        { documentNumber: ' l898902c3 ', birthDate: '1974-08-12', expiryDate: '2030-04-15' },
        now,
      ),
    ).toEqual({
      ok: true,
      fields: { documentNumber: 'L898902C3', birthDate: '1974-08-12', expiryDate: '2030-04-15' },
    });
  });

  it('rejects an expired document, a future birth date, and a malformed number', () => {
    expect(
      validateManualFields(
        { documentNumber: 'L898902C3', birthDate: '1974-08-12', expiryDate: '2012-04-15' },
        now,
      ),
    ).toEqual({ ok: false, reason: 'expired' });

    expect(
      validateManualFields(
        { documentNumber: 'L898902C3', birthDate: '2030-08-12', expiryDate: '2031-04-15' },
        now,
      ),
    ).toEqual({ ok: false, reason: 'invalid-date' });

    expect(
      validateManualFields(
        { documentNumber: 'AB', birthDate: '1974-08-12', expiryDate: '2030-04-15' },
        now,
      ),
    ).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a date the browser did not produce in ISO form', () => {
    expect(
      validateManualFields(
        { documentNumber: 'L898902C3', birthDate: '12/08/1974', expiryDate: '2030-04-15' },
        now,
      ),
    ).toEqual({ ok: false, reason: 'invalid-date' });
  });
});

describe('normalizeMrzLine', () => {
  it('strips everything outside the MRZ alphabet', () => {
    expect(normalizeMrzLine('p<uto er!ksson')).toBe('P<UTOERKSSON');
  });
});

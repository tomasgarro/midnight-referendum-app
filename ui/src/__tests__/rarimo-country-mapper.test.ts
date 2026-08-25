import { isoNumericCountry } from 'midnight-referendum-api';
import { describe, expect, it } from 'vitest';
import {
  assignedPassportCountryCount,
  rarimoIsoCountryMapper,
} from '../integration/rarimo-country-mapper';

describe('Rarimo ISO country mapper', () => {
  it('covers the complete assigned catalogue and preserves numeric leading zeroes', () => {
    expect(assignedPassportCountryCount).toBeGreaterThanOrEqual(249);
    expect(rarimoIsoCountryMapper.fromAlpha3('ARG')).toBe('032');
    expect(rarimoIsoCountryMapper.fromAlpha3('fra')).toBe('250');
    expect(rarimoIsoCountryMapper.toAlpha3(isoNumericCountry('032'))).toBe('ARG');
    expect(rarimoIsoCountryMapper.fromAlpha3('ZZZ')).toBeUndefined();
  });
});

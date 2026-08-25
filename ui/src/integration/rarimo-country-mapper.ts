import { iso31661 } from 'iso-3166';
import {
  type IsoNumericCountry,
  isoNumericCountry,
  type RarimoCountryMapper,
} from 'midnight-referendum-api';

const alpha3ToNumeric = new Map(
  iso31661.map((entry) => [entry.alpha3, isoNumericCountry(entry.numeric)] as const),
);
const numericToAlpha3 = new Map(
  iso31661.map((entry) => [isoNumericCountry(entry.numeric), entry.alpha3] as const),
);

/** Complete assigned ISO 3166-1 catalogue used by Rarimo MRZ claim mapping. */
export const rarimoIsoCountryMapper: RarimoCountryMapper = {
  fromAlpha3(alpha3: string): IsoNumericCountry | undefined {
    return alpha3ToNumeric.get(alpha3.trim().toUpperCase());
  },
  toAlpha3(country: IsoNumericCountry): string | undefined {
    return numericToAlpha3.get(country);
  },
};

export const assignedPassportCountryCount = alpha3ToNumeric.size;

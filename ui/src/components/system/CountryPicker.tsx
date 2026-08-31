import { Check, MagnifyingGlass } from '@phosphor-icons/react';
import { useId, useMemo, useState } from 'react';
import {
  ASSIGNED_COUNTRIES,
  countryName as resolveCountryName,
} from '@/integration/country-catalog';
import { CountryFlag, useFlagSupport } from './CountryFlag';
import './system.css';

export interface CountryPickerProps {
  readonly value: string;
  readonly onChange: (alpha2: string) => void;
  readonly locale: 'es' | 'en';
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly listLabel: string;
  /** Codes offered before the reader types anything. */
  readonly suggested?: readonly string[];
  readonly suggestedLabel: string;
  readonly emptyLabel: string;
}

const MAX_VISIBLE = 12;

/**
 * One control, with flags.
 *
 * What this replaces was two controls for one value: a text input backed by a
 * `<datalist>`, and underneath it a separate tinted row that restated the
 * country you had just typed. The reviewer's note was exact -- the country
 * appeared twice and the second appearance did no work. A list where the
 * selected row is visibly selected needs no echo.
 *
 * The rows are radio inputs rather than buttons, so arrow keys move through
 * the list and the group announces itself as a single choice.
 */
export function CountryPicker({
  value,
  onChange,
  locale,
  searchLabel,
  searchPlaceholder,
  listLabel,
  suggested = [],
  suggestedLabel,
  emptyLabel,
}: CountryPickerProps) {
  const [query, setQuery] = useState('');
  const flagsDrawn = useFlagSupport();
  const groupName = useId();
  const searchId = useId();
  const trimmed = query.trim().toLocaleLowerCase();

  const rows = useMemo(() => {
    if (!trimmed) {
      const picked = new Set([...suggested, value]);
      return ASSIGNED_COUNTRIES.filter((country) => picked.has(country.alpha2));
    }
    return ASSIGNED_COUNTRIES.filter((country) =>
      `${resolveCountryName(country.alpha2, locale)} ${country.name} ${country.alpha2} ${country.numeric}`
        .toLocaleLowerCase()
        .includes(trimmed),
    ).slice(0, MAX_VISIBLE);
  }, [locale, suggested, trimmed, value]);

  return (
    <div className="sys-country">
      <label className="sys-country__label" htmlFor={searchId}>
        {searchLabel}
      </label>
      <div className="sys-country__search">
        <MagnifyingGlass size={17} aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          value={query}
          placeholder={searchPlaceholder}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {trimmed ? null : <p className="sys-country__hint">{suggestedLabel}</p>}
      {rows.length ? (
        <ul className="sys-country__list" aria-label={listLabel}>
          {rows.map((country) => {
            const selected = country.alpha2 === value;
            return (
              <li key={country.alpha2}>
                <label className="sys-country__row" data-selected={selected}>
                  <input
                    type="radio"
                    name={groupName}
                    value={country.alpha2}
                    checked={selected}
                    onChange={() => onChange(country.alpha2)}
                  />
                  <CountryFlag alpha2={country.alpha2} />
                  <span className="sys-country__name">
                    {resolveCountryName(country.alpha2, locale)}
                  </span>
                  {/* Where the flag fell back to the code chip, the trailing
                      code would print the same two letters twice on one row. */}
                  {flagsDrawn ? <span className="sys-country__code">{country.alpha2}</span> : null}
                  <span className="sys-country__mark" aria-hidden="true">
                    {selected ? <Check size={13} weight="bold" /> : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="sys-country__empty">{emptyLabel}</p>
      )}
    </div>
  );
}

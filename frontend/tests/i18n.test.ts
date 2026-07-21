import { I18n } from 'i18n-js';

import { supportedLocales, resolveLocale } from '../src/i18n';
import { de } from '../src/i18n/translations/de';
import { en } from '../src/i18n/translations/en';
import { enGB } from '../src/i18n/translations/en-gb';
import { es } from '../src/i18n/translations/es';
import { fr } from '../src/i18n/translations/fr';
import { it as italian } from '../src/i18n/translations/it';
import { nl } from '../src/i18n/translations/nl';
import { pl } from '../src/i18n/translations/pl';
import { pt } from '../src/i18n/translations/pt';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const catalog = {
  'en-US': en,
  'en-GB': enGB,
  'de-DE': de,
  'fr-FR': fr,
  'es-ES': es,
  'it-IT': italian,
  'pt-PT': pt,
  'nl-NL': nl,
  'pl-PL': pl,
};

function leafKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [path] : leafKeys(child, path);
  });
}

describe('nine-region localisation', () => {
  it('keeps the exact supported locale list and a complete key set for every locale', () => {
    expect(supportedLocales).toEqual([
      'en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-PT', 'nl-NL', 'pl-PL',
    ]);
    const expectedKeys = leafKeys(en).sort();
    for (const locale of supportedLocales) {
      expect(leafKeys(catalog[locale]).sort()).toEqual(expectedKeys);
    }
  });

  it('maps system language tags to a supported regional locale', () => {
    expect(resolveLocale('en-GB', 'en')).toBe('en-GB');
    expect(resolveLocale('de-AT', 'de')).toBe('de-DE');
    expect(resolveLocale('pt-BR', 'pt')).toBe('pt-PT');
    expect(resolveLocale('sv-SE', 'sv')).toBe('en-US');
  });

  it('interpolates operational text and formats dates and numbers in every locale', () => {
    const i18n = new I18n(catalog);
    for (const locale of supportedLocales) {
      i18n.locale = locale;
      const message = i18n.t('home.greeting', { name: 'Alex' });
      expect(message).toContain('Alex');
      expect(message).not.toContain('%{');
      expect(new Intl.NumberFormat(locale).format(12345.6)).toBeTruthy();
      expect(new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date('2026-07-21T08:00:00Z'))).toBeTruthy();
    }
  });

  it('provides long German and Polish labels without missing-key placeholders', () => {
    expect(de.activity.exportMasked.length).toBeGreaterThan(20);
    expect(pl.cabinet.backendRestoreOnly.length).toBeGreaterThan(45);
  });
});

import { I18n } from 'i18n-js';

import { formatLocalizedDateTime, supportedLocales, resolveLocale } from '../src/i18n';
import { de } from '../src/i18n/translations/de';
import { en } from '../src/i18n/translations/en';
import { enGB } from '../src/i18n/translations/en-gb';
import { es } from '../src/i18n/translations/es';
import { fr } from '../src/i18n/translations/fr';
import { it as italian } from '../src/i18n/translations/it';
import { nl } from '../src/i18n/translations/nl';
import { pl } from '../src/i18n/translations/pl';
import { pt } from '../src/i18n/translations/pt';
import { zhCN } from '../src/i18n/translations/zh-cn';
import { zhTW } from '../src/i18n/translations/zh-tw';

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
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

function leafKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [path] : leafKeys(child, path);
  });
}

function leafEntries(value: unknown, prefix = ''): [string, string][] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [[path, child] as [string, string]] : leafEntries(child, path);
  });
}

describe('eleven-region localisation', () => {
  it('keeps the exact supported locale list and a complete key set for every locale', () => {
    expect(supportedLocales).toEqual([
      'en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-PT', 'nl-NL', 'pl-PL', 'zh-CN', 'zh-TW',
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
    expect(resolveLocale('zh-Hans-CN', 'zh')).toBe('zh-CN');
    expect(resolveLocale('zh-Hant-TW', 'zh')).toBe('zh-TW');
    expect(resolveLocale('zh-HK', 'zh')).toBe('zh-TW');
    expect(resolveLocale('sv-SE', 'sv')).toBe('en-US');
  });

  it('does not throw when an API date is missing or malformed', () => {
    expect(formatLocalizedDateTime('zh-CN', '')).toBe('');
    expect(formatLocalizedDateTime('zh-CN', 'not-a-date')).toBe('');
    expect(formatLocalizedDateTime('zh-CN', '2026-09-10T08:00:00.000Z')).toBeTruthy();
  });

  it('localises account settings in every selectable language', () => {
    const expectedLabels = {
      'en-US': ['Personal account', 'System default'],
      'en-GB': ['Personal account', 'System default'],
      'de-DE': ['Persönliches Konto', 'Systemstandard'],
      'fr-FR': ['Compte personnel', 'Réglage du système'],
      'es-ES': ['Cuenta personal', 'Predeterminado del sistema'],
      'it-IT': ['Account personale', 'Predefinita di sistema'],
      'pt-PT': ['Conta pessoal', 'Predefinição do sistema'],
      'nl-NL': ['Persoonlijk account', 'Systeemstandaard'],
      'pl-PL': ['Konto osobiste', 'Domyślny systemowy'],
      'zh-CN': ['个人账号', '跟随系统'],
      'zh-TW': ['個人帳戶', '跟隨系統'],
    } as const;

    for (const locale of supportedLocales) {
      expect([
        catalog[locale].account.personalAccountTitle,
        catalog[locale].account.systemLanguage,
      ]).toEqual(expectedLabels[locale]);
    }
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
    expect(de.activity.subtitle.length).toBeGreaterThan(20);
    expect(pl.cabinet.clearSectionDescription.length).toBeGreaterThan(45);
  });

  it('keeps prototype terminology out of normal product copy', () => {
    const forbidden = /\b(demo|prototype|simulated|fictional|seeded)\b/i;
    for (const locale of supportedLocales) {
      expect(leafEntries(catalog[locale]).filter(([, value]) => forbidden.test(value))).toEqual([]);
    }
  });

  it('provides sectioned U.S. and European privacy and service terms', () => {
    expect(en.legal.privacy.rightsBody).toContain('within one month');
    expect(en.legal.privacy.californiaBody).toContain('do not sell personal information');
    expect(en.legal.privacy.transferBody).toContain('United States');
    expect(en.legal.terms.authorizedUseBody).toContain('authorized');
    expect(en.legal.data.auditBody).toContain('no export or undo action');
    expect(zhCN.legal.privacy.rightsBody).toContain('GDPR');
    expect(zhCN.legal.data.auditBody).toContain('不提供导出或撤销');
  });
});

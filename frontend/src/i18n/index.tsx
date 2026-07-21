import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales, useLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { de } from './translations/de';
import { en, TranslationKey } from './translations/en';
import { enGB } from './translations/en-gb';
import { es } from './translations/es';
import { fr } from './translations/fr';
import { it } from './translations/it';
import { nl } from './translations/nl';
import { pl } from './translations/pl';
import { pt } from './translations/pt';

export const supportedLocales = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-PT', 'nl-NL', 'pl-PL'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type LocalePreference = SupportedLocale | 'system';

export const localeLabels: Record<SupportedLocale, string> = {
  'en-US': 'English (US)', 'en-GB': 'English (UK)', 'de-DE': 'Deutsch', 'fr-FR': 'Français', 'es-ES': 'Español',
  'it-IT': 'Italiano', 'pt-PT': 'Português', 'nl-NL': 'Nederlands', 'pl-PL': 'Polski',
};

const translations = { 'en-US': en, 'en-GB': enGB, 'de-DE': de, 'fr-FR': fr, 'es-ES': es, 'it-IT': it, 'pt-PT': pt, 'nl-NL': nl, 'pl-PL': pl };
const i18n = new I18n(translations);
i18n.defaultLocale = 'en-US';
i18n.enableFallback = true;
const localeStorageKey = 'uniclife.locale.preference.v1';

export function resolveLocale(languageTag?: string | null, languageCode?: string | null): SupportedLocale {
  const tag = (languageTag ?? '').toLowerCase();
  const code = (languageCode ?? tag.split('-')[0] ?? '').toLowerCase();
  if (tag.startsWith('en-gb')) return 'en-GB';
  if (code === 'de') return 'de-DE';
  if (code === 'fr') return 'fr-FR';
  if (code === 'es') return 'es-ES';
  if (code === 'it') return 'it-IT';
  if (code === 'pt') return 'pt-PT';
  if (code === 'nl') return 'nl-NL';
  if (code === 'pl') return 'pl-PL';
  return 'en-US';
}

const initialSystemLocale = getLocales()[0];
i18n.locale = resolveLocale(initialSystemLocale?.languageTag, initialSystemLocale?.languageCode);
type TranslateOptions = NonNullable<Parameters<I18n['t']>[1]>;
export function translate(key: TranslationKey, options?: TranslateOptions) { return i18n.t(key, options); }

type I18nContextValue = {
  locale: SupportedLocale;
  preference: LocalePreference;
  setLocalePreference: (preference: LocalePreference) => Promise<void>;
  t: typeof translate;
  formatNumber: (value: number) => string;
  formatDateTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const deviceLocale = useLocales()[0];
  const systemLocale = resolveLocale(deviceLocale?.languageTag, deviceLocale?.languageCode);
  const [preference, setPreference] = useState<LocalePreference>('system');

  useEffect(() => {
    void AsyncStorage.getItem(localeStorageKey).then((stored) => {
      if (stored === 'system' || supportedLocales.includes(stored as SupportedLocale)) setPreference(stored as LocalePreference);
    }).catch(() => undefined);
  }, []);

  const locale = preference === 'system' ? systemLocale : preference;
  const setLocalePreference = useCallback(async (next: LocalePreference) => {
    setPreference(next);
    try { await AsyncStorage.setItem(localeStorageKey, next); } catch { /* Keep the in-memory choice when storage is unavailable. */ }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    i18n.locale = locale;
    return {
      locale, preference, setLocalePreference, t: translate,
      formatNumber: (number) => new Intl.NumberFormat(locale).format(number),
      formatDateTime: (date, options) => new Intl.DateTimeFormat(locale, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date)),
    };
  }, [locale, preference, setLocalePreference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used inside I18nProvider');
  return context;
}

export type { TranslationKey };

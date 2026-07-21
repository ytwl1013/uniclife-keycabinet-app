import { getLocales, useLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

import { de } from './translations/de';
import { en, TranslationKey } from './translations/en';
import { es } from './translations/es';
import { fr } from './translations/fr';
import { ja } from './translations/ja';
import { ko } from './translations/ko';
import { pt } from './translations/pt';
// import { zhCN } from './translations/zh-CN.ts-先忽略';

export const supportedLocales = ['en', 'zh-CN', 'ja', 'ko', 'de', 'fr', 'es', 'pt'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

// const translations = { en, 'zh-CN': zhCN, ja, ko, de, fr, es, pt }; 带中文的翻译暂时不需要，先注释掉
const translations = { en, ja, ko, de, fr, es, pt }
const i18n = new I18n(translations);
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

function resolveLocale(languageTag?: string | null, languageCode?: string | null): SupportedLocale {
  const normalizedTag = languageTag?.toLowerCase() ?? '';
  const normalizedCode = languageCode?.toLowerCase() ?? '';

  if (normalizedTag.startsWith('zh') || normalizedCode === 'zh') {
    return 'zh-CN';
  }

  const matched = supportedLocales.find((locale) => locale.toLowerCase() === normalizedCode || normalizedTag.startsWith(locale.toLowerCase()));
  return matched ?? 'en';
}

const initialLocale = getLocales()[0];
i18n.locale = resolveLocale(initialLocale?.languageTag, initialLocale?.languageCode);

type TranslateOptions = NonNullable<Parameters<I18n['t']>[1]>;

export function translate(key: TranslationKey, options?: TranslateOptions) {
  return i18n.t(key, options);
}

type I18nContextValue = {
  locale: SupportedLocale;
  t: typeof translate;
  formatNumber: (value: number) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const deviceLocale = useLocales()[0];
  const locale = resolveLocale(deviceLocale?.languageTag, deviceLocale?.languageCode);

  const value = useMemo<I18nContextValue>(() => {
    i18n.locale = locale;

    return {
      locale,
      t: translate,
      formatNumber: (number) => new Intl.NumberFormat(locale).format(number),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useTranslation must be used inside I18nProvider');
  }

  return context;
}

export type { TranslationKey };

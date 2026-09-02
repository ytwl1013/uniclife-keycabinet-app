import { en, TranslationSchema } from './en';

export type DeepPartial<T> = {
  [Key in keyof T]?: T[Key] extends string ? string : T[Key] extends object ? DeepPartial<T[Key]> : T[Key];
};

function merge<T extends Record<string, unknown>>(base: T, overrides: DeepPartial<T>): T {
  const result = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = merge((base[key] ?? {}) as Record<string, unknown>, value as DeepPartial<Record<string, unknown>>);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}

export function createTranslation(overrides: DeepPartial<TranslationSchema>): TranslationSchema {
  return merge(en as unknown as TranslationSchema & Record<string, unknown>, overrides) as TranslationSchema;
}

export function defineAccountTranslation(
  translation: TranslationSchema['account'],
): TranslationSchema['account'] {
  return translation;
}

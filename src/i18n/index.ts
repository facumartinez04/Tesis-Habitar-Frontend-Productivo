import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { useEffect, useSyncExternalStore } from 'react';
import { en } from './en';
import { sessionStore } from '../store/sessionStore';

export type Locale = 'es' | 'en';

export const LOCALES: { id: Locale; label: string; short: string }[] = [
  { id: 'es', label: 'Español', short: 'ES' },
  { id: 'en', label: 'English', short: 'EN' },
];

const DEFAULT_LOCALE: Locale = 'es';

const dictionaries: Record<Locale, Record<string, string>> = { es: {}, en };

export function isLocale(value: unknown): value is Locale {
  return value === 'es' || value === 'en';
}

export const chosenLocaleStore = persistentAtom<Locale | ''>('habitar-locale', '', {
  encode: (value) => value,
  decode: (value) => (isLocale(value) ? value : ''),
});

export const contextLocaleStore = atom<Locale | null>(null);

function browserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LOCALE;
}

export const localeStore = computed([chosenLocaleStore, contextLocaleStore], (chosen, context) => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  return chosen || context || browserLocale();
});

let renderLocale: Locale = DEFAULT_LOCALE;

function currentLocale(): Locale {
  return typeof window === 'undefined' ? DEFAULT_LOCALE : renderLocale;
}

export type TranslateParams = Record<string, string | number | null | undefined>;

function interpolate(text: string, params?: TranslateParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

const missingKeys = new Set<string>();

export function translate(locale: Locale, key: string, params?: TranslateParams): string {
  const value = dictionaries[locale][key];
  if (import.meta.env.DEV && locale !== DEFAULT_LOCALE && value === undefined && typeof window !== 'undefined') {
    missingKeys.add(key);
    (window as unknown as { __habitarMissing?: Set<string> }).__habitarMissing = missingKeys;
  }
  return interpolate(value ?? key, params);
}

export function t(key: string, params?: TranslateParams): string;
export function t<K extends string | null | undefined>(key: K, params?: TranslateParams): K extends string ? string : K;
export function t(key: string | null | undefined, params?: TranslateParams): string | null | undefined {
  if (typeof key !== 'string') return key;
  return translate(currentLocale(), key, params);
}

export function getLocale(): Locale {
  return localeStore.get();
}

export function intlLocale(locale: Locale = currentLocale()): string {
  return locale === 'en' ? 'en-US' : 'es-AR';
}

function subscribe(callback: () => void): () => void {
  return localeStore.listen(callback);
}

const serverSnapshot = (): Locale => DEFAULT_LOCALE;

export function useI18n() {
  const locale = useSyncExternalStore(subscribe, getLocale, serverSnapshot);
  renderLocale = locale;
  useEffect(() => {
    renderLocale = getLocale();
  });
  return { locale, t, intlLocale: () => intlLocale(locale) };
}

if (typeof window !== 'undefined') {
  const sessionLanguage = sessionStore.get()?.institutionLanguage;
  if (isLocale(sessionLanguage)) contextLocaleStore.set(sessionLanguage);
  renderLocale = localeStore.get();
  localeStore.subscribe((locale) => {
    renderLocale = locale;
    document.documentElement.lang = locale;
    window.dispatchEvent(new CustomEvent('habitar-locale-change', { detail: { locale } }));
  });
}

export function setChosenLocale(locale: Locale): void {
  chosenLocaleStore.set(locale);
}

export function setContextLocale(locale: Locale | null | undefined): void {
  contextLocaleStore.set(isLocale(locale) ? locale : null);
}

import { uk } from './uk';
import { en } from './en';

export enum Locale {
  UK = 'uk',
  EN = 'en',
}

export const locales = {
  [Locale.UK]: uk,
  [Locale.EN]: en,
};

export const getWelcomeMessage = () => {
  return Object.values(locales)
    .map((locale) => locale.welcome)
    .join('\n\n');
};

export type LocaleKey = keyof typeof uk;

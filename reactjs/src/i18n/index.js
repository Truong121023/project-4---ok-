import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  resources,
  NAMESPACES,
  DEFAULT_NS,
  SUPPORTED_LANGS,
  STORAGE_KEY,
} from './resources';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: NAMESPACES,
    defaultNS: DEFAULT_NS,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    load: 'languageOnly',
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

// First-visit default → VI
if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
  i18n.changeLanguage('vi');
}

export default i18n;

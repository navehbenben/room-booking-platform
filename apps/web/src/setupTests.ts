import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './i18n/locales/en/translation.json';

// Initialise i18next synchronously for tests.
// No LanguageDetector — avoids JSDOM/navigator.language flakiness.
// All existing test string assertions resolve to their English values.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

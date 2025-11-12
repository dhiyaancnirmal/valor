import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import commonES from '../locales/es/common.json'
import loginES from '../locales/es/login.json'
import homeES from '../locales/es/home.json'
import walletES from '../locales/es/wallet.json'
import priceSubmissionES from '../locales/es/priceSubmission.json'
import settingsES from '../locales/es/settings.json'
import errorsES from '../locales/es/errors.json'
import metadataES from '../locales/es/metadata.json'

import commonEN from '../locales/en/common.json'
import loginEN from '../locales/en/login.json'
import homeEN from '../locales/en/home.json'
import walletEN from '../locales/en/wallet.json'
import priceSubmissionEN from '../locales/en/priceSubmission.json'
import settingsEN from '../locales/en/settings.json'
import errorsEN from '../locales/en/errors.json'
import metadataEN from '../locales/en/metadata.json'

export const resources = {
  es: {
    common: commonES,
    login: loginES,
    home: homeES,
    wallet: walletES,
    priceSubmission: priceSubmissionES,
    settings: settingsES,
    errors: errorsES,
    metadata: metadataES,
  },
  en: {
    common: commonEN,
    login: loginEN,
    home: homeEN,
    wallet: walletEN,
    priceSubmission: priceSubmissionEN,
    settings: settingsEN,
    errors: errorsEN,
    metadata: metadataEN,
  },
}

export const i18nConfig = {
  resources,
  fallbackLng: 'es',
  defaultNS: 'common',
  ns: ['common', 'login', 'home', 'wallet', 'priceSubmission', 'settings', 'errors', 'metadata'],

  interpolation: {
    escapeValue: false, // React already does escaping
  },

  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    lookupLocalStorage: 'i18nextLng',
    caches: ['localStorage'],
  },

  react: {
    useSuspense: false,
  },
}

export default i18n

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ta from './ta.json';
import te from './te.json';
import bn from './bn.json';
import or from './or.json';
import hi from './hi.json';

const resources = {
    en: { translation: en },
    ta: { translation: ta },
    te: { translation: te },
    bn: { translation: bn },
    or: { translation: or },
    hi: { translation: hi },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;

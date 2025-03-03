import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import JSON5 from "json5";

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: {
      default: ["en"],
    },
    defaultNS: "translation",
    supportedLngs: ["en"],
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json5",
      crossDomain: false,
      withCredentials: false,
      parse: JSON5.parse,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

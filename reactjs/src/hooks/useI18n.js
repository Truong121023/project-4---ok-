import { useTranslation } from "react-i18next";

/**
 * Thin wrapper over react-i18next's useTranslation.
 * Exposes t, current language code (2-letter), and setter.
 */
export default function useI18n(ns) {
  const { t, i18n } = useTranslation(ns);
  const lang = (i18n.language || "vi").split("-")[0];
  return {
    t,
    i18n,
    lang,
    setLang: (code) => i18n.changeLanguage(code),
  };
}

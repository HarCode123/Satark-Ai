import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, TranslationSchema } from './translations';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSchema;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Application defaults to English
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      localStorage.removeItem('kateb_language');
      localStorage.removeItem('satark_language');
    } catch (e) {}
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('kateb_language', lang);
    } catch (e) {
      console.warn("Could not save language to localStorage:", e);
    }
  };

  // Keep HTML document lang & dir attributes in sync dynamically without reload
  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

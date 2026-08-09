import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

const GLOSS_KEY = "amarkrishok.showEnglishGloss";

type LocaleSettingsValue = {
  showEnglishGloss: boolean;
  toggleEnglishGloss: () => void;
};

const LocaleSettingsContext = createContext<LocaleSettingsValue | null>(null);

export function LocaleSettingsProvider({ children }: PropsWithChildren) {
  const [showEnglishGloss, setShowEnglishGloss] = useState(false);
  useEffect(() => { void AsyncStorage.getItem(GLOSS_KEY).then((value) => setShowEnglishGloss(value === "true")); }, []);
  const toggleEnglishGloss = useCallback(() => {
    setShowEnglishGloss((current) => {
      const next = !current;
      void AsyncStorage.setItem(GLOSS_KEY, String(next));
      return next;
    });
  }, []);
  const value = useMemo(() => ({ showEnglishGloss, toggleEnglishGloss }), [showEnglishGloss, toggleEnglishGloss]);
  return <LocaleSettingsContext.Provider value={value}>{children}</LocaleSettingsContext.Provider>;
}

export function useLocaleSettings() {
  const value = useContext(LocaleSettingsContext);
  if (!value) throw new Error("useLocaleSettings must be used within LocaleSettingsProvider.");
  return value;
}

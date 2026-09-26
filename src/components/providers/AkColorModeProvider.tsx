'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AK_COLOR_MODE_DEFAULT,
  readAkColorMode,
  setAkColorMode,
  type AkColorMode,
} from '@/lib/theme/ak-color-mode';
import { isAlaKeefakTenant } from '@/i18n/config';

type AkColorModeContextValue = {
  colorMode: AkColorMode;
  setColorMode: (mode: AkColorMode) => void;
  toggleColorMode: () => void;
};

const AkColorModeContext = createContext<AkColorModeContextValue | null>(null);

export function AkColorModeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<AkColorMode>(() => {
    if (!isAlaKeefakTenant || typeof window === 'undefined') return AK_COLOR_MODE_DEFAULT;
    return readAkColorMode();
  });

  useLayoutEffect(() => {
    if (!isAlaKeefakTenant) return;
    setAkColorMode(colorMode);
  }, [colorMode]);

  const setColorMode = useCallback((mode: AkColorMode) => {
    setColorModeState(mode);
    setAkColorMode(mode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      setAkColorMode(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ colorMode, setColorMode, toggleColorMode }),
    [colorMode, setColorMode, toggleColorMode]
  );

  if (!isAlaKeefakTenant) {
    return <>{children}</>;
  }

  return <AkColorModeContext.Provider value={value}>{children}</AkColorModeContext.Provider>;
}

export function useAkColorMode() {
  const ctx = useContext(AkColorModeContext);
  if (!ctx) {
    return {
      colorMode: AK_COLOR_MODE_DEFAULT as AkColorMode,
      setColorMode: () => {},
      toggleColorMode: () => {},
    };
  }
  return ctx;
}

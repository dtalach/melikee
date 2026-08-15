import { createContext, use, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type Theme } from './tokens';
import { useAppStore } from '@/store/useAppStore';

/**
 * In the prototype light mode was a designer tweak (`lightMode` boolean). In
 * the app it is a real preference with three states: follow the device, or pin
 * dark / light. Dark is the brand's home ground, so "system" resolves to dark
 * only when the device says dark — matching the prototype's default.
 */
export type ThemePreference = 'system' | 'dark' | 'light';

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useAppStore((s) => s.themePreference);
  const systemScheme = useColorScheme();

  const theme = useMemo(() => {
    const resolved =
      preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;
    return resolved === 'light' ? lightTheme : darkTheme;
  }, [preference, systemScheme]);

  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}

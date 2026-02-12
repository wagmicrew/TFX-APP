/**
 * Theme Context
 *
 * Provides dynamic theming based on school config.
 * Reads theme from SchoolConfig, merges with TFX defaults.
 * All screens use useTheme() instead of importing TFX directly.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useSchool } from './school-context';
import { TFX, buildThemeColors, type ThemeColors } from '@/constants/colors';
import type { SchoolTheme, SchoolBranding } from '@/types/school-config';

interface ThemeBranding {
  logo: string;
  icon?: string;
  name: string;
  tagline?: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  branding: ThemeBranding;
}

const defaultBranding: ThemeBranding = {
  logo: '',
  name: 'TrafikskolaX',
  tagline: '',
};

const defaultTheme: ThemeContextValue = {
  colors: buildThemeColors(undefined),
  branding: defaultBranding,
};

const ThemeContext = createContext<ThemeContextValue>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config } = useSchool();

  const value = useMemo<ThemeContextValue>(() => {
    const serverTheme: SchoolTheme | undefined = config?.theme;
    const serverBranding: SchoolBranding | undefined = config?.branding;

    const colors = buildThemeColors(serverTheme);

    const branding: ThemeBranding = {
      logo: serverBranding?.logoUrl ?? '',
      icon: serverBranding?.iconUrl,
      name: serverBranding?.schoolName ?? 'TrafikskolaX',
      tagline: serverBranding?.tagline,
    };

    console.log('[Theme] Config updated — logo:', branding.logo || '(none)', 'name:', branding.name, 'primary:', colors.primary);

    return { colors, branding };
  }, [config]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

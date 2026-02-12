/**
 * Color constants and dynamic theme builder.
 *
 * TFX = static fallback defaults.
 * buildThemeColors() merges server-provided theme on top.
 */

import type { SchoolTheme } from '@/types/school-config';

export const TFX = {
  blue: '#1B8FCE',
  blueDark: '#0D6BA8',
  blueDeep: '#0A4F7A',
  orange: '#F5921B',
  orangeDark: '#D97B0A',
  teal: '#2ABFB3',
  tealDark: '#1E9C92',
  yellow: '#F5C518',
  green: '#34B364',
  navy: '#0F2B3E',
  charcoal: '#1A2E3B',
  slate: '#64748B',
  grayLight: '#F1F5F9',
  grayMid: '#E2E8F0',
  white: '#FFFFFF',
  danger: '#EF4444',
};

export interface ThemeColors {
  // Core semantic colors
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  secondary: string;
  secondaryDark: string;
  background: string;
  text: string;
  accent: string;
  card: string;
  error: string;
  success: string;
  warning: string;

  // Structural colors
  navy: string;
  charcoal: string;
  slate: string;
  grayLight: string;
  grayMid: string;
  white: string;

  // Tab bar
  tabIconDefault: string;
  tabIconSelected: string;
  tabBarBackground: string;
  tabBarBorder: string;
}

/**
 * Build a complete theme color palette.
 * Merges server-provided school theme with TFX defaults.
 */
export function buildThemeColors(serverTheme?: SchoolTheme): ThemeColors {
  const primary = serverTheme?.primaryColor ?? TFX.blue;
  const secondary = serverTheme?.secondaryColor ?? TFX.orange;
  const background = serverTheme?.backgroundColor ?? TFX.white;
  const text = serverTheme?.textColor ?? TFX.navy;
  const accent = serverTheme?.accentColor ?? TFX.teal;
  const card = serverTheme?.cardBackground ?? TFX.white;
  const error = serverTheme?.errorColor ?? TFX.danger;
  const success = serverTheme?.successColor ?? TFX.green;
  const warning = serverTheme?.warningColor ?? TFX.yellow;

  return {
    primary,
    primaryDark: darken(primary, 0.15),
    primaryDeep: darken(primary, 0.3),
    secondary,
    secondaryDark: darken(secondary, 0.15),
    background,
    text,
    accent,
    card,
    error,
    success,
    warning,

    navy: TFX.navy,
    charcoal: TFX.charcoal,
    slate: TFX.slate,
    grayLight: TFX.grayLight,
    grayMid: TFX.grayMid,
    white: TFX.white,

    tabIconDefault: TFX.slate,
    tabIconSelected: primary,
    tabBarBackground: TFX.white,
    tabBarBorder: TFX.grayMid,
  };
}

/**
 * Simple hex color darkening utility.
 */
function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export default {
  light: {
    text: TFX.navy,
    background: TFX.white,
    tint: TFX.blue,
    tabIconDefault: TFX.slate,
    tabIconSelected: TFX.blue,
  },
};

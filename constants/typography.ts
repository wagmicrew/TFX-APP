import { Platform } from 'react-native';

const KOMET_FAMILY = 'komet, sans-serif';
const SYSTEM_FONT = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: KOMET_FAMILY,
});

export const fonts = {
  regular: Platform.OS === 'web' ? KOMET_FAMILY : SYSTEM_FONT,
  medium: Platform.OS === 'web' ? KOMET_FAMILY : SYSTEM_FONT,
  bold: Platform.OS === 'web' ? KOMET_FAMILY : SYSTEM_FONT,
} as const;

export const fontFamily = Platform.OS === 'web' ? KOMET_FAMILY : SYSTEM_FONT;

import { Platform } from 'react-native';

export const theme = {
  color: {
    // Deeper, more refined dark palette
    surface: '#06060A',
    onSurface: '#F5F1E6',
    surfaceSecondary: '#0F0F14',
    onSurfaceSecondary: '#A0998A',
    surfaceTertiary: '#16161D',
    onSurfaceTertiary: '#CFC8B7',
    surfaceElevated: '#191921',
    // Warm gold from the logo
    brand: '#C9A961',
    brandLight: '#E6CC85',
    brandSoft: '#8C713B',
    brandTint: '#1F1A0E',
    brandDeep: '#3B2F18',
    onBrand: '#0A0A10',
    success: '#7AA17A',
    error: '#C75D5D',
    border: '#1E1E28',
    borderStrong: '#2A2A38',
    borderGold: 'rgba(201,169,97,0.25)',
    divider: '#13131A',
    ledRed: '#FF4A4A',
    ledBlue: '#3399FF',
    ledGreen: '#34C759',
    ledYellow: '#FFCC00',
    ledCyan: '#32ADE6',
    ledViolet: '#BF5AF2',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64 },
  radius: { sm: 6, md: 12, lg: 20, xl: 28, pill: 999 },
  font: {
    serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' })!,
    sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })!,
    mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
  },
};

export const LED_COLORS: Record<string, { name: string; hex: string }> = {
  red:    { name: 'Rouge',  hex: theme.color.ledRed },
  blue:   { name: 'Bleue',  hex: theme.color.ledBlue },
  green:  { name: 'Verte',  hex: theme.color.ledGreen },
  yellow: { name: 'Jaune',  hex: theme.color.ledYellow },
  cyan:   { name: 'Cyan',   hex: theme.color.ledCyan },
  violet: { name: 'Violette', hex: theme.color.ledViolet },
};

export const LED_NAMES_BY_LANG: Record<string, Record<string, string>> = {
  fr: { red: 'Rouge', blue: 'Bleue', green: 'Verte', yellow: 'Jaune', cyan: 'Cyan', violet: 'Violette' },
  en: { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow', cyan: 'Cyan', violet: 'Violet' },
  ar: { red: 'الأحمر', blue: 'الأزرق', green: 'الأخضر', yellow: 'الأصفر', cyan: 'السماوي', violet: 'البنفسجي' },
};

import { Platform } from 'react-native';

export const theme = {
  color: {
    surface: '#09090C',
    onSurface: '#F5F5F5',
    surfaceSecondary: '#141419',
    onSurfaceSecondary: '#A1A1A5',
    surfaceTertiary: '#1C1C24',
    onSurfaceTertiary: '#D4D4D8',
    brand: '#C9A961',
    brandSoft: '#8C713B',
    brandTint: '#2E2413',
    onBrand: '#09090C',
    success: '#34C759',
    error: '#FF3B30',
    border: '#21212B',
    borderStrong: '#3A3A4A',
    divider: '#16161D',
    ledRed: '#FF4A4A',
    ledBlue: '#3399FF',
    ledGreen: '#34C759',
    ledYellow: '#FFCC00',
    ledCyan: '#32ADE6',
    ledViolet: '#BF5AF2',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 12, lg: 20, pill: 999 },
  font: {
    serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' })!,
    sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })!,
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

export const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

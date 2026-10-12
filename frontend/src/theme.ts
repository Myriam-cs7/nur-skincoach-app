import { Platform } from 'react-native';

export const theme = {
  color: {
    // Deep "At-Home Clinic" dark palette (brand charter: nurprotocol.com)
    surface: '#050505',
    onSurface: '#FBF7F0',
    surfaceSecondary: '#141414',
    onSurfaceSecondary: '#8F8A80',
    surfaceTertiary: '#1E1E1E',
    onSurfaceTertiary: '#E8E3DA',
    surfaceElevated: '#1A1A1A',
    // Champagne gold from the logo
    brand: '#C9A961',
    brandLight: '#E6CC85',
    brandSoft: '#8C713B',
    brandTint: '#1C1710',
    brandDeep: '#C9A961',
    onBrand: '#050505',
    onCamera: '#FFF8EA',
    success: '#7AA17A',
    error: '#C75D5D',
    border: '#2A2A2A',
    borderStrong: '#3A3A3A',
    borderGold: 'rgba(201,169,97,0.25)',
    divider: '#1A1A1A',
    // 7 LED modes of the Nūr mask
    ledRed: '#FF4A4A',
    ledBlue: '#3399FF',
    ledGreen: '#34C759',
    ledYellow: '#FFCC00',
    ledCyan: '#32ADE6',
    ledViolet: '#BF5AF2',
    ledWhite: '#FFF6E0',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64 },
  radius: { sm: 6, md: 12, lg: 20, xl: 28, pill: 999 },
  // Type scale — letterSpacing is only allowed on FULL-WIDTH labels (never inside narrow cards)
  type: {
    display: { fontFamily: 'Cormorant-Medium', fontSize: 32, lineHeight: 38 },
    h1: { fontFamily: 'Cormorant-Medium', fontSize: 26, lineHeight: 32 },
    h2: { fontFamily: 'Cormorant-Medium', fontSize: 21, lineHeight: 27 },
    stat: { fontFamily: 'Cormorant-SemiBold', fontSize: 28, lineHeight: 32 },
    body: { fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 21 },
    bodySm: { fontFamily: 'DMSans-Regular', fontSize: 12.5, lineHeight: 19 },
    label: { fontFamily: 'DMSans-Medium', fontSize: 11, lineHeight: 15, letterSpacing: 1.4 },
    cardLabel: { fontFamily: 'DMSans-Medium', fontSize: 11, lineHeight: 15 },
    button: { fontFamily: 'DMSans-Medium', fontSize: 13, lineHeight: 17, letterSpacing: 0.6 },
    micro: { fontFamily: 'DMSans-Regular', fontSize: 10.5, lineHeight: 15 },
  },
  font: {
    // Display: Cormorant Garamond · UI: DM Sans (brand charter)
    serif: 'Cormorant-Medium',
    serifRegular: 'Cormorant-Regular',
    serifBold: 'Cormorant-SemiBold',
    sans: 'DMSans-Regular',
    sansMedium: 'DMSans-Medium',
    mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
  },
  gradient: {
    page: ['#0C0A06', '#050505', '#030303'] as const,
    gold: ['#E6CC85', '#C9A961'] as const,
    goldSoft: ['rgba(201,169,97,0.18)', 'rgba(201,169,97,0)'] as const,
    scrim: ['rgba(5,5,5,0)', 'rgba(5,5,5,0.96)'] as const,
  },
  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    cta: {
      shadowColor: '#C9A961',
      shadowOpacity: 0.45,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    soft: {
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  },
};

export const LED_COLORS: Record<string, { name: string; hex: string }> = {
  red: { name: 'Rouge', hex: theme.color.ledRed },
  blue: { name: 'Bleue', hex: theme.color.ledBlue },
  green: { name: 'Verte', hex: theme.color.ledGreen },
  yellow: { name: 'Jaune', hex: theme.color.ledYellow },
  cyan: { name: 'Cyan', hex: theme.color.ledCyan },
  violet: { name: 'Violette', hex: theme.color.ledViolet },
  white: { name: 'Blanche', hex: theme.color.ledWhite },
};

export const LED_NAMES_BY_LANG: Record<string, Record<string, string>> = {
  fr: { red: 'Rouge', blue: 'Bleue', green: 'Verte', yellow: 'Jaune', cyan: 'Cyan', violet: 'Violette', white: 'Blanche' },
  en: { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow', cyan: 'Cyan', violet: 'Violet', white: 'White' },
  es: { red: 'Rojo', blue: 'Azul', green: 'Verde', yellow: 'Amarillo', cyan: 'Cian', violet: 'Violeta', white: 'Blanco' },
  it: { red: 'Rosso', blue: 'Blu', green: 'Verde', yellow: 'Giallo', cyan: 'Ciano', violet: 'Viola', white: 'Bianco' },
  de: { red: 'Rot', blue: 'Blau', green: 'Grün', yellow: 'Gelb', cyan: 'Cyan', violet: 'Violett', white: 'Weiß' },
  ru: { red: 'Красный', blue: 'Синий', green: 'Зелёный', yellow: 'Жёлтый', cyan: 'Голубой', violet: 'Фиолетовый', white: 'Белый' },
  ar: { red: 'الأحمر', blue: 'الأزرق', green: 'الأخضر', yellow: 'الأصفر', cyan: 'السماوي', violet: 'البنفسجي', white: 'الأبيض' },
};

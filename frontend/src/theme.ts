import { Platform, StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

/**
 * Nūr Protocol design system — beauty tech.
 *
 * Two ambiences: deep black (brand default) and clinical white, driven by the
 * phone's own appearance setting. Styles are declared through `makeStyles`,
 * which builds BOTH palettes up front and serves the active one, so screens
 * keep writing `styles.foo` and `theme.color.bar` exactly as before.
 *
 * Only the 7 LED colours are vivid — everything else is black, white, grey and
 * a thin line of champagne gold.
 */

export type Scheme = 'dark' | 'light';

const LED = {
  ledRed: '#FF4A4A',
  ledBlue: '#3399FF',
  ledGreen: '#34C759',
  ledYellow: '#FFCC00',
  ledCyan: '#32ADE6',
  ledViolet: '#BF5AF2',
  ledWhite: '#FFF6E0',
};

const DARK = {
  surface: '#000000',
  onSurface: '#FFFFFF',
  surfaceSecondary: '#0E0E0E',
  onSurfaceSecondary: '#8E8E8E',
  surfaceTertiary: '#171717',
  onSurfaceTertiary: '#D8D8D8',
  surfaceElevated: '#121212',
  brand: '#C9A961',
  brandLight: '#E6CC85',
  brandSoft: '#8C713B',
  brandTint: 'rgba(201,169,97,0.10)',
  brandDeep: '#C9A961',
  onBrand: '#000000',
  onCamera: '#FFFFFF',
  success: '#5FA86B',
  error: '#D06A6A',
  border: '#1F1F1F',
  borderStrong: '#303030',
  borderGold: 'rgba(201,169,97,0.22)',
  divider: '#161616',
  scrim: 'rgba(0,0,0,0.88)',
  ...LED,
};

const LIGHT: typeof DARK = {
  surface: '#FFFFFF',
  onSurface: '#0A0A0A',
  surfaceSecondary: '#F6F5F2',
  onSurfaceSecondary: '#6F6B64',
  surfaceTertiary: '#EDEBE6',
  onSurfaceTertiary: '#2B2B2B',
  surfaceElevated: '#FFFFFF',
  brand: '#8A6D2B',
  brandLight: '#A98636',
  brandSoft: '#C9A961',
  brandTint: 'rgba(138,109,43,0.08)',
  brandDeep: '#73591F',
  onBrand: '#FFFFFF',
  onCamera: '#FFFFFF',
  success: '#3F7A4C',
  error: '#B04A4A',
  border: '#E5E2DC',
  borderStrong: '#CFCAC0',
  borderGold: 'rgba(138,109,43,0.26)',
  divider: '#EEECE7',
  scrim: 'rgba(255,255,255,0.92)',
  ...LED,
};

export type Palette = typeof DARK;

const PALETTES: Record<Scheme, Palette> = { dark: DARK, light: LIGHT };

// Palette currently being read (style building + live render share this)
let active: Scheme = 'dark';
let current: Scheme = 'dark';

const color = {} as Palette;
(Object.keys(DARK) as (keyof Palette)[]).forEach((k) => {
  Object.defineProperty(color, k, { get: () => PALETTES[active][k], enumerable: true });
});

type Gradient = readonly [string, string, ...string[]];

const GRADIENTS: Record<Scheme, Record<string, Gradient>> = {
  dark: {
    page: ['#050505', '#000000', '#000000'],
    gold: ['#E6CC85', '#C9A961'],
    goldSoft: ['rgba(201,169,97,0.16)', 'rgba(201,169,97,0)'],
    scrim: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.96)'],
  },
  light: {
    page: ['#FFFFFF', '#FBFAF8', '#F4F2ED'],
    gold: ['#A98636', '#8A6D2B'],
    goldSoft: ['rgba(138,109,43,0.10)', 'rgba(138,109,43,0)'],
    scrim: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.97)'],
  },
};

const gradient = {} as Record<'page' | 'gold' | 'goldSoft' | 'scrim', Gradient>;
(['page', 'gold', 'goldSoft', 'scrim'] as const).forEach((k) => {
  Object.defineProperty(gradient, k, { get: () => GRADIENTS[active][k], enumerable: true });
});

const shadow = {
  get card() {
    return active === 'dark'
      ? { shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 }
      : { shadowColor: '#2B2B2B', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 };
  },
  get cta() {
    return active === 'dark'
      ? { shadowColor: '#C9A961', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4 }
      : { shadowColor: '#8A6D2B', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 };
  },
  get soft() {
    return active === 'dark'
      ? { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
      : { shadowColor: '#2B2B2B', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 };
  },
};

export const theme = {
  color,
  gradient,
  shadow,
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64 },
  radius: { sm: 4, md: 10, lg: 16, xl: 24, pill: 999 },
  /**
   * Engineering-grade scale: Manrope for titles, figures and buttons,
   * Inter for everything that is read as a sentence.
   * letterSpacing is only allowed on FULL-WIDTH labels (never in narrow cards).
   */
  type: {
    display: { fontFamily: 'Manrope-SemiBold', fontSize: 27, lineHeight: 33, letterSpacing: -0.3 },
    h1: { fontFamily: 'Manrope-SemiBold', fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
    h2: { fontFamily: 'Manrope-Medium', fontSize: 16.5, lineHeight: 23 },
    stat: { fontFamily: 'Manrope-SemiBold', fontSize: 25, lineHeight: 30, letterSpacing: -0.4 },
    body: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21 },
    bodySm: { fontFamily: 'Inter-Regular', fontSize: 12.5, lineHeight: 19 },
    label: { fontFamily: 'Inter-Medium', fontSize: 10.5, lineHeight: 15, letterSpacing: 1.3 },
    cardLabel: { fontFamily: 'Inter-Medium', fontSize: 10.5, lineHeight: 14 },
    button: { fontFamily: 'Manrope-SemiBold', fontSize: 13, lineHeight: 17, letterSpacing: 0.4 },
    micro: { fontFamily: 'Inter-Regular', fontSize: 10.5, lineHeight: 15 },
  },
  font: {
    display: 'Manrope-Medium',
    displayBold: 'Manrope-SemiBold',
    sans: 'Inter-Regular',
    sansMedium: 'Inter-Medium',
    sansBold: 'Inter-SemiBold',
    mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
  },
};

/**
 * Drop-in replacement for StyleSheet.create: the factory runs once per
 * ambience, and `styles.x` always returns the entry for the active one.
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T>>(factory: () => T): T {
  const previous = active;
  active = 'dark';
  const darkSheet = StyleSheet.create(factory());
  active = 'light';
  const lightSheet = StyleSheet.create(factory());
  active = previous;

  const out = {} as T;
  (Object.keys(darkSheet) as (keyof T)[]).forEach((k) => {
    Object.defineProperty(out, k, {
      get: () => (current === 'light' ? (lightSheet as any)[k] : (darkSheet as any)[k]),
      enumerable: true,
    });
  });
  return out;
}

/** Called once by the root layout from the phone's appearance setting. */
export function setScheme(scheme: Scheme) {
  current = scheme;
  active = scheme;
}

export function getScheme(): Scheme {
  return current;
}

export const LED_COLORS: Record<string, { name: string; hex: string }> = {
  red: { name: 'Rouge', hex: LED.ledRed },
  blue: { name: 'Bleue', hex: LED.ledBlue },
  green: { name: 'Verte', hex: LED.ledGreen },
  yellow: { name: 'Jaune', hex: LED.ledYellow },
  cyan: { name: 'Cyan', hex: LED.ledCyan },
  violet: { name: 'Violette', hex: LED.ledViolet },
  white: { name: 'Blanche', hex: LED.ledWhite },
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

/** The 4 modes silk-screened on the real remote — never translated. */
export const DEVICE_MODES = ['Skin Beautification', 'Cleansing', 'Wrinkle Reduction', 'Oil Control'] as const;

import { useFonts } from 'expo-font';

/**
 * Nūr Protocol brand typography — beauty tech.
 * Manrope (titles, figures, buttons) + Inter (body & UI). No serif anywhere.
 */
export const useBrandFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    'Manrope-Medium': require('../../assets/fonts/Manrope-Medium.ttf'),
    'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
    'Manrope-Bold': require('../../assets/fonts/Manrope-Bold.ttf'),
    'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
  });

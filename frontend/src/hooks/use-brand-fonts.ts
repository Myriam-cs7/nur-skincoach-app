import { useFonts } from 'expo-font';

/**
 * Nūr Protocol brand typography — Cormorant Garamond (display) + DM Sans (UI),
 * matching nurprotocol.com. Loaded from local TTFs (no @expo-google-fonts).
 */
export const useBrandFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    'Cormorant-Regular': require('../../assets/fonts/CormorantGaramond-Regular.ttf'),
    'Cormorant-Medium': require('../../assets/fonts/CormorantGaramond-Medium.ttf'),
    'Cormorant-SemiBold': require('../../assets/fonts/CormorantGaramond-SemiBold.ttf'),
    'DMSans-Regular': require('../../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../../assets/fonts/DMSans-Medium.ttf'),
  });

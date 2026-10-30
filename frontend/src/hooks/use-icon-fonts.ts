// Icon font loader. @react-native-vector-icons ships the .ttf inside the
// package, so we preload it with expo-font under the exact PostScript name the
// Feather component queries ("Feather"). This keeps icons available straight
// away in Expo Go, dev builds, production builds and on the web.
// Usage: const [loaded, error] = useIconFonts();

import { useFonts } from "expo-font";

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    Feather: require("@react-native-vector-icons/feather/fonts/Feather.ttf"),
  });

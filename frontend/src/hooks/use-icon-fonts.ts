// Icon font loader. @expo/vector-icons ships every icon set's .ttf inside the
// package and resolves correctly on native AND web (unlike the scoped
// @react-native-vector-icons packages, whose icon fonts never register as a
// usable @font-face on web — the cause of icons rendering as blank squares there).
// Usage: const [loaded, error] = useIconFonts();

import { useFonts } from "expo-font";
import Feather from "@expo/vector-icons/Feather";

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts({ ...Feather.font });

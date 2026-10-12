import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useBrandFonts } from "../src/hooks/use-brand-fonts";
import { initLang } from "../src/i18n";
import { theme } from "../src/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const [brandLoaded, brandError] = useBrandFonts();
  const [langReady, setLangReady] = useState(false);

  useEffect(() => { initLang().then(() => setLangReady(true)); }, []);

  useEffect(() => {
    if ((loaded || error) && (brandLoaded || brandError) && langReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, brandLoaded, brandError, langReady]);

  if ((!loaded && !error) || (!brandLoaded && !brandError) || !langReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.surface } }} />
    </SafeAreaProvider>
  );
}

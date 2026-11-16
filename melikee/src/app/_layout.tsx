import { Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useApp } from '@/store/useApp';
import { palette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Saved state arrives a tick after launch; hold the first frame until it has. */
function useHydrated() {
  return useSyncExternalStore(
    (cb) => useApp.persist.onFinishHydration(cb),
    () => useApp.persist.hasHydrated(),
    () => false,
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const hydrated = useHydrated();
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        {ready ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg }, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="g/[handle]" />
          </Stack>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

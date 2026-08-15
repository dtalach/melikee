import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { FilingTray } from '@/components/FilingTray';
import { Sheets } from '@/components/sheets/Sheets';
import { Toast } from '@/components/Toast';
import { Onboarding } from '@/screens/Onboarding';
import { useAppStore } from '@/store/useAppStore';
import { useHydrated } from '@/store/persistence';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The overlays live above the navigator rather than inside any one screen:
 * the filing tray follows an add made from the camera *or* the Feed, and the
 * toast and sheets can be raised from anywhere.
 */
function Shell() {
  const theme = useTheme();
  const hydrated = useHydrated();
  const onboarded = useAppStore((s) => s.onboarded);

  // Saved state arrives a tick after the first render. Showing that tick would
  // flash the seed lists at someone who has their own, so the shell holds on
  // the page ground instead — it resolves in a frame or two.
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  // Onboarding covers the app rather than replacing it, so the account it
  // creates lands on a camera that is already mounted and warm.
  if (!onboarded) return <Onboarding />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="g/[handle]" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <FilingTray />
      <Sheets />
      <Toast />
    </View>
  );
}

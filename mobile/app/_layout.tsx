import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/store/auth';
import { LibraryProvider, useLibrary } from '../src/store/library';
import { usePalette } from '../src/theme';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useAuth();
  const { ready: libraryReady } = useLibrary();
  const p = usePalette();

  const booted = status !== 'loading' && libraryReady;

  useEffect(() => {
    if (booted) void SplashScreen.hideAsync();
  }, [booted]);

  if (!booted) return null;

  const navTheme = p.scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          background: p.background,
          card: p.surface,
          text: p.text,
          border: p.border,
          primary: p.accent,
        },
      }}
    >
      <StatusBar style={p.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="grant/[id]"
            options={{ headerShown: true, title: 'Opportunity', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="proposal/[id]"
            options={{ headerShown: true, title: 'Draft Proposal', headerBackTitle: 'Back' }}
          />
        </Stack.Protected>

        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LibraryProvider>
            <RootNavigator />
          </LibraryProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import {
  BarlowCondensed_500Medium,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/barlow';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { Repositories } from '@gym/core';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ConfirmHost, ErrorState, LoadingState } from '../components';

import { DataProvider } from '../data/DataProvider';
import { createRepositories } from '../data/createRepositories';
import { colors, fonts } from '../theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_500Medium,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_800ExtraBold,
  });
  const fontsReady = fontsLoaded || fontError !== null;
  const [repositories, setRepositories] = useState<Repositories | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    createRepositories().then(
      (repos) => {
        if (!cancelled) setRepositories(repos);
      },
      (error: unknown) => {
        console.error('Failed to open the database', error);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  // The native splash stays up until the fonts are ready.
  if (!fontsReady) return null;

  if (!repositories) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        {failed ? (
          <ErrorState message="No pudimos abrir tus datos." onRetry={retry} />
        ) : (
          <LoadingState />
        )}
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <DataProvider repositories={repositories}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
              headerTintColor: colors.textPrimary,
              headerTitleStyle: { fontFamily: fonts.displayBold },
              contentStyle: { backgroundColor: colors.background },
              headerBackTitle: 'Atrás',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="rutina/[routineId]" options={{ title: 'Armar rutina' }} />
            <Stack.Screen name="rutina/dia/[dayId]" options={{ title: 'Armar día' }} />
            <Stack.Screen
              name="elegir-ejercicio"
              options={{ title: 'Elegir ejercicio', presentation: 'modal' }}
            />
            <Stack.Screen
              name="elegir-dia"
              options={{ title: 'Elegir día', presentation: 'modal' }}
            />
            <Stack.Screen
              name="entrenando/[workoutId]"
              options={{
                title: 'Entrenando',
                headerShown: false,
                gestureEnabled: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen name="resumen/[workoutId]" options={{ title: 'Resumen' }} />
          </Stack>
          <ConfirmHost />
        </ThemeProvider>
      </DataProvider>
    </GestureHandlerRootView>
  );
}

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
import { preventAutoHideAsync } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { Repositories } from '@gym/core';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { BrandSplash, ConfirmHost, ErrorState } from '../components';

import { DataProvider } from '../data/DataProvider';
import { createRepositories } from '../data/createRepositories';
import { colors, motion } from '../theme';

export { ErrorBoundary } from 'expo-router';

/**
 * Edit sheets (design/S4 alternative): native page sheet (`presentation: 'modal'`), the same as
 * the other modal routes. Not `formSheet`: on iOS react-native-screens lays its content out with
 * no bottom edge and force-resizes the first ScrollView it finds, which hid the top of the edit
 * sheet (header and series stepper). See docs/DECISIONS.md.
 */
const sheetOptions = {
  presentation: 'modal',
  headerShown: false,
  contentStyle: { backgroundColor: colors.surfaceRaised },
} as const;

preventAutoHideAsync().catch(() => undefined);

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

  // The brand splash replica (design/L2) covers the app until fonts and SQLite are ready, then
  // plays its exit while the app enters underneath.
  const [splashGone, setSplashGone] = useState(false);
  const onSplashGone = useCallback(() => setSplashGone(true), []);
  const ready = fontsReady && repositories !== null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {repositories && fontsReady ? (
        <AppEnter>
          <App repositories={repositories} />
        </AppEnter>
      ) : null}
      {splashGone ? null : (
        <BrandSplash leaving={ready} onGone={onSplashGone} canShowText={fontsReady}>
          {failed && fontsReady ? (
            <ErrorState message="No pudimos abrir tus datos." onRetry={retry} />
          ) : undefined}
        </BrandSplash>
      )}
    </GestureHandlerRootView>
  );
}

/** The app after the splash: fades in and rises 8 pt (design/L2); reduced motion: fade only. */
function AppEnter({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      reduced
        ? withTiming(1, { duration: motion.reduced })
        : withDelay(
            motion.appEnterDelay,
            withTiming(1, { duration: motion.appEnter, easing: motion.easeOut }),
          ),
    );
  }, [progress, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: reduced ? 0 : (1 - progress.get()) * motion.appEnterOffset }],
  }));
  return <Animated.View style={[styles.root, style]}>{children}</Animated.View>;
}

function App({ repositories }: { repositories: Repositories }) {
  return (
    <DataProvider repositories={repositories}>
      <ThemeProvider value={navigationTheme}>
        {/*
         * Stack navigation, option A of design/L5 (S5 box "22:30"): native header with only the back
         * chevron, in bone, no title in the bar (the big title lives in the content) and no orange.
         * `title` on every screen is still set: VoiceOver and the long-press back menu read it.
         */}
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerTintColor: colors.textPrimary,
            headerTitle: '',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="rutina/[routineId]" options={{ title: 'Rutina' }} />
          <Stack.Screen name="rutina/dia/[dayId]" options={{ title: 'Día' }} />
          <Stack.Screen
            name="rutina/ejercicio/[plannedId]"
            options={{ title: 'Editar ejercicio', ...sheetOptions }}
          />
          <Stack.Screen
            name="rutina/descanso/[plannedId]"
            options={{ title: 'Descanso', ...sheetOptions }}
          />
          <Stack.Screen name="elegir-ejercicio" options={{ title: 'Elegir ejercicio' }} />
          <Stack.Screen name="ejercicio/nuevo" options={{ title: 'Crear ejercicio' }} />
          <Stack.Screen
            name="ejercicio/[exerciseId]/editar"
            options={{ title: 'Editar ejercicio' }}
          />
          <Stack.Screen name="elegir-dia" options={{ title: 'Elegir día' }} />
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});

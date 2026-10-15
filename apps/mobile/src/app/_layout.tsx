import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Repositories } from '@gym/core';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { ErrorState, LoadingState } from '../components';

import { DataProvider } from '../data/DataProvider';
import { createRepositories } from '../data/createRepositories';
import { colors, typography } from '../theme';

export { ErrorBoundary } from 'expo-router';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

export default function RootLayout() {
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

  if (!repositories) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        {failed ? (
          <ErrorState message="No pudimos abrir tus datos." onRetry={retry} />
        ) : (
          <LoadingState />
        )}
      </View>
    );
  }

  return (
    <DataProvider repositories={repositories}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: typography.weight.semibold },
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
      </ThemeProvider>
    </DataProvider>
  );
}

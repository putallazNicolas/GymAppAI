import { MAX_REST_SECONDS, REST_STEP_SECONDS, type PlannedExercise } from '@gym/core';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Bump,
  EmptyState,
  ErrorState,
  HoldButton,
  LoadingState,
  PressableScale,
  SheetHeader,
  Text,
} from '../../../components';
import { useRepositories } from '../../../data/DataProvider';
import { useFocusAsync } from '../../../data/useFocusAsync';
import { usePlannedSaver } from '../../../data/usePlannedSaver';
import { restLabel, restSpoken } from '../../../lib/planFormat';
import { DEFAULT_REST_SECONDS } from '../../../lib/rest';
import { colors, hit, radii, space, stroke } from '../../../theme';

/** Grid of presets, in rows of four (design/P07d); "Sin descanso" (0) takes two cells. */
const PRESET_ROWS: number[][] = [
  [45, 60, 90, 120],
  [180, 300, 0],
];

interface Loaded {
  planned: PlannedExercise;
  name: string;
}

/** Rest picker sheet (design/P07d): presets plus -15 s / +15 s, 0..600 s. Saves on every change. */
export default function RestPickerSheet() {
  const { plannedId, dayId } = useLocalSearchParams<{ plannedId: string; dayId: string }>();
  const repos = useRepositories();
  const { data, loading, error, reload } = useFocusAsync<Loaded | null>(async () => {
    const day = await repos.routines.getDay(dayId);
    const planned = day?.exercises.find((e) => e.id === plannedId);
    if (!planned) return null;
    const exercise = await repos.exercises.getById(planned.exerciseId);
    return { planned, name: exercise?.name ?? 'Ejercicio' };
  }, [dayId, plannedId]);

  let body: React.ReactNode;
  if (loading && data === undefined) body = <LoadingState />;
  else if (error && data === undefined)
    body = <ErrorState message="No pudimos cargar el descanso." onRetry={reload} />;
  else if (!data) body = <EmptyState title="Ejercicio no encontrado" />;
  else body = <Picker key={data.planned.id} data={data} />;
  return <View style={styles.sheet}>{body}</View>;
}

function Picker({ data }: { data: Loaded }) {
  const { planned, name } = data;
  const insets = useSafeAreaInsets();
  const [rest, setRestState] = useState(planned.restSeconds ?? DEFAULT_REST_SECONDS);
  const latest = useRef(rest);
  const saver = usePlannedSaver(planned.id, () => undefined);

  function setRest(next: number) {
    latest.current = next;
    setRestState(next);
    saver.save({ restSeconds: next });
  }

  function step(delta: number) {
    const next = Math.min(MAX_REST_SECONDS, Math.max(0, latest.current + delta));
    if (next === latest.current) return false;
    setRest(next);
    return true;
  }

  return (
    <>
      <SheetHeader eyebrow={`Descanso · ${name}`} subtitle="Arranca solo al tildar cada serie" />
      <View style={styles.readoutRow}>
        <HoldButton
          accessibilityLabel="Restar 15 segundos"
          disabled={rest <= 0}
          step={() => step(-REST_STEP_SECONDS)}
          style={[styles.stepBtn, styles.minus]}
        >
          <Text variant="stepLabel">−{REST_STEP_SECONDS} s</Text>
        </HoldButton>
        <View style={styles.readout} accessibilityLiveRegion="polite">
          <Bump trigger={rest}>
            {rest === 0 ? (
              <Text variant="numLCaps" color="textBody" style={styles.none}>
                Sin descanso
              </Text>
            ) : (
              <Text variant="numHero" accessibilityLabel={restSpoken(rest)}>
                {restLabel(rest)}
              </Text>
            )}
          </Bump>
          <Text variant="caption" color="textTertiary">
            {rest === 0 ? 'No aparece el temporizador' : restSpoken(rest)}
          </Text>
        </View>
        <HoldButton
          accessibilityLabel="Sumar 15 segundos"
          disabled={rest >= MAX_REST_SECONDS}
          step={() => step(REST_STEP_SECONDS)}
          style={[styles.stepBtn, styles.plus]}
        >
          <Text variant="stepLabel" color="accent">
            +{REST_STEP_SECONDS} s
          </Text>
        </HoldButton>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Descansos frecuentes"
        style={styles.grid}
      >
        {PRESET_ROWS.map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((value) => {
              const on = value === rest;
              return (
                <PressableScale
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={restLabel(value)}
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    if (value !== latest.current) setRest(value);
                  }}
                  style={[styles.preset, value === 0 && styles.presetWide, on && styles.presetOn]}
                >
                  <Text
                    variant={value === 0 ? 'presetSmall' : 'unitPill'}
                    color={on ? 'onAccent' : 'textBody'}
                  >
                    {restLabel(value)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        ))}
      </View>
      <Text
        variant="caption"
        color="textTertiary"
        style={[styles.foot, { marginBottom: insets.bottom }]}
      >
        Siempre en minutos y segundos. Pasos de 15 s, de 0:15 a 10:00. Mantené apretado ± para
        avanzar rápido.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surfaceRaised },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.md,
  },
  stepBtn: {
    width: 72,
    height: 60,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { backgroundColor: colors.border },
  plus: { backgroundColor: colors.accentMuted },
  readout: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  none: { textAlign: 'center' },
  grid: { gap: space.sm, marginHorizontal: space.lg, marginTop: space.md + 2 },
  gridRow: { flexDirection: 'row', gap: space.sm },
  preset: {
    flex: 1,
    minHeight: hit.row,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  presetWide: { flex: 2 },
  presetOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  foot: { marginHorizontal: space.lg, marginTop: space.md },
});

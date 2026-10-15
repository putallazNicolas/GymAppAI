import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, radii, space, stroke } from '../../theme';
import { Button } from '../Button';
import { Text } from '../Text';

export interface TodayExercise {
  name: string;
  sets: number;
  reps: string;
}

interface TodayCardProps {
  /** "Día 1 de 4 · Fuerza 4 días". */
  caption: string;
  dayName: string;
  exercises: TodayExercise[];
  /** Total sets of the whole day, for the footer. */
  totalSets: number;
  /** "jue 8 oct"; omitted when the day was never trained. */
  lastTime?: string;
  /** Another workout is in progress: starting is disabled. */
  blocked: boolean;
  onStart: () => void;
  onPickDay: () => void;
}

const SHOWN = 3;
const RINGS = [92, 70, 22] as const;
const SIZE = 190;

/** "ENTRENAMIENTO DE HOY" card (design/P01): the suggested day, its exercises and Empezar. */
export function TodayCard({
  caption,
  dayName,
  exercises,
  totalSets,
  lastTime,
  blocked,
  onStart,
  onPickDay,
}: TodayCardProps) {
  const shown = exercises.slice(0, SHOWN);
  const more = exercises.length - shown.length;
  const summary =
    more > 0
      ? `+ ${more} ${more === 1 ? 'ejercicio' : 'ejercicios'} más · ${totalSets} series`
      : `${totalSets} ${totalSets === 1 ? 'serie' : 'series'}`;

  return (
    <View style={styles.card}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={styles.rings}>
        {RINGS.map((r) => (
          <Circle
            key={r}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            fill="none"
            stroke={colors.divider}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={styles.head}>
        <Text variant="label" color="accent">
          Entrenamiento de hoy
        </Text>
        <Text variant="caption">{caption}</Text>
        <Text variant="displayXL" style={styles.day} numberOfLines={2}>
          {dayName}
        </Text>
      </View>
      {shown.length > 0 ? (
        <View style={styles.list}>
          {shown.map((e, i) => (
            <View key={`${e.name}-${i}`} style={[styles.item, styles.itemBorder]}>
              <Text variant="bodyM" numberOfLines={1} style={styles.itemName}>
                {e.name}
              </Text>
              <Text variant="numMd">
                {e.sets} × {e.reps}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="caption" style={styles.empty}>
          Este día todavía no tiene ejercicios.
        </Text>
      )}
      <View style={styles.footer}>
        <Text variant="caption">{summary}</Text>
        {lastTime ? <Text variant="caption">Última vez: {lastTime}</Text> : null}
      </View>
      <Button
        title="Empezar"
        size="lg"
        icon="play"
        disabled={blocked || exercises.length === 0}
        onPress={onStart}
      />
      <Button
        title="Elegir otro día"
        variant="ghost"
        disabled={blocked}
        onPress={onPickDay}
        style={styles.pick}
      />
      {blocked ? (
        <Text variant="caption" style={styles.blocked}>
          Terminá el entrenamiento en curso para empezar otro.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: space.lg + 2,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    borderRadius: radii.xl + 2,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rings: { position: 'absolute', right: -58, top: -52 },
  head: { gap: space.xs },
  day: { marginTop: space.xs },
  list: { marginTop: space.md + 2 },
  item: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  itemBorder: { borderTopWidth: stroke.hairline, borderTopColor: colors.divider },
  itemName: { flex: 1 },
  empty: { marginTop: space.md },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.sm,
    paddingBottom: space.md + 2,
    borderTopWidth: stroke.hairline,
    borderTopColor: colors.divider,
  },
  pick: { marginTop: 0 },
  blocked: { textAlign: 'center', paddingBottom: space.sm },
});

import { StyleSheet, View } from 'react-native';

import { colors, radii, space } from '../../theme';
import { KalkWordmark } from '../brand/KalkWordmark';
import { Text } from '../Text';

/** A personal record of the last 14 days, for the "· PR 140 × 5 en sentadilla" chip. */
export interface HeadlinePr {
  /** "140 × 5" (weight already in the user's unit). */
  set: string;
  /** Exercise name, shown in lower case after "en". */
  exercise: string;
}

export interface WeekProgress {
  /** Finished workouts this week (Monday to Sunday). */
  done: number;
  /** Days of the active routine (segments shown, at most 7). */
  planned: number;
}

export interface Headline {
  /** "HOY TOCA" / "QUEDÓ A MEDIAS" / "PRIMER PASO". */
  label: string;
  /** Day name, workout name or "Armá tu rutina". */
  title: string;
  /** "Último entreno hace 3 días", "3 de 5 ejercicios · lo empezaste…". */
  support: string;
  pr?: HeadlinePr;
}

interface HoyHeaderProps {
  /** Undefined while Hoy loads: only the wordmark is drawn. */
  headline?: Headline;
  /** Weekly meter, only when there is a routine. */
  week?: WeekProgress;
}

const WORDMARK_HEIGHT = 20;
const MAX_SEGMENTS = 7;

/**
 * Header of Hoy (design/L5, option 1; S5 box "22:30"): the KΛLK wordmark centered on top, then a
 * headline that says what is due, with the weekly meter on the right. Nothing here is tappable.
 */
export function HoyHeader({ headline, week }: HoyHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <KalkWordmark height={WORDMARK_HEIGHT} tone="mono" />
      </View>
      {headline ? <HeadlineRow {...headline} week={week} /> : null}
    </View>
  );
}

function HeadlineRow({ label, title, support, pr, week }: Headline & { week?: WeekProgress }) {
  return (
    <View style={styles.headline}>
      <View style={styles.texts}>
        <Text variant="label">{label}</Text>
        <Text variant="displayL" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.support}>
          <Text variant="bodyS" color="textBody">
            {pr ? `${support} ·` : support}
          </Text>
          {pr ? (
            <>
              <View style={styles.prChip}>
                <Text variant="badge" color="onAccent">
                  PR
                </Text>
              </View>
              <Text variant="prNum">{pr.set}</Text>
              <Text variant="bodyS" color="textBody">
                en {pr.exercise.toLocaleLowerCase('es')}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      {week ? <WeekMeter {...week} /> : null}
    </View>
  );
}

/** "SEMANA 1/4" and one segment per routine day, green for each workout done this week. */
function WeekMeter({ done, planned }: WeekProgress) {
  const segments = Math.min(Math.max(planned, 1), MAX_SEGMENTS);
  return (
    <View
      style={styles.meter}
      accessible
      accessibilityLabel={`Esta semana: ${done} de ${planned} ${planned === 1 ? 'entrenamiento' : 'entrenamientos'}`}
    >
      {/* Two Texts in a row: never nest the 15 pt number inside the 11 pt label. */}
      <View style={styles.meterText}>
        <Text variant="label">Semana</Text>
        {/* Capped at the plan: a full week reads "4/4" even with an extra workout. */}
        <Text variant="meterNum">
          {Math.min(done, planned)}/{planned}
        </Text>
      </View>
      <View style={styles.segments}>
        {Array.from({ length: segments }, (_, i) => (
          <View key={i} style={[styles.segment, i < done && styles.segmentDone]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Starts where the old header started; the wordmark sits 18 pt above the headline. */
  root: { paddingTop: space.md, paddingBottom: space.md + 2, gap: space.lg + 2 },
  brand: { alignItems: 'center' },
  headline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: space.md,
  },
  texts: { flex: 1, minWidth: 0, gap: 6 },
  support: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6 },
  prChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.badge,
    backgroundColor: colors.record,
  },
  meter: { alignItems: 'flex-end', gap: 6, paddingBottom: 3 },
  meterText: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { width: 14, height: 5, borderRadius: radii.xs, backgroundColor: colors.border },
  segmentDone: { backgroundColor: colors.success },
});

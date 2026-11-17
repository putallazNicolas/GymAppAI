import { summarizePlannedSets, type PlannedExercise } from '@gym/core';
import { StyleSheet, View } from 'react-native';

import { restLabel } from '../lib/planFormat';
import { DEFAULT_REST_SECONDS } from '../lib/rest';
import { colors, hit, radii, space, stroke } from '../theme';

import { Icon } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface PlannedExerciseRowProps {
  planned: PlannedExercise;
  name: string;
  /** 1-based position shown in accent. */
  position: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Opens the edit sheet. */
  onOpen: () => void;
  onMove: (delta: -1 | 1) => void;
}

/**
 * Closed row of a planned exercise (design/P07b): number, name, summary ("4 × 8-10" or
 * "5 · 3 · 1 · AMRAP" + POR SERIE), rest and note. The whole row opens the sheet; only the
 * stacked up/down buttons act on their own. No inputs and no trash.
 */
export function PlannedExerciseRow({
  planned,
  name,
  position,
  canMoveUp,
  canMoveDown,
  onOpen,
  onMove,
}: PlannedExerciseRowProps) {
  const perSet = planned.repsMode === 'perSet';
  const summary = summarizePlannedSets(planned);
  const unset = planned.restSeconds === undefined;
  const rest = restLabel(planned.restSeconds ?? DEFAULT_REST_SECONDS);
  const spokenRest = unset ? `descanso por defecto ${rest}` : `descanso ${rest}`;
  const note = planned.notes?.trim();

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Editar ${name}: ${perSet ? `${planned.plannedSets.length} series, reps ${planned.plannedSets.map((s) => s.reps).join(', ')}` : summary}, ${spokenRest}`}
        onPress={onOpen}
        scaleTo={0.99}
        style={styles.main}
      >
        <Text variant="numRow" color="accent" style={styles.position}>
          {position}
        </Text>
        <View style={styles.body}>
          <Text variant="rowName" numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.summaryRow}>
            <Text variant="numSummary" numberOfLines={1} style={styles.summary}>
              {summary}
            </Text>
            {perSet ? (
              <View style={styles.tag}>
                <Text variant="tag" color="textBody">
                  Por serie
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.restRow}>
            <Icon name="clock" size={14} color="textSecondary" />
            <Text variant="numS" color={unset ? 'textTertiary' : 'textBody'} style={styles.rest}>
              {rest}
            </Text>
            {note ? (
              <Text variant="caption" numberOfLines={1} style={styles.note}>
                · {note}
              </Text>
            ) : null}
          </View>
        </View>
      </PressableScale>
      <View style={styles.arrows}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Subir ${name}`}
          accessibilityState={{ disabled: !canMoveUp }}
          disabled={!canMoveUp}
          onPress={() => onMove(-1)}
          style={[styles.arrow, !canMoveUp && styles.arrowOff]}
        >
          <Icon name="up" size={20} color="textBody" strokeWidth={2.4} />
        </PressableScale>
        <View style={styles.arrowDivider} />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Bajar ${name}`}
          accessibilityState={{ disabled: !canMoveDown }}
          disabled={!canMoveDown}
          onPress={() => onMove(1)}
          style={[styles.arrow, !canMoveDown && styles.arrowOff]}
        >
          <Icon name="down" size={20} color="textBody" strokeWidth={2.4} />
        </PressableScale>
      </View>
    </View>
  );
}

const ARROWS_WIDTH = 48;
const POSITION_WIDTH = 40;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'stretch' },
  position: { width: POSITION_WIDTH, paddingTop: space.md, textAlign: 'center' },
  body: {
    flex: 1,
    minWidth: 0,
    gap: space.xs,
    paddingTop: space.sm + 2,
    paddingBottom: space.md,
    paddingRight: space.sm + 2,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  summary: { flexShrink: 1 },
  tag: {
    paddingHorizontal: space.sm - 1,
    paddingVertical: 2,
    borderRadius: radii.sm - 2,
    borderWidth: stroke.hairline,
    borderColor: colors.borderStrong,
  },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, minWidth: 0 },
  rest: { flexShrink: 0 },
  note: { flexShrink: 1, minWidth: 0 },
  arrows: {
    width: ARROWS_WIDTH,
    borderLeftWidth: stroke.hairline,
    borderLeftColor: colors.border,
  },
  arrow: { flex: 1, minHeight: hit.min, alignItems: 'center', justifyContent: 'center' },
  arrowOff: { opacity: 0.3 },
  arrowDivider: { height: stroke.hairline, backgroundColor: colors.border },
});

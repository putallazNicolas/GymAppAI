import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '../PressableScale';
import { Text } from '../Text';
import { colors, radii, space, stroke } from '../../theme';

export interface HistoryRow {
  key: string;
  /** "Jue 15 oct". */
  date: string;
  /** "Piernas A · 4 series". */
  detail: string;
  /** "140 × 5". */
  bestSet: string;
  /** "163". */
  e1rm: string;
  tag?: 'PR' | 'PR PESO';
}

interface HistoryListProps {
  rows: HistoryRow[];
  /** Rows visible before expanding. */
  collapsedCount?: number;
}

const ROW_H = 60;
const DEFAULT_COLLAPSED = 4;

/** "Historial": session rows (newest first), the rest behind "Ver las N sesiones". */
export function HistoryList({ rows, collapsedCount = DEFAULT_COLLAPSED }: HistoryListProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, collapsedCount);
  const canExpand = rows.length > collapsedCount;
  return (
    <View style={styles.card}>
      {visible.map((r) => (
        <View key={r.key} style={styles.row}>
          <View style={styles.texts}>
            <View style={styles.dateLine}>
              <Text variant="bodyMSemi">{r.date}</Text>
              {r.tag ? (
                <View style={[styles.tag, r.tag === 'PR' ? styles.tagSolid : styles.tagOutline]}>
                  <Text variant="badge" color={r.tag === 'PR' ? 'onAccent' : 'record'}>
                    {r.tag}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="caption" numberOfLines={1}>
              {r.detail}
            </Text>
          </View>
          <Text variant="numRow">{r.bestSet}</Text>
          <Text variant="numS" color="textSecondary" style={styles.e1rm}>
            {r.e1rm}
          </Text>
        </View>
      ))}
      {canExpand ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((v) => !v)}
          style={styles.more}
          scaleTo={1}
        >
          <Text variant="bodyMSemi" color="accent">
            {expanded ? 'Ver menos' : `Ver las ${rows.length} sesiones`}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: ROW_H,
    paddingHorizontal: 14,
    borderBottomWidth: stroke.hairline,
    borderBottomColor: colors.divider,
  },
  texts: { flex: 1, gap: 1 },
  dateLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { paddingHorizontal: 5, borderRadius: space.xs },
  tagSolid: { backgroundColor: colors.record },
  tagOutline: { borderWidth: stroke.hairline, borderColor: colors.record },
  e1rm: { width: 52, textAlign: 'right' },
  more: { height: 48, alignItems: 'center', justifyContent: 'center' },
});

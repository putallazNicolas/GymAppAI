import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, radii, space, stroke } from '../../theme';
import { Button } from '../Button';
import { Text } from '../Text';

interface HomeEmptyProps {
  onCreateRoutine: () => void;
  onImport: () => void;
}

const STEPS = [
  'Creá una rutina y ponele nombre',
  'Sumá días y ejercicios con series y reps',
  'Empezá y cargá cada serie con un toque',
];

/** The empty barbell of design/P02: plates are dashed outlines, nothing loaded yet. */
function EmptyBarbell() {
  const dashed = {
    fill: 'none',
    stroke: colors.borderStrong,
    strokeWidth: 1.5,
    strokeDasharray: '4 4',
  } as const;
  return (
    <Svg
      width={320}
      height={110}
      viewBox="0 0 320 110"
      accessibilityLabel="Barra olímpica sin discos"
      accessibilityRole="image"
    >
      <Rect x={44} y={12} width={20} height={86} rx={4} {...dashed} />
      <Rect x={68} y={22} width={14} height={66} rx={3} {...dashed} />
      <Rect x={256} y={12} width={20} height={86} rx={4} {...dashed} />
      <Rect x={238} y={22} width={14} height={66} rx={3} {...dashed} />
      <Rect x={8} y={49} width={80} height={12} rx={3} fill={colors.border} />
      <Rect x={232} y={49} width={80} height={12} rx={3} fill={colors.border} />
      <Rect x={86} y={43} width={8} height={24} rx={2} fill={colors.borderStrong} />
      <Rect x={226} y={43} width={8} height={24} rx={2} fill={colors.borderStrong} />
      <Rect x={94} y={52} width={132} height={6} rx={3} fill={colors.textDisabled} />
      <Path
        d="M120 52v6M126 52v6M132 52v6M188 52v6M194 52v6M200 52v6"
        stroke={colors.borderStrong}
        strokeWidth={1}
      />
    </Svg>
  );
}

/** Hoy without routines (design/P02): empty barbell, CTA, import and the 3-step list. */
export function HomeEmpty({ onCreateRoutine, onImport }: HomeEmptyProps) {
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <EmptyBarbell />
        <Text variant="displayL" style={styles.title}>
          La barra está vacía
        </Text>
        <Text variant="body" color="textBody" style={styles.message}>
          Armá tu primera rutina y cada día te sugerimos qué entrenar.
        </Text>
        <View style={styles.actions}>
          <Button title="Armá tu primera rutina" size="lg" icon="add" onPress={onCreateRoutine} />
          <Button title="Importar datos" variant="secondary" onPress={onImport} />
        </View>
      </View>
      <View>
        {STEPS.map((step, i) => (
          <View key={step} style={[styles.step, i < STEPS.length - 1 && styles.stepBorder]}>
            <Text variant="displayM" color={i === 0 ? 'accent' : 'textTertiary'} style={styles.n}>
              {i + 1}
            </Text>
            <Text variant="bodyM" color={i === 0 ? 'textPrimary' : 'textBody'}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xxl },
  card: {
    alignItems: 'center',
    paddingTop: space.xxl + 4,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  title: { marginTop: space.lg + 2, textAlign: 'center' },
  message: { marginTop: space.sm + 2, maxWidth: 290, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xl + 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, minHeight: 52 },
  stepBorder: { borderBottomWidth: stroke.hairline, borderBottomColor: colors.divider },
  n: { width: 28 },
});

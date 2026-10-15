import type { Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radii, spacing, touch, typography } from '../theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface SetRowProps {
  /** 1-based set number shown in the first column. */
  index: number;
  /** What was done last time, e.g. "80 × 8". */
  previousText?: string;
  kg: string;
  reps: string;
  repsPlaceholder?: string;
  completed: boolean;
  onChangeKg: (value: string) => void;
  onChangeReps: (value: string) => void;
  onToggleComplete: () => void;
  kgInputRef?: Ref<TextInput>;
  repsInputRef?: Ref<TextInput>;
  /** Called when the keyboard "next" key is pressed on the kg input. */
  onSubmitKg?: () => void;
  onSubmitReps?: () => void;
  /** Fired when an input loses focus: persist edited values here. */
  onBlurKg?: () => void;
  onBlurReps?: () => void;
}

/** `# | Anterior | Kg | Reps | ✓` row (SCREENS.md 4.2). Turns green when completed. */
export function SetRow({
  index,
  previousText,
  kg,
  reps,
  repsPlaceholder,
  completed,
  onChangeKg,
  onChangeReps,
  onToggleComplete,
  kgInputRef,
  repsInputRef,
  onSubmitKg,
  onSubmitReps,
  onBlurKg,
  onBlurReps,
}: SetRowProps) {
  return (
    <View style={[styles.row, completed && styles.rowCompleted]}>
      <Text style={styles.index} color={completed ? 'success' : 'textMuted'}>
        {index}
      </Text>
      <Text style={styles.previous} variant="caption" numberOfLines={1}>
        {previousText ?? '—'}
      </Text>
      <TextInput
        ref={kgInputRef}
        style={[styles.input, completed && styles.inputCompleted]}
        value={kg}
        onChangeText={onChangeKg}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        selectTextOnFocus
        accessibilityLabel={`Kg, serie ${index}`}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={onSubmitKg}
        onBlur={onBlurKg}
      />
      <TextInput
        ref={repsInputRef}
        style={[styles.input, completed && styles.inputCompleted]}
        value={reps}
        onChangeText={onChangeReps}
        keyboardType="number-pad"
        placeholder={repsPlaceholder}
        placeholderTextColor={colors.textMuted}
        selectTextOnFocus
        accessibilityLabel={`Repeticiones, serie ${index}`}
        onSubmitEditing={onSubmitReps}
        onBlur={onBlurReps}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Completar serie ${index}`}
        accessibilityState={{ checked: completed }}
        onPress={onToggleComplete}
        hitSlop={4}
        style={[styles.check, completed && styles.checkCompleted]}
      >
        <Icon name="check" size={22} color={completed ? 'onSuccess' : 'textMuted'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min + spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowCompleted: { backgroundColor: colors.successSurface },
  index: { width: 24, textAlign: 'center', fontWeight: typography.weight.bold },
  previous: { flex: 1.2 },
  input: {
    flex: 1,
    minHeight: touch.min,
    textAlign: 'center',
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
  },
  inputCompleted: { backgroundColor: colors.successSurface, color: colors.success },
  check: {
    width: touch.check,
    height: touch.check,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkCompleted: { backgroundColor: colors.success, borderColor: colors.success },
});

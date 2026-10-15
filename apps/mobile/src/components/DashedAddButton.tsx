import { StyleSheet } from 'react-native';

import { colors, hit, radii, space, stroke } from '../theme';

import { Icon } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface DashedAddButtonProps {
  title: string;
  onPress: () => void;
}

/** Dashed full-width "add" row (design/P06 "Agregar día", P07 "Agregar ejercicio"). */
export function DashedAddButton({ title, onPress }: DashedAddButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.btn}
    >
      <Icon name="add" size={20} color="accent" strokeWidth={2.6} />
      <Text variant="buttonM">{title}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: hit.cta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radii.lg,
    borderWidth: stroke.regular,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
});

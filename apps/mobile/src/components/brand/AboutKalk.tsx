import { StyleSheet, View } from 'react-native';

import { appVersionLabel } from '../../lib/appVersion';
import { colors, radii, space, stroke } from '../../theme';
import { Text } from '../Text';

import { KalkMark } from './KalkMark';
import { KalkWordmark } from './KalkWordmark';

const ICON_SIZE = 56;
const WORDMARK_HEIGHT = 18;

/**
 * "Acerca de Kalk" (design/L3): the only place inside the app with the icon in color. No
 * actions; the wordmark stays one ink (one orange per piece).
 */
export function AboutKalk() {
  return (
    <View style={styles.card}>
      <Text variant="label" accessibilityRole="header">
        Acerca de Kalk
      </Text>
      <KalkMark size={ICON_SIZE} tile tone="color" />
      <KalkWordmark height={WORDMARK_HEIGHT} tone="mono" />
      <Text variant="caption" color="textBody" style={styles.center}>
        {'Tu planilla de fuerza, sin papel.\nTus datos quedan en este teléfono.'}
      </Text>
      <Text variant="numS" color="textTertiary">
        Versión {appVersionLabel()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: space.sm + 2,
    paddingVertical: space.lg + 2,
    paddingHorizontal: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  center: { textAlign: 'center' },
});

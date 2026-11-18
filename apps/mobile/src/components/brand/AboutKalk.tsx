import { StyleSheet, View } from 'react-native';

import { appVersionLabel } from '../../lib/appVersion';
import { colors, radii, space, stroke } from '../../theme';
import { Text } from '../Text';

import { KalkMark } from './KalkMark';

const ICON_SIZE = 80;

/**
 * "Acerca de Kalk" (design/L4, approved proposal; S5 box point 5): the icon alone, in color, and
 * the name as text next to the version. The only place inside the app with the icon in color.
 * No wordmark here: the drawn name lives on the foot of Hoy.
 */
export function AboutKalk() {
  return (
    <View style={styles.card}>
      <Text variant="label" accessibilityRole="header">
        Acerca de Kalk
      </Text>
      <KalkMark size={ICON_SIZE} tile tone="color" outline={colors.border} />
      <Text variant="caption" color="textBody" style={styles.center}>
        {'Tu planilla de fuerza, sin papel.\nTus datos quedan en este teléfono.'}
      </Text>
      {/* Two Texts in a row: never nest the 15 pt version inside the 14 pt name. */}
      <View
        style={styles.nameRow}
        accessible
        accessibilityLabel={`Kalk, versión ${appVersionLabel()}`}
      >
        <Text variant="aboutName" color="textPrimary">
          Kalk
        </Text>
        <Text variant="aboutVersion" color="textTertiary">
          {appVersionLabel()}
        </Text>
      </View>
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
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs + 1 },
});

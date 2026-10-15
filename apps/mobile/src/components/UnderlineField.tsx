import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, hit, space, stroke, type } from '../theme';

import { Text } from './Text';

interface UnderlineFieldProps extends TextInputProps {
  label: string;
}

/** Big display-type name field with a 2 pt underline that turns accent on focus (P06/P07). */
export const UnderlineField = forwardRef<TextInput, UnderlineFieldProps>(function UnderlineField(
  { label, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text variant="label">{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textDisabled}
        selectionColor={colors.accent}
        accessibilityLabel={label}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused, style]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: space.xs + 2 },
  input: {
    ...type.displayL,
    minHeight: hit.min + space.xs,
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: space.xs + 2,
    color: colors.textPrimary,
    borderBottomWidth: stroke.thick,
    borderBottomColor: colors.border,
  },
  focused: { borderBottomColor: colors.accent },
});

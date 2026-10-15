import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, hit, inputHeight, inputType, space, stroke } from '../theme';

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
      <View style={[styles.underline, focused && styles.focused]}>
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
          style={[styles.input, style]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: space.xs + 2 },
  underline: {
    minHeight: hit.min + space.xs,
    justifyContent: 'center',
    paddingBottom: space.xs + 2,
    borderBottomWidth: stroke.thick,
    borderBottomColor: colors.border,
  },
  input: {
    ...inputType.displayLInput,
    height: inputHeight.displayL,
    padding: 0,
    color: colors.textPrimary,
  },
  focused: { borderBottomColor: colors.accent },
});

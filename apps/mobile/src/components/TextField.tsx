import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, hit, inputType, radii, space, stroke } from '../theme';

import { Text } from './Text';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label ? <Text variant="label">{label}</Text> : null}
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
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: space.xs },
  input: {
    ...inputType.bodyInput,
    minHeight: hit.min + space.xs,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderWidth: stroke.regular,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: space.lg,
  },
  inputFocused: { borderColor: colors.accent },
  inputError: { borderColor: colors.danger },
});

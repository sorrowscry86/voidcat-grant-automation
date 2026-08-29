import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, usePalette } from '../theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary' ? p.accent : variant === 'secondary' ? p.surfaceAlt : 'transparent';
  const foreground =
    variant === 'primary' ? p.accentText : variant === 'danger' ? p.danger : p.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
          borderColor: variant === 'primary' ? p.accent : p.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
          <Text style={{ color: foreground, fontSize: 16, fontWeight: '600' }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...inputProps
}: TextInputProps & { label: string; hint?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: p.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={p.textFaint}
        {...inputProps}
        style={[
          {
            backgroundColor: p.surface,
            borderColor: p.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            color: p.text,
            fontSize: 16,
          },
          inputProps.multiline ? { minHeight: 96, textAlignVertical: 'top' } : null,
          inputProps.style,
        ]}
      />
      {hint ? <Text style={{ color: p.textFaint, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Badge({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  const p = usePalette();
  const color =
    tone === 'accent' ? p.accent
      : tone === 'success' ? p.success
        : tone === 'warning' ? p.warning
          : tone === 'danger' ? p.danger
            : p.textMuted;

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: tone === 'neutral' ? p.surfaceAlt : p.accentSoft,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function StateView({
  icon,
  title,
  message,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.md }}>
      <Ionicons name={icon} size={44} color={p.textFaint} />
      <Text style={{ color: p.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text style={{ color: p.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 21 }}>
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button label={action.label} onPress={action.onPress} variant="secondary" />
      ) : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const p = usePalette();
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.md }}>
      <ActivityIndicator color={p.accent} />
      {label ? <Text style={{ color: p.textMuted, fontSize: 14 }}>{label}</Text> : null}
    </View>
  );
}

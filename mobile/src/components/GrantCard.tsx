import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Grant } from '../api/types';
import { deadlineLabel, formatAmount } from '../format';
import { radius, spacing, usePalette } from '../theme';

export function GrantCard({
  grant,
  onPress,
  saved,
  onToggleSave,
}: {
  grant: Grant;
  onPress: () => void;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const p = usePalette();
  const amount = formatAmount(grant);
  const deadline = deadlineLabel(grant.deadline);

  const deadlineColor =
    deadline?.tone === 'danger' ? p.danger : deadline?.tone === 'warning' ? p.warning : p.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${grant.title}. ${grant.agency ?? 'Unknown agency'}.`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: p.surface,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.border,
        padding: spacing.lg,
        gap: spacing.sm,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <Text style={{ flex: 1, color: p.text, fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
          {grant.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save opportunity'}
          hitSlop={12}
          onPress={onToggleSave}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={saved ? p.accent : p.textFaint}
          />
        </Pressable>
      </View>

      {grant.agency ? (
        <Text style={{ color: p.textMuted, fontSize: 14 }} numberOfLines={1}>
          {grant.agency}
          {grant.program ? ` · ${grant.program}` : ''}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs }}>
        {amount ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="cash-outline" size={14} color={p.textFaint} />
            <Text style={{ color: p.text, fontSize: 13, fontWeight: '600' }}>{amount}</Text>
          </View>
        ) : null}

        {deadline ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="calendar-outline" size={14} color={deadlineColor} />
            <Text style={{ color: deadlineColor, fontSize: 13, fontWeight: '600' }}>
              {deadline.text}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

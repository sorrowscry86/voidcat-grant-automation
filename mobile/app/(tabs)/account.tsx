import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount } from '../../src/api/auth';
import { ApiError } from '../../src/api/client';
import { Badge, Button, Card } from '../../src/components/ui';
import {
  APP_VERSION,
  PRIVACY_POLICY_URL,
  SHOW_UPGRADE_PATH,
  SUPPORT_EMAIL,
  TERMS_URL,
  WEB_APP_URL,
} from '../../src/config';
import { isPaidTier, useAuth } from '../../src/store/auth';
import { useLibrary } from '../../src/store/library';
import { spacing, usePalette } from '../../src/theme';

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={p.textMuted} />
      <Text style={{ flex: 1, color: p.text, fontSize: 16 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={p.textFaint} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const p = usePalette();
  const { user, signOut } = useAuth();
  const { saved, proposals } = useLibrary();
  const paid = isPaidTier(user);
  const [deleting, setDeleting] = useState(false);

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Saved opportunities stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  async function runDeletion() {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteAccount(user.email);
      await signOut();
    } catch (err) {
      Alert.alert(
        'Could not delete account',
        err instanceof ApiError ? err.message : 'Please try again, or contact support.',
      );
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account and personal data, cancels any active subscription, and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void runDeletion() },
      ],
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={{ color: p.text, fontSize: 26, fontWeight: '800' }}>Account</Text>

        <Card>
          <Text style={{ color: p.text, fontSize: 18, fontWeight: '700' }}>{user?.name}</Text>
          <Text style={{ color: p.textMuted, fontSize: 14 }}>{user?.email}</Text>
          <View style={{ marginTop: spacing.xs }}>
            <Badge
              text={paid ? `${user?.subscription_tier} plan` : 'Free plan'}
              tone={paid ? 'accent' : 'neutral'}
            />
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ color: p.text, fontSize: 22, fontWeight: '800' }}>{saved.length}</Text>
              <Text style={{ color: p.textMuted, fontSize: 13 }}>Saved</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ color: p.text, fontSize: 22, fontWeight: '800' }}>
                {proposals.length}
              </Text>
              <Text style={{ color: p.textMuted, fontSize: 13 }}>Drafts</Text>
            </View>
          </View>
        </Card>

        {SHOW_UPGRADE_PATH && !paid ? (
          <Card>
            <Text style={{ color: p.text, fontSize: 17, fontWeight: '700' }}>Go Pro</Text>
            <Text style={{ color: p.textMuted, fontSize: 14, lineHeight: 20 }}>
              Unlimited AI proposal drafts and priority access to new federal data sources.
            </Text>
            <Button
              label="Manage subscription"
              icon="open-outline"
              variant="secondary"
              style={{ marginTop: spacing.sm }}
              onPress={() => void WebBrowser.openBrowserAsync(WEB_APP_URL)}
            />
          </Card>
        ) : null}

        <Card style={{ paddingVertical: spacing.xs }}>
          <Row
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
          />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />
          <Row
            icon="reader-outline"
            label="Terms of Service"
            onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
          />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />
          <Row
            icon="mail-outline"
            label="Contact support"
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
        </Card>

        <Card>
          <Text style={{ color: p.textMuted, fontSize: 13, lineHeight: 19 }}>
            VoidCat drafts and validates grant material for human review. It does not sign or submit
            documents to federal portals on your behalf — final submission always requires your own
            review and authentication.
          </Text>
        </Card>

        <Button label="Sign out" variant="secondary" onPress={confirmSignOut} />

        <Button
          label="Delete account"
          variant="danger"
          loading={deleting}
          onPress={confirmDelete}
        />

        <Text style={{ color: p.textFaint, fontSize: 12, textAlign: 'center' }}>
          Version {APP_VERSION}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

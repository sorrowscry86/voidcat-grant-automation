import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '../../src/api/client';
import { Button, Field } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { spacing, usePalette } from '../../src/theme';

export default function SignIn() {
  const p = usePalette();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
            <Text style={{ color: p.text, fontSize: 30, fontWeight: '800' }}>VoidCat Grants</Text>
            <Text style={{ color: p.textMuted, fontSize: 16, lineHeight: 22 }}>
              Search federal funding opportunities and draft proposals from your phone.
            </Text>
          </View>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@company.com"
          />

          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            placeholder="Your password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          {error ? (
            <Text style={{ color: p.danger, fontSize: 14, lineHeight: 20 }}>{error}</Text>
          ) : null}

          <Button label="Sign in" onPress={submit} loading={busy} disabled={!canSubmit} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            <Text style={{ color: p.textMuted, fontSize: 15 }}>New to VoidCat?</Text>
            <Link href="/(auth)/sign-up" style={{ color: p.accent, fontSize: 15, fontWeight: '600' }}>
              Create an account
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

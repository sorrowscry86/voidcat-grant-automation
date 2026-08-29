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
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../src/config';
import { useAuth } from '../../src/store/auth';
import { spacing, usePalette } from '../../src/theme';

/** Mirrors the server-side rule in api/src/services/passwordService.js. */
const MIN_PASSWORD_LENGTH = 8;

export default function SignUp() {
  const p = usePalette();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    name.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signUp({
        name: name.trim(),
        email,
        password,
        company: company.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not create your account. Please try again.',
      );
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
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
            <Text style={{ color: p.text, fontSize: 28, fontWeight: '800' }}>Create account</Text>
            <Text style={{ color: p.textMuted, fontSize: 15, lineHeight: 21 }}>
              Free accounts include grant search, saved opportunities, and offline access.
            </Text>
          </View>

          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            placeholder="Jordan Reyes"
          />

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
            label="Organization"
            value={company}
            onChangeText={setCompany}
            placeholder="Optional"
            autoComplete="organization"
          />

          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            hint="Use upper and lower case letters plus a number."
          />

          {error ? (
            <Text style={{ color: p.danger, fontSize: 14, lineHeight: 20 }}>{error}</Text>
          ) : null}

          <Button label="Create account" onPress={submit} loading={busy} disabled={!canSubmit} />

          <Text style={{ color: p.textFaint, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
            By continuing you agree to the{' '}
            <Link href={TERMS_URL as never} style={{ color: p.accent }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href={PRIVACY_POLICY_URL as never} style={{ color: p.accent }}>
              Privacy Policy
            </Link>
            .
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            <Text style={{ color: p.textMuted, fontSize: 15 }}>Already registered?</Text>
            <Link href="/(auth)/sign-in" style={{ color: p.accent, fontSize: 15, fontWeight: '600' }}>
              Sign in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

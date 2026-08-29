import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';

import { ApiError } from '../../src/api/client';
import { generateProposal } from '../../src/api/grants';
import type { ProposalSections } from '../../src/api/types';
import { Badge, Button, Card, Field, Loading, StateView } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { useLibrary } from '../../src/store/library';
import { spacing, usePalette } from '../../src/theme';

function Section({ title, body }: { title: string; body?: string }) {
  const p = usePalette();
  if (!body) return null;
  return (
    <Card>
      <Text style={{ color: p.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: p.textMuted, fontSize: 15, lineHeight: 22 }}>{body}</Text>
    </Card>
  );
}

function asPlainText(grantTitle: string, proposal: ProposalSections) {
  return [
    grantTitle,
    '',
    'EXECUTIVE SUMMARY',
    proposal.executive_summary,
    '',
    'TECHNICAL APPROACH',
    proposal.technical_approach,
    '',
    'COMMERCIAL POTENTIAL',
    proposal.commercial_potential,
  ]
    .filter(Boolean)
    .join('\n');
}

export default function ProposalScreen() {
  const p = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { findGrant, proposalFor, storeProposal } = useLibrary();

  const grant = id ? findGrant(decodeURIComponent(id)) : undefined;
  const existing = grant ? proposalFor(grant.id) : undefined;

  const [name, setName] = useState(user?.company ?? '');
  const [description, setDescription] = useState('');
  const [expertise, setExpertise] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(!existing);

  if (!grant) {
    return (
      <View style={{ flex: 1, backgroundColor: p.background, justifyContent: 'center' }}>
        <StateView
          icon="help-circle-outline"
          title="Opportunity not loaded"
          message="Search for this grant again to draft a proposal."
          action={{ label: 'Go to search', onPress: () => router.replace('/(tabs)') }}
        />
      </View>
    );
  }

  const canSubmit = name.trim().length > 1 && description.trim().length > 20;

  async function submit() {
    if (!grant || !canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generateProposal(grant, {
        name: name.trim(),
        description: description.trim(),
        expertise: expertise.trim() || undefined,
      });
      storeProposal({
        grantId: grant.id,
        grantTitle: grant.title,
        proposal: result.proposal,
        executionType: result.execution_type,
        generatedAt: result.generated_at,
      });
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Proposal generation failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <View style={{ flex: 1, backgroundColor: p.background, justifyContent: 'center' }}>
        <Loading label="Drafting your proposal — this can take up to a minute." />
      </View>
    );
  }

  if (existing && !showForm) {
    const { proposal } = existing;
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: p.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: p.text, fontSize: 20, fontWeight: '800', lineHeight: 27 }}>
            {existing.grantTitle}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Badge
              text={existing.executionType === 'real' ? 'AI generated' : 'Template draft'}
              tone={existing.executionType === 'real' ? 'accent' : 'neutral'}
            />
            <Badge text="Needs your review" tone="warning" />
          </View>
        </View>

        <Section title="Executive summary" body={proposal.executive_summary} />
        <Section title="Technical approach" body={proposal.technical_approach} />
        <Section title="Commercial potential" body={proposal.commercial_potential} />

        {proposal.budget_summary ? (
          <Card>
            <Text style={{ color: p.text, fontSize: 16, fontWeight: '700' }}>Indicative budget</Text>
            {(
              [
                ['Personnel', proposal.budget_summary.personnel],
                ['Equipment', proposal.budget_summary.equipment],
                ['Overhead', proposal.budget_summary.overhead],
                ['Total', proposal.budget_summary.total],
              ] as const
            ).map(([label, value]) => (
              <View
                key={label}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}
              >
                <Text style={{ color: p.textMuted, fontSize: 15 }}>{label}</Text>
                <Text style={{ color: p.text, fontSize: 15, fontWeight: '600' }}>
                  ${value.toLocaleString('en-US')}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {proposal.timeline?.length ? (
          <Card>
            <Text style={{ color: p.text, fontSize: 16, fontWeight: '700' }}>Timeline</Text>
            {proposal.timeline.map((entry) => (
              <View key={entry.phase} style={{ gap: 2, paddingVertical: spacing.xs }}>
                <Text style={{ color: p.text, fontSize: 14, fontWeight: '600' }}>{entry.phase}</Text>
                <Text style={{ color: p.textMuted, fontSize: 14, lineHeight: 20 }}>
                  {entry.task}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Button
          label="Share draft"
          icon="share-outline"
          variant="secondary"
          onPress={() =>
            void Share.share({ message: asPlainText(existing.grantTitle, proposal) })
          }
        />
        <Button label="Regenerate" variant="ghost" onPress={() => setShowForm(true)} />

        <Text style={{ color: p.textFaint, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
          This is an unreviewed draft. VoidCat cannot sign or submit documents to federal portals on
          your behalf.
        </Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: p.text, fontSize: 20, fontWeight: '800', lineHeight: 27 }}>
            {grant.title}
          </Text>
          <Text style={{ color: p.textMuted, fontSize: 14, lineHeight: 20 }}>
            Tell us about your organization. The draft is built from this profile and the
            opportunity details.
          </Text>
        </View>

        <Field
          label="Organization name"
          value={name}
          onChangeText={setName}
          placeholder="Acme Robotics, Inc."
        />
        <Field
          label="What your organization does"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="We build autonomous inspection systems for offshore energy infrastructure…"
          hint="At least a couple of sentences produces a noticeably better draft."
        />
        <Field
          label="Relevant expertise"
          value={expertise}
          onChangeText={setExpertise}
          multiline
          placeholder="Optional: prior awards, key staff, publications, facilities."
        />

        {error ? (
          <Text style={{ color: p.danger, fontSize: 14, lineHeight: 20 }}>{error}</Text>
        ) : null}

        <Button
          label={existing ? 'Regenerate draft' : 'Generate draft'}
          icon="sparkles-outline"
          onPress={submit}
          disabled={!canSubmit}
        />
        {existing ? (
          <Button label="Back to draft" variant="ghost" onPress={() => setShowForm(false)} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

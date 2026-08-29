import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, StateView } from '../../src/components/ui';
import { deadlineLabel, formatAmount, formatDeadline } from '../../src/format';
import { useLibrary } from '../../src/store/library';
import { spacing, usePalette } from '../../src/theme';

function Detail({ label, value }: { label: string; value?: string | null }) {
  const p = usePalette();
  if (!value) return null;
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: p.textFaint, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: p.text, fontSize: 15, lineHeight: 21 }}>{value}</Text>
    </View>
  );
}

export default function GrantDetail() {
  const p = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findGrant, isSaved, toggleSaved, proposalFor } = useLibrary();

  const grant = id ? findGrant(decodeURIComponent(id)) : undefined;

  if (!grant) {
    // Reachable via a cold deep link: the API has no grant-detail endpoint, so
    // an uncached grant can only be recovered by searching again.
    return (
      <View style={{ flex: 1, backgroundColor: p.background, justifyContent: 'center' }}>
        <StateView
          icon="help-circle-outline"
          title="Opportunity not loaded"
          message="Search for this grant again to view its details."
          action={{ label: 'Go to search', onPress: () => router.replace('/(tabs)') }}
        />
      </View>
    );
  }

  const saved = isSaved(grant.id);
  const amount = formatAmount(grant);
  const deadline = deadlineLabel(grant.deadline);
  const existingDraft = proposalFor(grant.id);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: p.text, fontSize: 24, fontWeight: '800', lineHeight: 31 }}>
          {grant.title}
        </Text>
        {grant.agency ? (
          <Text style={{ color: p.textMuted, fontSize: 15 }}>
            {grant.agency}
            {grant.program ? ` · ${grant.program}` : ''}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {amount ? <Badge text={amount} tone="accent" /> : null}
          {deadline ? (
            <Badge
              text={deadline.text}
              tone={deadline.tone === 'normal' ? 'neutral' : deadline.tone}
            />
          ) : null}
          {grant.opportunity_type ? <Badge text={grant.opportunity_type} /> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button
          label={saved ? 'Saved' : 'Save'}
          icon={saved ? 'bookmark' : 'bookmark-outline'}
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => toggleSaved(grant)}
        />
        <Button
          label="Share"
          icon="share-outline"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() =>
            void Share.share({
              message: `${grant.title}${grant.agency ? ` — ${grant.agency}` : ''}${
                grant.opportunity_number ? ` (${grant.opportunity_number})` : ''
              }`,
            })
          }
        />
      </View>

      {grant.description ? (
        <Card>
          <Text style={{ color: p.text, fontSize: 16, fontWeight: '700' }}>Description</Text>
          <Text style={{ color: p.textMuted, fontSize: 15, lineHeight: 22 }}>
            {grant.description}
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={{ color: p.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs }}>
          Details
        </Text>
        <View style={{ gap: spacing.md }}>
          <Detail label="Opportunity number" value={grant.opportunity_number} />
          <Detail label="CFDA" value={grant.cfda_number} />
          <Detail label="Close date" value={formatDeadline(grant.close_date)} />
          <Detail label="Posted" value={formatDeadline(grant.post_date)} />
          <Detail label="Eligibility" value={grant.eligibility} />
          <Detail
            label="Applicant types"
            value={grant.applicant_types?.length ? grant.applicant_types.join(', ') : null}
          />
          <Detail label="Source" value={grant.data_source} />
        </View>
      </Card>

      <Card>
        <Text style={{ color: p.text, fontSize: 16, fontWeight: '700' }}>Proposal draft</Text>
        <Text style={{ color: p.textMuted, fontSize: 14, lineHeight: 20 }}>
          {existingDraft
            ? 'You already have a draft for this opportunity.'
            : 'Generate a first-pass draft from your organization profile. Every draft needs your review before submission.'}
        </Text>
        <Button
          label={existingDraft ? 'Open draft' : 'Draft a proposal'}
          icon="sparkles-outline"
          style={{ marginTop: spacing.sm }}
          onPress={() => router.push(`/proposal/${encodeURIComponent(grant.id)}`)}
        />
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <Ionicons name="information-circle-outline" size={16} color={p.textFaint} />
        <Text style={{ flex: 1, color: p.textFaint, fontSize: 12, lineHeight: 18 }}>
          Always confirm details against the official announcement before applying.
        </Text>
      </View>
      <View style={{ height: StyleSheet.hairlineWidth }} />
    </ScrollView>
  );
}

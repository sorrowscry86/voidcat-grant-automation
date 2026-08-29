import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '../../src/api/client';
import { sanitizeQuery, searchGrants } from '../../src/api/grants';
import type { Grant } from '../../src/api/types';
import { GrantCard } from '../../src/components/GrantCard';
import { Loading, StateView } from '../../src/components/ui';
import { useLibrary } from '../../src/store/library';
import { radius, spacing, usePalette } from '../../src/theme';

/**
 * The API filters on the `agency` column, which stores full agency names
 * ("National Science Foundation"); the abbreviation lives in `agency_code`,
 * which search does not match against. So each chip sends the shortest
 * distinctive substring of the full name rather than its acronym.
 */
const AGENCIES: { label: string; value?: string }[] = [
  { label: 'All' },
  { label: 'DOD', value: 'Defense' },
  { label: 'NSF', value: 'Science Foundation' },
  { label: 'NIH', value: 'Institutes of Health' },
  { label: 'DOE', value: 'Energy' },
  { label: 'NASA', value: 'Aeronautics' },
  { label: 'DARPA', value: 'Defense Advanced' },
];

export default function SearchScreen() {
  const p = usePalette();
  const router = useRouter();
  const { cacheGrants, isSaved, toggleSaved } = useLibrary();

  const [query, setQuery] = useState('');
  const [agency, setAgency] = useState('All');
  const [grants, setGrants] = useState<Grant[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Lets a newer search cancel the request still in flight.
  const inFlight = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (nextQuery: string, nextAgency: string, mode: 'initial' | 'refresh' = 'initial') => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      if (mode === 'refresh') setRefreshing(true);
      else setStatus('loading');
      setError(null);

      try {
        const result = await searchGrants(
          {
            query: sanitizeQuery(nextQuery) || undefined,
            agency: AGENCIES.find((a) => a.label === nextAgency)?.value,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setGrants(result.grants ?? []);
        cacheGrants(result.grants ?? []);
        setStatus('ready');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiError ? err.message : 'Search is unavailable right now.',
        );
        setStatus('error');
      } finally {
        if (!controller.signal.aborted) setRefreshing(false);
      }
    },
    [cacheGrants],
  );

  // Load an unfiltered list on first open so the tab is never empty.
  useEffect(() => {
    void runSearch('', 'All');
    return () => inFlight.current?.abort();
  }, [runSearch]);

  function selectAgency(next: string) {
    setAgency(next);
    void runSearch(query, next);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.background }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ color: p.text, fontSize: 26, fontWeight: '800' }}>Find funding</Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: p.surface,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.border,
            paddingHorizontal: spacing.md,
          }}
        >
          <Ionicons name="search" size={18} color={p.textFaint} />
          <TextInput
            accessibilityLabel="Search grants"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch(query, agency)}
            returnKeyType="search"
            placeholder="AI, quantum sensing, biotech…"
            placeholderTextColor={p.textFaint}
            style={{ flex: 1, paddingVertical: 12, color: p.text, fontSize: 16 }}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={10}
              onPress={() => {
                setQuery('');
                void runSearch('', agency);
              }}
            >
              <Ionicons name="close-circle" size={18} color={p.textFaint} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {AGENCIES.map((item) => {
            const active = item.label === agency;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => selectAgency(item.label)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm - 1,
                  borderRadius: radius.pill,
                  backgroundColor: active ? p.accent : p.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: active ? p.accent : p.border,
                }}
              >
                <Text
                  style={{
                    color: active ? p.accentText : p.textMuted,
                    fontWeight: '600',
                    fontSize: 14,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {status === 'loading' ? (
        <Loading label="Searching federal opportunities…" />
      ) : status === 'error' ? (
        <StateView
          icon="cloud-offline-outline"
          title="Search unavailable"
          message={error ?? undefined}
          action={{ label: 'Try again', onPress: () => runSearch(query, agency) }}
        />
      ) : (
        <FlatList
          data={grants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => runSearch(query, agency, 'refresh')}
              tintColor={p.accent}
            />
          }
          ListHeaderComponent={
            grants.length > 0 ? (
              <Text style={{ color: p.textFaint, fontSize: 13, marginBottom: spacing.xs }}>
                {grants.length} {grants.length === 1 ? 'opportunity' : 'opportunities'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <StateView
              icon="file-tray-outline"
              title="No matching opportunities"
              message="Try a broader term, or clear the agency filter."
            />
          }
          renderItem={({ item }) => (
            <GrantCard
              grant={item}
              saved={isSaved(item.id)}
              onToggleSave={() => toggleSaved(item)}
              onPress={() => router.push(`/grant/${encodeURIComponent(item.id)}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

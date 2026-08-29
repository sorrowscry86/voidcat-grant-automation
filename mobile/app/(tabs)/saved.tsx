import { useRouter } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GrantCard } from '../../src/components/GrantCard';
import { StateView } from '../../src/components/ui';
import { useLibrary } from '../../src/store/library';
import { spacing, usePalette } from '../../src/theme';

export default function SavedScreen() {
  const p = usePalette();
  const router = useRouter();
  const { saved, isSaved, toggleSaved, proposals } = useLibrary();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs }}>
        <Text style={{ color: p.text, fontSize: 26, fontWeight: '800' }}>Saved</Text>
        <Text style={{ color: p.textMuted, fontSize: 14 }}>
          Available offline
          {proposals.length > 0
            ? ` · ${proposals.length} draft${proposals.length === 1 ? '' : 's'}`
            : ''}
        </Text>
      </View>

      <FlatList
        data={saved}
        keyExtractor={(item) => item.grant.id}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <StateView
            icon="bookmark-outline"
            title="Nothing saved yet"
            message="Tap the bookmark on any opportunity to keep it here — saved grants and drafts stay readable without a connection."
            action={{ label: 'Browse opportunities', onPress: () => router.push('/(tabs)') }}
          />
        }
        renderItem={({ item }) => (
          <GrantCard
            grant={item.grant}
            saved={isSaved(item.grant.id)}
            onToggleSave={() => toggleSaved(item.grant)}
            onPress={() => router.push(`/grant/${encodeURIComponent(item.grant.id)}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

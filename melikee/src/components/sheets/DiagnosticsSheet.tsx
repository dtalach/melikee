/**
 * What the last lookup actually did.
 *
 * Every question about a bad match so far — did the eye see it properly? did
 * the search return an image? how long did each half take? — has been answered
 * by reading the Vercel dashboard and pasting log lines into a chat. The
 * answers were already travelling back in the response; nothing was showing
 * them.
 *
 * So they are here, one tap from Settings. Not a developer console: a plain
 * account of the last thing the app tried, in the order a person would ask.
 */
import { ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { BottomSheet } from '@/components/sheets/BottomSheet';
import { useAppStore } from '@/store/useAppStore';
import { AppText, Button, Eyebrow } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export function DiagnosticsSheet() {
  const theme = useTheme();
  const closeSheet = useAppStore((s) => s.closeSheet);
  const showToast = useAppStore((s) => s.showToast);
  const lookup = useAppStore((s) => s.lastLookup);

  if (!lookup) {
    return (
      <BottomSheet onClose={closeSheet}>
        <AppText style={{ fontSize: 17, fontWeight: '800' }}>Last lookup</AppText>
        <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 18 }}>
          Nothing yet. Snap something and this fills in with what the camera read, what the
          shops said, and how long each half took.
        </AppText>
      </BottomSheet>
    );
  }

  const { reading } = lookup;

  return (
    <BottomSheet onClose={closeSheet}>
      <AppText style={{ fontSize: 17, fontWeight: '800' }}>Last lookup</AppText>
      <AppText tone="muted" style={{ fontSize: 11, marginTop: -6 }}>
        {new Date(lookup.at).toLocaleString()} · {lookup.mode}
      </AppText>

      <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 14, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat label="read" value={lookup.readMs ? `${(lookup.readMs / 1000).toFixed(1)}s` : '—'} />
          <Stat
            label="search"
            value={lookup.searchMs ? `${(lookup.searchMs / 1000).toFixed(1)}s` : '—'}
          />
          <Stat label="found" value={String(lookup.candidates?.length ?? 0)} />
        </View>

        {lookup.error ? (
          <View
            style={{
              borderWidth: 1.5,
              borderColor: brand.pink,
              borderRadius: layout.radius.chip,
              padding: 11,
              gap: 3,
            }}
          >
            <AppText style={{ fontSize: 12, fontWeight: '800', color: brand.pink }}>
              {lookup.error.code}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 11, lineHeight: 15 }}>
              {lookup.error.message}
            </AppText>
          </View>
        ) : null}

        {reading ? (
          <View style={{ gap: 6 }}>
            <Eyebrow>WHAT THE CAMERA READ</Eyebrow>
            <Row label="brand" value={reading.brand} />
            <Row label="product" value={reading.productName} />
            <Row label="model" value={reading.modelNumber} />
            <Row label="category" value={reading.category} />
            <Row label="colour" value={reading.color} />
            <Row label="variant" value={reading.variant} />
            <Row label="sure?" value={reading.confidence} />
            <Row label="frame" value={reading.frameProblem} />
            <Row label="query" value={reading.searchQuery} />
            <Row label="text seen" value={reading.visibleText.join(' · ')} />
          </View>
        ) : null}

        {lookup.candidates?.length ? (
          <View style={{ gap: 6 }}>
            <Eyebrow>WHAT THE SHOPS SAID</Eyebrow>
            {lookup.candidates.map((candidate, index) => (
              <View
                key={`${candidate.name}-${index}`}
                style={{
                  backgroundColor: theme.inset,
                  borderRadius: layout.radius.chip,
                  padding: 10,
                  gap: 2,
                }}
              >
                <AppText style={{ fontSize: 12, fontWeight: '800' }}>
                  {index + 1}. {candidate.name}
                </AppText>
                <AppText tone="muted" style={{ fontSize: 10.5 }}>
                  {candidate.price} · {candidate.store}
                  {candidate.confidence !== undefined ? ` · ${candidate.confidence}%` : ''}
                </AppText>
                {/* The two things that decide whether the match can be checked
                    by eye or bought in one tap. */}
                <AppText tone="muted" style={{ fontSize: 10.5 }}>
                  photo {candidate.hasImage ? '✓' : '✗'} · link {candidate.hasLink ? '✓' : '✗'}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Button
        label="Copy all of it"
        size="md"
        variant="violet"
        onPress={async () => {
          await Clipboard.setStringAsync(JSON.stringify(lookup, null, 2));
          showToast('Copied — paste it anywhere');
        }}
      />
    </BottomSheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.inset,
        borderRadius: layout.radius.chip,
        paddingVertical: 9,
        alignItems: 'center',
      }}
    >
      <AppText tone="lime" style={{ fontSize: 15, fontWeight: '800' }}>
        {value}
      </AppText>
      <AppText tone="muted" style={{ fontSize: 10 }}>
        {label}
      </AppText>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <AppText tone="muted" style={{ fontSize: 11, width: 74 }}>
        {label}
      </AppText>
      <AppText style={{ flex: 1, fontSize: 11, fontWeight: '600' }}>{value || '—'}</AppText>
    </View>
  );
}

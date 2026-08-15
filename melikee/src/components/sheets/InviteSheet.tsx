/**
 * "Find your people" — restructured around the two distinct jobs the design
 * review separated: finding people already on MeLikee (search, primary) and
 * inviting people who aren't (link + QR, secondary). List *sharing* lives in
 * the per-list share sheet, so the two never conflate again.
 */
import * as Clipboard from 'expo-clipboard';
import { TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/sheets/BottomSheet';
import { SearchIcon } from '@/ui/icons';
import { AppText, Avatar, Button, Eyebrow, QrPlaceholder, Squish } from '@/ui/primitives';
import { layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { meProfile, useAppStore } from '@/store/useAppStore';

export function InviteSheet() {
  const theme = useTheme();

  const directory = useAppStore((s) => s.directory);
  const query = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const sendRequest = useAppStore((s) => s.sendRequest);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const linkCopied = useAppStore((s) => s.linkCopied);
  const markLinkCopied = useAppStore((s) => s.markLinkCopied);

  const q = query.trim().toLowerCase();
  const results = directory.filter((person) =>
    q ? `${person.name} ${person.handle}`.toLowerCase().includes(q) : !person.searchOnly,
  );

  const copyLink = async () => {
    await Clipboard.setStringAsync(`https://${meProfile.link}`);
    markLinkCopied();
  };

  return (
    <BottomSheet onClose={closeSheet}>
      <AppText style={{ fontSize: 17, fontWeight: '800' }}>Find your people</AppText>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          backgroundColor: theme.inset,
          borderWidth: 1.5,
          borderColor: theme.violet44,
          borderRadius: layout.radius.pill,
          paddingHorizontal: 15,
          paddingVertical: 10,
        }}
      >
        <SearchIcon size={15} color={theme.muted} />
        <TextInput
          value={query}
          onChangeText={setSearchQuery}
          placeholder="Search name or @handle"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.text, padding: 0 }}
        />
      </View>

      <View style={{ gap: 10 }}>
        {q && results.length === 0 ? (
          <AppText tone="muted" style={{ fontSize: 12, textAlign: 'center', paddingVertical: 4 }}>
            Nobody by that name yet — send them your link below.
          </AppText>
        ) : null}

        {!q ? <Eyebrow>PEOPLE YOU MAY KNOW</Eyebrow> : null}

        {results.map((person) => (
          <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar
              initial={person.initial}
              size={38}
              ring={person.mutual ? 'gradient' : 'flat'}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                  {person.name}{' '}
                  <AppText tone="violet" style={{ fontSize: 13 }}>
                    {person.handle}
                  </AppText>
                </AppText>
                {person.followsYou ? (
                  <View
                    style={{
                      backgroundColor: theme.deep,
                      borderRadius: 5,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                    }}
                  >
                    <AppText tone="soft" style={{ fontSize: 9, fontWeight: '800' }}>
                      follows you
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText tone="muted" style={{ fontSize: 10.5 }}>
                {person.context}
                {person.mutual ? ` · ${person.mutual} mutual` : ''}
              </AppText>
            </View>
            <Button
              label={person.requested ? 'Requested ✓' : 'Add'}
              size="sm"
              variant={person.requested ? 'chip' : 'lime'}
              onPress={() => sendRequest(person.id)}
            />
          </View>
        ))}
      </View>

      {/* The non-user path, deliberately below the fold of the primary job. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.violet33 }} />
        <Eyebrow style={{ fontSize: 10.5 }}>NOT ON MELIKEE YET?</Eyebrow>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.violet33 }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
        <Squish onPress={copyLink} style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: theme.inset,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: theme.lime66,
              borderRadius: layout.radius.chip,
              paddingHorizontal: 12,
              paddingVertical: 11,
            }}
          >
            <Eyebrow style={{ fontSize: 10 }}>SEND YOUR LINK</Eyebrow>
            <AppText tone="lime" style={{ fontSize: 12, fontWeight: '800', marginTop: 2 }}>
              {meProfile.link}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 10, marginTop: 2 }}>
              {linkCopied ? 'copied ✓' : 'tap to copy'}
            </AppText>
          </View>
        </Squish>
        <View
          style={{
            backgroundColor: theme.inset,
            borderWidth: 1.5,
            borderColor: theme.violet44,
            borderRadius: layout.radius.chip,
            padding: 9,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <QrPlaceholder size={52} />
          <AppText tone="muted" style={{ fontSize: 9.5, fontWeight: '700' }}>
            or scan me
          </AppText>
        </View>
      </View>

      <AppText tone="muted" style={{ fontSize: 11, textAlign: 'center' }}>
        New friends see only lists you share. You approve everyone.
      </AppText>
    </BottomSheet>
  );
}

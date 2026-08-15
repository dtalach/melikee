/**
 * Per-list sharing — the path to the non-user gifter page, and the app's
 * viral hook. It leads with the note, because the note is what turns a bare
 * list of things into a message from a person.
 */
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/sheets/BottomSheet';
import { GiftIcon } from '@/ui/icons';
import { AppText, Button, Eyebrow, Squish, webInputReset } from '@/ui/primitives';
import { layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { meProfile, useAppStore, visibilityLabel } from '@/store/useAppStore';
import { suggestedShareNote } from '@/data/seed';

export function ShareSheet({ listId }: { listId: string }) {
  const theme = useTheme();
  const router = useRouter();

  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const note = useAppStore((s) => s.notes[listId] ?? '');
  const setNote = useAppStore((s) => s.setNote);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const showToast = useAppStore((s) => s.showToast);
  const linkCopied = useAppStore((s) => s.linkCopied);
  const markLinkCopied = useAppStore((s) => s.markLinkCopied);

  if (!list) return null;

  const slug = list.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const link = `${meProfile.link}/${slug}`;

  const copy = async () => {
    await Clipboard.setStringAsync(`https://${link}`);
    markLinkCopied();
  };

  const sendVia = async (channel: 'sms' | 'whatsapp' | 'email') => {
    const body = `${note || `Here's my ${list.name} on MeLikee`} https://${link}`;
    const url =
      channel === 'sms'
        ? `sms:?body=${encodeURIComponent(body)}`
        : channel === 'whatsapp'
          ? `whatsapp://send?text=${encodeURIComponent(body)}`
          : `mailto:?subject=${encodeURIComponent(`${meProfile.name}'s ${list.name}`)}&body=${encodeURIComponent(body)}`;

    const opened = await Linking.openURL(url).then(
      () => true,
      () => false,
    );
    if (!opened) {
      await copy();
      showToast('Copied the link instead — paste it anywhere');
    }
  };

  return (
    <BottomSheet onClose={closeSheet}>
      <AppText style={{ fontSize: 17, fontWeight: '800' }}>Share “{list.name}”</AppText>

      {/* The note renders at the top of the public page. */}
      <View style={{ gap: 6 }}>
        <Eyebrow>ADD A NOTE — IT SHOWS AT THE TOP OF YOUR PAGE</Eyebrow>
        <TextInput
          value={note}
          onChangeText={(value) => setNote(listId, value)}
          multiline
          numberOfLines={3}
          placeholder="Hello all, I'm turning 16…"
          placeholderTextColor={theme.muted}
          style={{
            backgroundColor: theme.inset,
            borderWidth: 1.5,
            borderColor: theme.violet44,
            borderRadius: layout.radius.chip,
            paddingHorizontal: 13,
            paddingVertical: 11,
            fontSize: 13,
            fontWeight: '600',
            color: theme.text,
            minHeight: 74,
            textAlignVertical: 'top',
            ...webInputReset,
          }}
        />
        <Squish onPress={() => setNote(listId, suggestedShareNote)}>
          <AppText tone="violet" style={{ fontSize: 11, fontWeight: '700' }}>
            ✨ Write one for me
          </AppText>
        </Squish>
      </View>

      {/* The link itself. */}
      <Squish onPress={copy}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: theme.inset,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: theme.lime66,
            borderRadius: layout.radius.chip,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ fontSize: 10 }}>ANYONE WITH THE LINK</Eyebrow>
            <AppText tone="lime" style={{ fontSize: 13, fontWeight: '800', marginTop: 2 }}>
              {link}
            </AppText>
          </View>
          <Button label={linkCopied ? 'Copied ✓' : 'Copy'} size="sm" onPress={copy} />
        </View>
      </Squish>

      {/* Why this matters: the people who'll use it don't have the app. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          backgroundColor: theme.inset,
          borderRadius: layout.radius.chip,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View style={{ marginTop: 2 }}>
          <GiftIcon size={16} color={theme.limeText} />
        </View>
        <AppText tone="muted" style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>
          <AppText style={{ fontSize: 12, fontWeight: '800' }}>No app needed.</AppText> Grandma,
          aunts, anyone — they open a simple page, see your shinies, and call dibs. You’ll never see
          what’s been dibsed.{' '}
          <AppText
            tone="violet"
            style={{ fontSize: 12, fontWeight: '800' }}
            onPress={() => {
              closeSheet();
              router.push({ pathname: '/g/[handle]', params: { handle: meProfile.slug, list: listId } });
            }}
          >
            Preview their view →
          </AppText>
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Text it" variant="chip" style={{ flex: 1 }} onPress={() => sendVia('sms')} />
        <Button
          label="WhatsApp"
          variant="chip"
          style={{ flex: 1 }}
          onPress={() => sendVia('whatsapp')}
        />
        <Button label="Email" variant="chip" style={{ flex: 1 }} onPress={() => sendVia('email')} />
      </View>

      <AppText tone="muted" style={{ fontSize: 11, textAlign: 'center' }}>
        {list.visibility === 'me'
          ? 'Heads up: this list is set to “just me” — sharing the link makes it visible to whoever has it.'
          : `Friends in the app see it in their Feed too — it's ${visibilityLabel(list.visibility)}.`}
      </AppText>
    </BottomSheet>
  );
}

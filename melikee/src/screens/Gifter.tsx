/**
 * What gifters see: a plain, paper-toned page that opens from a link with no
 * app. `GifterView` draws it; two sources feed it:
 *
 *   GifterPage    your own lists, in the app's "Preview my page" (no real dibs:
 *                 the wisher never sees what's claimed)
 *   RemoteGifter  someone's page loaded from the server at melikee.app/<handle>,
 *                 with real, shared dibs
 *
 * Rules (spec): the wisher never sees dibs; first dibs asks for a display
 * name shown to other gifters only; one claim per shiny; pending shinies read
 * "Still choosing"; after dibs, "Buy at {store} →".
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '@/components/Toast';
import { cleanSizes, sizeParts, type Sizes } from '@/lib/sizes';
import { label } from '@/lib/dates';
import { callDibs, readPage } from '@/lib/pages';
import type { DibsView, PublicItem } from '@/lib/pagesContract';
import { listById, useApp } from '@/store/useApp';
import { brand, font, gift } from '@/theme/tokens';
import { Sparkle } from '@/ui/icons';
import { Appear, SlideUp } from '@/ui/motion';
import { Avatar, LimeFill, T, Tap, noOutline } from '@/ui/primitives';
import { BoardCover, coverShots } from './shared';

const NAME_CHIPS = ['Grandma', 'Mom', 'Dad', 'Aunt', 'A friend'];

type ViewProps = {
  state: 'loading' | 'expired' | 'ready' | 'error';
  preview?: boolean;
  owner: string;
  birthday: string;
  sizes?: Sizes;
  listName: string;
  isMain: boolean;
  note?: string;
  items: PublicItem[];
  dibs: DibsView;
  gifterName: string;
  setGifterName: (name: string) => void;
  /** Claim (true) or release (false). The view has already made sure there's a name. */
  onDibs: (itemId: number, claim: boolean) => void;
  busy?: number | null;
  onRetry?: () => void;
};

export function GifterView(p: ViewProps) {
  const insets = useSafeAreaInsets();
  const back = useApp((s) => s.back);
  const showToast = useApp((s) => s.showToast);
  const [asking, setAsking] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  // "Maya’s wishlist"; without a name, "Their wishlist" (never "Their’s").
  const owner = p.owner || 'They';
  const whose = p.owner ? `${p.owner}’s` : 'Their';
  const items = p.items.slice().sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0));
  const shots = coverShots(items.filter((i) => i.image && !i.pending));

  const confirmName = () => {
    const nm = draft.trim();
    if (!nm || asking == null) return;
    p.setGifterName(nm);
    p.onDibs(asking, true);
    setAsking(null);
  };

  const joinCta = (title: string) => (
    <View style={{ marginTop: 6, backgroundColor: gift.text, borderRadius: 10, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
      <View style={{ flex: 1 }}>
        <T size={13.5} w={800} color={gift.page}>
          {title}
        </T>
        <T size={11} color={gift.page} style={{ opacity: 0.8, marginTop: 2 }}>
          Free. Friends call dibs, nobody gets doubles.
        </T>
      </View>
      <Tap onPress={() => (p.preview ? showToast('Opens MeLikee — their list starts with one tap') : router.replace('/'))} style={{ backgroundColor: gift.page, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999 }}>
        <T size={13} w={500} color={gift.text}>
          Make mine
        </T>
      </Tap>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: gift.page, paddingTop: insets.top }}>
      {p.preview ? (
        <View style={{ paddingVertical: 9, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: gift.band, borderBottomWidth: 1, borderBottomColor: gift.bandLine }}>
          <Tap onPress={back}>
            <T size={11} w={700} color={gift.accent}>
              ✕ Exit preview
            </T>
          </Tap>
          <T size={11} w={600} color={gift.meta} style={{ flex: 1, textAlign: 'right' }}>
            what gifters see — a link, no app
          </T>
        </View>
      ) : null}

      {p.state === 'loading' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={gift.accent} />
        </View>
      ) : p.state === 'error' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 36 }}>
          <T size={17} w={800} color={gift.text} style={{ textAlign: 'center' }}>
            Couldn’t load this list
          </T>
          <T size={13} color={gift.body} style={{ textAlign: 'center' }}>
            Check your connection and try again.
          </T>
          {p.onRetry ? (
            <Tap onPress={p.onRetry} style={{ backgroundColor: gift.band, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999 }}>
              <T size={13} w={700} color={gift.accent}>
                Try again
              </T>
            </Tap>
          ) : null}
        </View>
      ) : p.state === 'expired' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 36 }}>
          <T size={21} w={800} color={gift.text} style={{ textAlign: 'center', letterSpacing: -0.42 }}>
            This list link has expired
          </T>
          <T size={13} color={gift.body} style={{ textAlign: 'center', lineHeight: 19.5 }}>
            {p.owner ? `${p.owner}’s links stop working after the occasion, or when a new one is made. Ask ${p.owner} for the latest.` : 'Links stop working after the occasion, or when a new one is made. Ask for the latest.'}
          </T>
          {joinCta('Make your own list')}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}>
          <Appear style={{ paddingTop: 20, paddingHorizontal: 22, paddingBottom: 6, gap: 9, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Sparkle size={13} color={gift.accent} />
              <T size={12} w={700} color={gift.accent} style={{ letterSpacing: 0.24 }}>
                MeLikee
              </T>
            </View>
            {shots.length ? (
              // The list as a board: its best photos, like the owner sees it.
              <View style={{ alignSelf: 'stretch', maxWidth: 420, width: '100%', marginVertical: 4 }}>
                <BoardCover shots={shots} accent={gift.thumb} initial="" initialInk={gift.text} gapColor={gift.page} />
              </View>
            ) : (
              <Avatar initial={owner[0]} size={58} ring={brand.pink} ringWidth={1.5} fill="#fff" color={gift.text} gap="#fff" fontSize={21} />
            )}
            <T size={28} w={300} color={gift.text} style={{ letterSpacing: -0.7, textAlign: 'center' }}>
              {whose} {p.isMain ? 'wishlist' : p.listName}
            </T>
            {p.note ? (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: gift.bandLine, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, maxWidth: 280 }}>
                <T size={12.5} w={600} color={gift.body} style={{ lineHeight: 19, textAlign: 'center' }}>
                  “{p.note}”
                </T>
              </View>
            ) : null}
            <T size={11} color={gift.meta}>
              {p.birthday ? `birthday ${p.birthday} · ` : ''}prices checked when added
            </T>
            {sizeParts(p.sizes).length ? (
              <View
                accessibilityLabel={`${whose} sizes: ${sizeParts(p.sizes).join(', ')}`}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: gift.bandLine, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, maxWidth: 320, alignItems: 'center', gap: 6 }}
              >
                <T size={11} w={800} color={gift.meta} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {whose} sizes
                </T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                  {sizeParts(p.sizes).map((part) => (
                    <View key={part} style={{ backgroundColor: gift.thumb, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                      <T size={12} w={700} color={gift.body}>
                        {part}
                      </T>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {p.gifterName ? (
              <T size={11} w={600} color={gift.body}>
                Calling dibs as <T size={11} w={800} color={gift.body}>{p.gifterName}</T> ·{' '}
                <T
                  size={11}
                  w={700}
                  color={gift.accent}
                  onPress={() => {
                    setDraft(p.gifterName);
                    p.setGifterName('');
                  }}
                >
                  change
                </T>
              </T>
            ) : null}
          </Appear>
          <View style={{ paddingTop: 12, paddingHorizontal: 16, gap: 12 }}>
            {items.length === 0 ? (
              <T size={12.5} color={gift.meta} style={{ textAlign: 'center', paddingVertical: 12 }}>
                Nothing on this list yet.
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 }}>
              {items.map((i) => {
                const choosing = !!i.pending;
                const d = p.dibs[String(i.id)];
                const mine = !choosing && !!d?.mine;
                const other = !choosing && d && !d.mine ? d.name : null;
                const busy = p.busy === i.id;
                const btn = choosing
                  ? { label: 'Still choosing', bg: gift.band, fg: gift.meta, bd: 'transparent' }
                  : other
                    ? { label: `${other} has it`, bg: gift.band, fg: gift.meta, bd: 'transparent' }
                    : mine
                      ? { label: 'Dibs yours ✓', bg: gift.fill, fg: gift.accent, bd: gift.accent66 }
                      : null;
                const meta = choosing ? 'still choosing the exact one' : [i.store, i.size].filter(Boolean).join(' · ');
                return (
                  <View key={i.id} style={{ width: '47.5%', gap: 8, opacity: busy ? 0.6 : 1 }}>
                    <View style={{ aspectRatio: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: gift.thumb, alignItems: 'center', justifyContent: 'center' }}>
                      {i.image && !choosing ? (
                        <Image source={{ uri: i.image }} resizeMode="contain" style={{ width: '88%', height: '88%' }} accessibilityIgnoresInvertColors />
                      ) : (
                        <T size={12} color={gift.meta}>
                          {choosing ? 'still choosing' : 'photo'}
                        </T>
                      )}
                      {i.star ? (
                        <View style={{ position: 'absolute', top: 7, left: 7, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                          <T size={11} w={500} color={gift.text}>
                            ★ Really wants
                          </T>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ gap: 2, flex: 1 }}>
                      <T size={14} color={gift.text} numberOfLines={2} style={{ lineHeight: 19 }}>
                        {i.name}
                      </T>
                      {!choosing ? (
                        <T size={14} w={500} color={gift.text}>
                          {i.price}
                        </T>
                      ) : null}
                      {meta ? (
                        <T size={13} color={gift.meta} numberOfLines={1}>
                          {meta}
                        </T>
                      ) : null}
                      {i.note ? (
                        <T size={12} color={gift.body} numberOfLines={2} style={{ fontStyle: 'italic' }}>
                          “{i.note}”
                        </T>
                      ) : null}
                      <View style={{ flex: 1 }} />
                      <Tap
                        disabled={choosing || !!other || busy}
                        accessibilityLabel={btn?.label ?? `Call dibs on ${i.name}`}
                        onPress={() => {
                          if (!mine && !p.gifterName) {
                            setDraft('');
                            setAsking(i.id);
                            return;
                          }
                          p.onDibs(i.id, !mine);
                        }}
                        style={{ marginTop: 6 }}
                      >
                        {btn ? (
                          <View style={{ backgroundColor: btn.bg, paddingVertical: 10, borderRadius: 999, alignItems: 'center' }}>
                            <T size={13} w={500} color={btn.fg} numberOfLines={1}>
                              {btn.label}
                            </T>
                          </View>
                        ) : (
                          <LimeFill style={{ paddingVertical: 10, alignItems: 'center' }}>
                            <T size={13} w={500} color={brand.limeInk}>
                              Call dibs
                            </T>
                          </LimeFill>
                        )}
                      </Tap>
                      {mine ? (
                        <Tap onPress={() => (i.url ? Linking.openURL(i.url).catch(() => undefined) : showToast(`Find it at ${i.store}`))} style={{ alignItems: 'center', minHeight: 40, justifyContent: 'center' }}>
                          <T size={13} w={500} color={gift.accent} style={{ textDecorationLine: 'underline' }}>
                            Buy at {i.store} →
                          </T>
                        </Tap>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: gift.rowLine, paddingTop: 14 }}>
              <T size={12} color={gift.meta} style={{ textAlign: 'center', lineHeight: 18 }}>
                Dibs are a secret between gifters — {p.owner || 'the person whose list this is'} never sees what’s claimed. Buy it anywhere you like.
              </T>
            </View>
            {joinCta(p.owner ? `Want a list like ${p.owner}’s?` : 'Want a list like this?')}
          </View>
        </ScrollView>
      )}

      {asking != null ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Tap accessibilityLabel="Cancel" onPress={() => setAsking(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' }} />
          <SlideUp style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 22, paddingHorizontal: 24, paddingBottom: 36 + insets.bottom, gap: 14, boxShadow: '0 -20px 40px rgba(0,0,0,0.08)' }}>
              <T size={24} w={300} color={gift.text} style={{ letterSpacing: -0.6 }}>
                Who’s calling dibs?
              </T>
              <T size={13} color={gift.meta} style={{ lineHeight: 20 }}>
                Other gifters see your name so nobody doubles up. {p.owner || 'The wisher'} never does.
              </T>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Your name"
                placeholderTextColor={gift.meta}
                autoFocus
                onSubmitEditing={confirmName}
                style={{ backgroundColor: gift.band, borderWidth: 0, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, fontFamily: font[400], color: gift.text , ...noOutline }}
              />
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                {NAME_CHIPS.map((c) => (
                  <Tap key={c} onPress={() => setDraft(c)} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 }}>
                    <T size={13} color={gift.body} style={{ textDecorationLine: 'underline' }}>
                      {c}
                    </T>
                  </Tap>
                ))}
              </View>
              <Tap onPress={confirmName} disabled={!draft.trim()} style={{ opacity: draft.trim() ? 1 : 0.45 }}>
                <LimeFill style={{ paddingVertical: 15, alignItems: 'center' }}>
                  <T size={15} w={500} color={brand.limeInk}>
                    Call dibs on {items.find((i) => i.id === asking)?.name ?? ''}
                  </T>
                </LimeFill>
              </Tap>
            </View>
          </SlideUp>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Your own list, as gifters would see it. Dibs here are play-only and stay
 * on this device: the wisher never sees real ones.
 */
export function GifterPage({ listId, preview, expired }: { listId: string; preview?: boolean; expired?: boolean }) {
  const s = useApp((st) => st);
  const list = listById(s, listId);
  const items: PublicItem[] = s.items.filter((i) => i.list === list.id);
  const dibs: DibsView = {};
  for (const i of items) {
    if (s.gifterDibs[i.id]) dibs[String(i.id)] = { name: s.gifterName, mine: true };
  }
  return (
    <GifterView
      state={expired || list.vis === 'me' ? 'expired' : 'ready'}
      preview={preview}
      owner={s.profile.name}
      birthday={label(s.profile.birthday)}
      sizes={cleanSizes(s.profile.sizes)}
      listName={list.name}
      isMain={list.id === 'w'}
      note={list.note}
      items={items}
      dibs={dibs}
      gifterName={s.gifterName}
      setGifterName={s.setGifterName}
      onDibs={(id, claim) => {
        if (!!s.gifterDibs[id] !== claim) s.toggleGifterDibs(id);
      }}
    />
  );
}

/** Someone's page, from the server: real items and real, shared dibs. */
export function RemoteGifter({ handle, list, t }: { handle: string; list?: string; t?: string }) {
  const gifterId = useApp((s) => s.gifterId);
  const gifterName = useApp((s) => s.gifterName);
  const setGifterName = useApp((s) => s.setGifterName);
  const showToast = useApp((s) => s.showToast);
  const [page, setPage] = useState<Extract<Awaited<ReturnType<typeof readPage>>, { ok: true }> | null>(null);
  const [state, setState] = useState<ViewProps['state']>('loading');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await readPage(handle.toLowerCase(), { list, t, gifter: gifterId });
      if (r.ok) {
        setPage(r);
        setState('ready');
      } else setState(r.code === 'expired' ? 'expired' : 'error');
    } catch {
      setState('error');
    }
  }, [handle, list, t, gifterId]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    // Other gifters call dibs too; keep the page current while it's open.
    const id = setInterval(() => void load(), 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  const onDibs = async (itemId: number, claim: boolean) => {
    if (!page) return;
    setBusy(itemId);
    try {
      const r = await callDibs({ handle: handle.toLowerCase(), list: page.list.id, t, itemId, gifter: gifterId, name: useApp.getState().gifterName || 'A gifter', action: claim ? 'claim' : 'release' });
      if (r.dibs) setPage({ ...page, dibs: r.dibs });
      if (!r.ok) showToast(r.code === 'taken' ? 'Someone else just called dibs on that' : r.code === 'expired' ? 'This list link has expired' : 'Couldn’t save that — try again');
      else if (claim) showToast(`Dibs called — ${page.owner.name} will never know`);
    } catch {
      showToast('Couldn’t save that — check your connection');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <GifterView
        state={state}
        owner={page?.owner.name ?? ''}
        birthday={page?.owner.birthday ?? ''}
        sizes={page?.owner.sizes}
        listName={page?.list.name ?? ''}
        isMain={!!page?.list.isMain}
        note={page?.list.note}
        items={page?.list.items ?? []}
        dibs={page?.dibs ?? {}}
        gifterName={gifterName}
        setGifterName={setGifterName}
        onDibs={(id, claim) => void onDibs(id, claim)}
        busy={busy}
        onRetry={() => {
          setState('loading');
          void load();
        }}
      />
      <Toast />
    </View>
  );
}

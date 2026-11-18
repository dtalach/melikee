import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { Vis } from '@/store/types';
import { brand, palette } from '@/theme/tokens';
import { LinkIcon, Lock, People } from '@/ui/icons';
import { GiftWrap, Sprinkles } from '@/ui/gift';
import { PhotoBox, T, Tap, TextLink } from '@/ui/primitives';

export function VisIcon({ vis, size = 11, color = palette.soft }: { vis: Vis; size?: number; color?: string }) {
  if (vis === 'me') return <Lock size={size} color={color} />;
  if (vis === 'friends') return <People size={size} color={color} />;
  return <LinkIcon size={size} color={color} />;
}


/** Mono empty state: a light line, a muted sentence and one text link. No glow. */
export function EmptyGlow({ title, body, cta, onCta, children, fill, footer }: { title: string; body?: string; cta: string; onCta: () => void; icon: 'eye' | 'people'; children?: ReactNode; fill?: boolean; footer?: string }) {
  return (
    <View style={[{ alignItems: 'flex-start', gap: 10, paddingHorizontal: 4, paddingTop: 40, paddingBottom: 30, marginBottom: 14 }, fill && { flex: 1, justifyContent: 'center', paddingBottom: 100 }]}>
      <T size={24} w={300} style={{ letterSpacing: -0.6 }}>
        {title}
      </T>
      {body ? (
        <T size={14} color={palette.muted} style={{ maxWidth: 300, lineHeight: 21 }}>
          {body}
        </T>
      ) : null}
      {children}
      <TextLink label={cta} onPress={onCta} size={14} />
      {footer ? (
        <T size={12} color={palette.muted}>
          {footer}
        </T>
      ) : null}
    </View>
  );
}

/** One photo on a board cover: the store's, else the user's own shot. */
export type CoverShot = { uri?: string; fallback?: string };

/** The shinies a cover shows: starred first, then newest, only ones with a photo. */
export function coverShots(items: { image?: string; photo?: string; star?: boolean; createdAt?: number; at?: number }[]): CoverShot[] {
  return [...items]
    .sort((a, b) => Number(!!b.star) - Number(!!a.star) || (b.createdAt ?? b.at ?? 0) - (a.createdAt ?? a.at ?? 0))
    .filter((i) => i.image || i.photo)
    .slice(0, 3)
    .map((i) => ({ uri: i.image, fallback: i.photo }));
}

/** A small board: cover, name, one line under it. For grids and strips. */
/** The Christmas list: the id the app gives it, or any list dated Dec 25. */
export function isXmasList(l: { id: string; date?: { month: string; day: number } }) {
  return l.id === 'xmas' || (l.date?.month === 'Dec' && l.date.day === 25);
}

/** A board cover wrapped like a present: ribbon across, bow left of the share button. */
export function BoardWrap() {
  return <GiftWrap right={62} top={40} band={9} bow={54} />;
}

/** The decoration an occasion's board wears: Christmas is wrapped, a birthday gets sprinkles. */
export type BoardDecor = 'xmas' | 'bday' | undefined;
export function boardDecor(l: { id: string; isBirthday?: boolean; date?: { month: string; day: number } }): BoardDecor {
  if (l.isBirthday) return 'bday';
  return isXmasList(l) ? 'xmas' : undefined;
}
export function BoardDecoration({ decor }: { decor: BoardDecor }) {
  if (decor === 'xmas') return <BoardWrap />;
  if (decor === 'bday') return <Sprinkles />;
  return null;
}

export function MiniBoard({ shots, accent, name, sub, onPress, selected, width, label, decor }: { shots: CoverShot[]; accent: string; name: string; sub: string; onPress: () => void; selected?: boolean; width: number | `${number}%`; label?: string; decor?: BoardDecor }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label ?? `${name}, ${sub}`} accessibilityState={selected != null ? { selected } : undefined} style={{ width, gap: 6 }}>
      <View style={{ borderRadius: 8, borderWidth: 1.5, borderColor: selected ? palette.text : 'transparent', padding: 1 }}>
        <BoardCover shots={shots} accent={accent} initial={name[0] ?? ''} initialInk={accent === brand.lime ? brand.limeInk : brand.white}>
          <BoardDecoration decor={decor} />
        </BoardCover>
      </View>
      <View style={{ paddingHorizontal: 2 }}>
        <T size={13.5} numberOfLines={1}>
          {name}
        </T>
        <T size={12} color={palette.muted} numberOfLines={2}>
          {sub}
        </T>
      </View>
    </Tap>
  );
}

/**
 * A board cover, like a Pinterest board: one big photo on the left and two
 * stacked on the right, from the list's shinies. Empty spots take the list's
 * color, faded; an empty list shows its initial on the color.
 */
export function BoardCover({ shots, accent, initial, initialInk, children, gapColor = palette.bg }: { shots: CoverShot[]; accent: string; initial: string; initialInk: string; children?: ReactNode; gapColor?: string }) {
  const tile = (i: number, style: object) => {
    const s = shots[i];
    if (s) return <PhotoBox key={i} uri={s.uri} fallback={s.fallback} label="" fit="contain" style={style} />;
    // Mono: empty spots are a quiet grey, not the list's colour.
    return <View key={i} style={[style, { backgroundColor: i === 0 && !shots.length ? palette.inset : palette.ph1 }]} />;
  };
  void accent;
  void initialInk;
  return (
    <View style={{ aspectRatio: 1.35, borderRadius: 6, overflow: 'hidden', flexDirection: 'row', gap: 2, backgroundColor: gapColor }}>
      {tile(0, { flex: 2 })}
      <View style={{ flex: 1, gap: 2 }}>
        {tile(1, { flex: 1 })}
        {tile(2, { flex: 1 })}
      </View>
      {shots.length === 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 12, bottom: 6 }}>
          <T size={40} w={300} color={palette.muted} style={{ letterSpacing: -1 }}>
            {initial}
          </T>
        </View>
      ) : null}
      {children}
    </View>
  );
}

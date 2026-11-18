import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { Vis } from '@/store/types';
import { brand, palette } from '@/theme/tokens';
import { LinkIcon, Lock, People } from '@/ui/icons';
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
export function MiniBoard({ shots, accent, name, sub, onPress, selected, width, label }: { shots: CoverShot[]; accent: string; name: string; sub: string; onPress: () => void; selected?: boolean; width: number | `${number}%`; label?: string }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label ?? `${name}, ${sub}`} accessibilityState={selected != null ? { selected } : undefined} style={{ width, gap: 6 }}>
      <View style={{ borderRadius: 18, borderWidth: 2, borderColor: selected ? brand.lime : 'transparent' }}>
        <BoardCover shots={shots} accent={accent} initial={name[0] ?? ''} initialInk={accent === brand.lime ? brand.limeInk : brand.white} />
      </View>
      <View style={{ paddingHorizontal: 2 }}>
        <T size={13.5} w={800} numberOfLines={1}>
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
    return <View key={i} style={[style, { backgroundColor: accent, opacity: shots.length ? 0.28 : i === 0 ? 1 : 0.55 }]} />;
  };
  return (
    <View style={{ aspectRatio: 1.35, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', gap: 2, backgroundColor: gapColor }}>
      {tile(0, { flex: 2 })}
      <View style={{ flex: 1, gap: 2 }}>
        {tile(1, { flex: 1 })}
        {tile(2, { flex: 1 })}
      </View>
      {shots.length === 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 12, bottom: 8 }}>
          <T size={34} w={800} color={initialInk} style={{ letterSpacing: -1 }}>
            {initial}
          </T>
        </View>
      ) : null}
      {children}
    </View>
  );
}

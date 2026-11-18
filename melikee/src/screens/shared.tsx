import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { Vis } from '@/store/types';
import { brand, palette } from '@/theme/tokens';
import { Eye, LinkIcon, Lock, People, Sparkle } from '@/ui/icons';
import { Breathe, Twinkle } from '@/ui/motion';
import { LimeFill, PhotoBox, RadialGround, T, Tap } from '@/ui/primitives';

export function VisIcon({ vis, size = 11, color = palette.soft }: { vis: Vis; size?: number; color?: string }) {
  if (vis === 'me') return <Lock size={size} color={color} />;
  if (vis === 'friends') return <People size={size} color={color} />;
  return <LinkIcon size={size} color={color} />;
}

/** The sparkly null state: a breathing ring, a headline, a lime CTA. */
export function EmptyGlow({ title, body, cta, onCta, icon, children, fill, footer }: { title: string; body?: string; cta: string; onCta: () => void; icon: 'eye' | 'people'; children?: ReactNode; fill?: boolean; footer?: string }) {
  const big = icon === 'people';
  return (
    <View style={[{ alignItems: 'center', gap: big ? 16 : 14, paddingHorizontal: 34, paddingTop: 34, paddingBottom: 30, overflow: 'hidden', marginBottom: 14 }, fill && { flex: 1, justifyContent: 'center', paddingBottom: 100 }]}>
      <RadialGround inner={palette.rad1} outer={palette.bg} cy={fill ? '12%' : '0%'} rx="80%" ry={fill ? '80%' : '100%'} />
      <Twinkle period={2200} style={{ position: 'absolute', top: fill ? 36 : 22, left: 44 }}>
        <Sparkle size={13} color={brand.lime} />
      </Twinkle>
      <Twinkle period={2800} delay={600} style={{ position: 'absolute', top: fill ? 82 : 52, right: 50 }}>
        <Sparkle size={10} color={brand.pink} />
      </Twinkle>
      <Twinkle period={3100} delay={1200} style={{ position: 'absolute', bottom: fill ? 150 : 30, left: 64 }}>
        <Sparkle size={9} color={palette.vio} />
      </Twinkle>
      <Breathe>
        <View style={{ width: big ? 78 : 64, height: big ? 78 : 64, borderRadius: 40, borderWidth: 1, borderColor: palette.vio, backgroundColor: palette.vioFill, alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${big ? 38 : 32}px ${palette.glow40}` }}>
          {icon === 'eye' ? <Eye color={palette.vio} /> : <People size={30} strokeWidth={1.3} color={palette.vio} />}
        </View>
      </Breathe>
      <T size={big ? 22 : 20} w={800} style={{ textAlign: 'center', letterSpacing: -0.4, textShadowColor: palette.glow50, textShadowRadius: 24, textShadowOffset: { width: 0, height: 4 } }}>
        {title}
      </T>
      {body ? (
        <T size={12} color={palette.muted} style={{ textAlign: 'center', maxWidth: 250, lineHeight: 18 }}>
          {body}
        </T>
      ) : null}
      {children}
      <Tap onPress={onCta}>
        <LimeFill style={{ paddingVertical: big ? 12 : 11, paddingHorizontal: big ? 24 : 22, boxShadow: '0 6px 18px rgba(200,245,66,0.35)' }}>
          <T size={13} w={800} color={brand.limeInk}>
            {cta}
          </T>
        </LimeFill>
      </Tap>
      {footer ? (
        <T size={11} color={palette.muted}>
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
        <T size={11} color={palette.muted} numberOfLines={1}>
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
export function BoardCover({ shots, accent, initial, initialInk, children }: { shots: CoverShot[]; accent: string; initial: string; initialInk: string; children?: ReactNode }) {
  const tile = (i: number, style: object) => {
    const s = shots[i];
    if (s) return <PhotoBox key={i} uri={s.uri} fallback={s.fallback} label="" fit="contain" style={style} />;
    return <View key={i} style={[style, { backgroundColor: accent, opacity: shots.length ? 0.28 : i === 0 ? 1 : 0.55 }]} />;
  };
  return (
    <View style={{ aspectRatio: 1.35, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', gap: 2, backgroundColor: palette.bg }}>
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

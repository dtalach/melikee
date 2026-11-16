import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { Vis } from '@/store/types';
import { brand, palette } from '@/theme/tokens';
import { Eye, LinkIcon, Lock, People, Sparkle } from '@/ui/icons';
import { Breathe, Twinkle } from '@/ui/motion';
import { LimeFill, RadialGround, T, Tap } from '@/ui/primitives';

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

/** The 2×2 cover on a list row: thumbnails, or the list's color when empty. */
export function ListCover({ accent, count, initial, initialInk }: { accent: string; count: number; initial: string; initialInk: string }) {
  const cells = [0, 1, 2, 3];
  return (
    <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', backgroundColor: accent, borderWidth: 2, borderColor: accent, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
      {cells.map((x) => (
        <View key={x} style={{ width: 23, height: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: count === 0 ? accent : x < count ? palette.ph2 : palette.inset }}>
          {count === 0 && x === 0 ? (
            <T size={11} w={800} color={initialInk}>
              {initial}
            </T>
          ) : null}
        </View>
      ))}
    </View>
  );
}

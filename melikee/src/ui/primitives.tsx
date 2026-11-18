/**
 * Building blocks shared by every screen. Sizes and colors come straight from
 * the prototype's inline styles; tap targets are padded to 44pt the way the
 * prototype's `::before` hit areas were.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { brand, font, palette, paper, type Weight } from '@/theme/tokens';
import { Chevron } from './icons';
import { SlideUp } from './motion';

// ——— text ———

export function T({
  size = 13,
  w = 500,
  color = palette.text,
  style,
  ...rest
}: TextProps & { size?: number; w?: Weight; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text {...rest} style={[{ fontFamily: font[monoWeight(w, size)], fontSize: typeSize(size), color }, style]} />;
}

/**
 * Mono uses three weights: 300, 400 and 500. Heavier asks become 500, and
 * big ones (titles, prices) become light 300, which is how Mono draws display
 * type.
 */
function monoWeight(w: Weight, size: number): Weight {
  if (w < 600) return w;
  return size >= 20 ? 300 : 500;
}

/**
 * One type scale: 12 · 13 · 14 · 15 · 17 · 18, then display sizes as given.
 * Anything smaller than 12 reads as 12 (except tiny badge text under 10), and
 * in-between sizes (12.5, 13.5…) round up, so screens can't drift into a
 * dozen near-identical sizes again.
 */
function typeSize(size: number) {
  if (size < 10) return size;
  if (size <= 12) return 12;
  if (size <= 13) return 13;
  if (size <= 14) return 14;
  if (size <= 15) return 15;
  if (size <= 17) return 17;
  return size;
}

/** "WHAT FRIENDS SEE": small caps, tracked out, muted. Section headers and row labels. */
export function SectionLabel({ children, style, color = palette.muted }: { children: ReactNode; style?: StyleProp<TextStyle>; color?: string }) {
  return (
    <T size={12} w={400} color={color} style={[{ letterSpacing: 1.6, textTransform: 'uppercase' }, style]}>
      {children}
    </T>
  );
}

/** Every secondary action: "Not it", "Share", "New list", "Remove". Underlined, never a box. */
export function TextLink({ label, onPress, color = palette.text, size = 13, style, disabled, accessibilityLabel }: { label: string; onPress?: () => void; color?: string; size?: number; style?: StyleProp<ViewStyle>; disabled?: boolean; accessibilityLabel?: string }) {
  return (
    <Tap onPress={onPress} disabled={disabled} accessibilityRole="link" accessibilityLabel={accessibilityLabel ?? label} style={[{ minHeight: 44, justifyContent: 'center', opacity: disabled ? 0.45 : 1 }, style]}>
      <T size={size} w={500} color={color} style={{ textDecorationLine: 'underline' }}>
        {label}
      </T>
    </Tap>
  );
}

// ——— press ———

/** Extra touch area around every tappable thing, so small links are easy to hit. */
const HIT = { top: 12, bottom: 12, left: 8, right: 8 };

export function Tap({ style, children, hitSlop = HIT, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <Pressable
      hitSlop={hitSlop}
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [style, pressed && { opacity: 0.75 }]}
    >
      {children}
    </Pressable>
  );
}

/** The fill of the one primary action on a screen: solid ink, white text. */
export function LimeFill({ style, children, radius = 999 }: { style?: StyleProp<ViewStyle>; children?: ReactNode; radius?: number }) {
  return <View style={[{ borderRadius: radius, backgroundColor: palette.text }, style]}>{children}</View>;
}

type BtnProps = {
  label: string;
  onPress?: () => void;
  size?: number;
  pad?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
  accessibilityLabel?: string;
};

export function LimeButton({ label, onPress, size = 14, pad = 13, disabled, style, flex }: BtnProps) {
  return (
    <Tap onPress={disabled ? undefined : onPress} disabled={disabled} style={[flex && { flex: 1 }, { opacity: disabled ? 0.45 : 1 }, style]}>
      <LimeFill style={{ paddingVertical: Math.max(pad, 15), paddingHorizontal: 18, alignItems: 'center' }}>
        <T size={Math.max(size, 15)} w={500} color={brand.limeInk}>
          {label}
        </T>
      </LimeFill>
    </Tap>
  );
}

/** Secondary actions are text links in Mono: "Type it instead", "Paste a link". */
export function AccentButton({ label, onPress, size = 13.5, style, flex, color = palette.text }: BtnProps & { color?: string; width?: number }) {
  return (
    <Tap onPress={onPress} accessibilityRole="link" style={[flex && { flex: 1 }, { minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }, style]}>
      <T size={Math.min(size, 14)} w={500} color={color} style={{ textDecorationLine: 'underline' }}>
        {label}
      </T>
    </Tap>
  );
}

/** Quiet actions: "Not it", "Edit profile", "Share" — an underlined link. */
export function GhostButton({ label, onPress, size = 13.5, style, flex, color = palette.text }: BtnProps & { w?: Weight; border?: string; color?: string }) {
  return (
    <Tap onPress={onPress} accessibilityRole="link" style={[flex && { flex: 1 }, { minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }, style]}>
      <T size={Math.min(size, 14)} w={500} color={color} style={{ textDecorationLine: 'underline' }}>
        {label}
      </T>
    </Tap>
  );
}

/** "Try again", "Cancel", "Undo" — a muted link. */
export function ChipButton({ label, onPress, size = 13.5, style, flex }: BtnProps) {
  return (
    <Tap onPress={onPress} accessibilityRole="link" style={[flex && { flex: 1 }, { minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }, style]}>
      <T size={Math.min(size, 14)} w={500} color={palette.soft} style={{ textDecorationLine: 'underline' }}>
        {label}
      </T>
    </Tap>
  );
}

/** "New list", "Find", "Accept", "Add" — a text link in Mono (the screen's one black button is LimeButton). */
export function LimePill({ label, onPress, size = 12.5, style }: { label: string; onPress?: () => void; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Tap onPress={onPress} accessibilityRole="link" style={[{ minHeight: 44, paddingHorizontal: 6, justifyContent: 'center' }, style]}>
      <T size={Math.max(size, 13)} w={500} color={palette.text} style={{ textDecorationLine: 'underline' }}>
        {label.replace(/^\+\s*/, '')}
      </T>
    </Tap>
  );
}

/** Segmented option pill: sort, link expiry, new-list visibility. */
export function OptionPill({ label, on, onPress, size = 11.5 }: { label: string; on: boolean; onPress: () => void; size?: number }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityState={{ selected: on }}
      style={{
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: 2,
        borderBottomWidth: 1,
        borderBottomColor: on ? palette.text : 'transparent',
      }}
    >
      <T size={size} w={400} color={on ? palette.text : palette.muted} style={{ letterSpacing: 1.4, textTransform: 'uppercase' }}>
        {label}
      </T>
    </Tap>
  );
}

/** Lime-when-on access chip: which lists a friend can see. */
export function AccessChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityState={{ selected: on }}
      style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: palette.vio55, backgroundColor: on ? brand.lime : palette.chip }}
    >
      <T size={11.5} w={700} color={on ? brand.limeInk : palette.soft}>
        {label}
      </T>
    </Tap>
  );
}

// ——— toggles ———

export function Toggle({ on }: { on: boolean }) {
  return (
    <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: on ? palette.text : palette.deep }}>
      <View style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: 10, backgroundColor: palette.bg, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </View>
  );
}

export function ToggleRow({ title, sub, on, onPress, style }: { title: string; sub?: string; on: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Tap onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.vio33 }, style]}>
      <View style={{ flex: 1 }}>
        <T size={14} w={400}>
          {title}
        </T>
        {sub ? (
          <T size={11} color={palette.muted}>
            {sub}
          </T>
        ) : null}
      </View>
      <Toggle on={on} />
    </Tap>
  );
}

export function Radio({ on }: { on: boolean }) {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: on ? palette.vio : palette.vio55, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? palette.vio : 'transparent' }} />
    </View>
  );
}

// ——— surfaces ———

/** A group of content: no box in Mono, just a hairline above it. */
export function Card({ children, style, border = palette.vio33, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; border?: string; onPress?: () => void }) {
  const s = [style, { backgroundColor: 'transparent', borderWidth: 0, borderTopWidth: 1, borderTopColor: border === palette.vio33 || border === palette.lime66 ? palette.vio33 : border, borderRadius: 0, paddingHorizontal: 0 }];
  if (onPress) {
    return (
      <Tap onPress={onPress} style={s}>
        {children}
      </Tap>
    );
  }
  return <View style={s}>{children}</View>;
}

/** Card row with a chevron — Settings and Me. */
export function NavRow({ title, sub, onPress, left, border = palette.vio33, right }: { title: ReactNode; sub?: string; onPress: () => void; left?: ReactNode; border?: string; right?: ReactNode }) {
  return (
    <Card onPress={onPress} border={border} style={{ minHeight: 52, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {left}
      <View style={{ flex: 1 }}>
        {typeof title === 'string' ? (
          <T size={15} w={400}>
            {title}
          </T>
        ) : (
          title
        )}
        {sub ? (
          <T size={11} color={palette.muted} style={{ marginTop: 2 }}>
            {sub}
          </T>
        ) : null}
      </View>
      {right ?? <Chevron dir="right" size={14} color={palette.muted} />}
    </Card>
  );
}

/**
 * A product photo: the store's picture when there's a `uri`, else (or if it
 * won't load) the user's own shot in `fallback`, else the theme's placeholder
 * gradient (sample data, or nothing to show yet).
 */
export function PhotoBox({
  style,
  label = 'photo',
  labelSize = 11,
  children,
  vertical,
  uri,
  fallback,
  fit = 'contain',
  light,
}: {
  style?: StyleProp<ViewStyle>;
  label?: string;
  labelSize?: number;
  children?: ReactNode;
  vertical?: boolean;
  uri?: string | null;
  fallback?: string | null;
  fit?: 'contain' | 'cover';
  /** On a white page: a pale placeholder instead of the dark one. */
  light?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const ok = (u?: string | null): u is string => !!u && !failed.includes(u);
  const src = ok(uri) ? uri : ok(fallback) ? fallback : null;
  // Your own shot fills the frame; a store photo (usually product-on-white) sits on a white card.
  const mode = src && src === uri ? fit : 'cover';
  return (
    <LinearGradient
      colors={light ? [paper.photo, paper.photo] : [palette.ph1, palette.ph2]}
      start={{ x: 0, y: 0 }}
      end={vertical ? { x: 0, y: 1 } : { x: 1, y: 1 }}
      style={[{ alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}
    >
      {src ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: mode === 'contain' ? '#fff' : 'transparent' }]}>
          <Image key={src} source={{ uri: src }} onError={() => setFailed((f) => [...f, src])} resizeMode={mode} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
        </View>
      ) : null}
      {label && !src ? (
        <T size={labelSize} color={light ? paper.muted : palette.muted}>
          {label}
        </T>
      ) : null}
      {children}
    </LinearGradient>
  );
}

/** A radial glow ground, e.g. radial-gradient(120% 80% at 50% 12%, rad1, bg 75%). */
export function RadialGround({ inner, outer, cx = '50%', cy = '20%', rx = '75%', ry = '70%', style }: { inner: string; outer: string; cx?: string; cy?: string; rx?: string; ry?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="g" cx={cx} cy={cy} rx={rx} ry={ry} fx={cx} fy={cy} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={inner} />
            <Stop offset="1" stopColor={outer} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#g)" />
      </Svg>
    </View>
  );
}

export function Avatar({ initial, size = 36, ring, ringWidth = 2, fontSize, gap = palette.bg, fill = palette.chip, color = palette.avt, w = 800 }: { initial: string; size?: number; ring?: readonly string[] | string | null; ringWidth?: number; fontSize?: number; gap?: string; fill?: string; color?: string; w?: Weight }) {
  const inner = (
    <View style={{ flex: 1, borderRadius: size, backgroundColor: fill, borderWidth: ring ? 2 : 0, borderColor: gap, alignItems: 'center', justifyContent: 'center' }}>
      <T size={fontSize ?? Math.round(size * 0.36)} w={w} color={color}>
        {initial}
      </T>
    </View>
  );
  if (Array.isArray(ring)) {
    return (
      <LinearGradient colors={ring as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, padding: ringWidth }}>
        {inner}
      </LinearGradient>
    );
  }
  return <View style={{ width: size, height: size, borderRadius: size / 2, padding: ring ? ringWidth : 0, backgroundColor: (ring as string) || 'transparent' }}>{inner}</View>;
}

/** Pink day-count tag: "12d", "in 12 days". */
export function DaysTag({ label, radius = 6, size = 11, style }: { label: string; radius?: number; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: brand.pink, paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius }, style]}>
      <T size={size} w={500} color={palette.text}>
        {label}
      </T>
    </View>
  );
}

// ——— inputs ———

export function Field({ style, ...rest }: TextInputProps & { style?: StyleProp<TextStyle> }) {
  return (
    <TextInput
      placeholderTextColor={palette.muted}
      {...rest}
      style={[
        {
          backgroundColor: palette.inset,
          borderWidth: 0,
          borderRadius: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          fontSize: 14,
          fontFamily: font[400],
          color: palette.text,
        },
        style,
      ]}
    />
  );
}

/**
 * A dropdown that works the same on iOS, Android and web: a field that opens
 * a short scrolling list beneath itself.
 */
export function Select<V extends string>({ value, options, onChange, style, size = 13, pad = 10, accessibilityLabel }: { value: V; options: readonly V[]; onChange: (v: V) => void; style?: StyleProp<ViewStyle>; size?: number; pad?: number; accessibilityLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={style}>
      <Tap
        onPress={() => setOpen((o) => !o)}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        style={{ backgroundColor: palette.inset, borderWidth: 1, borderColor: open ? palette.text : 'transparent', borderRadius: 10, paddingVertical: Math.max(pad, 12), paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}
      >
        <T size={size} w={600} style={{ flex: 1 }}>
          {value}
        </T>
        <Chevron dir={open ? 'up' : 'down'} size={12} color={palette.muted} strokeWidth={2} />
      </Tap>
      {open ? (
        <ScrollView style={{ maxHeight: 176, marginTop: 4, backgroundColor: palette.chip, borderRadius: 12, borderWidth: 1, borderColor: palette.vio33 }} nestedScrollEnabled>
          {options.map((o) => (
            <Tap
              key={o}
              onPress={() => {
                onChange(o);
                setOpen(false);
              }}
              accessibilityState={{ selected: o === value }}
              style={{ paddingVertical: 9, paddingHorizontal: 12, backgroundColor: o === value ? palette.vio22 : 'transparent' }}
            >
              <T size={size} w={o === value ? 700 : 500}>
                {o}
              </T>
            </Tap>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

// ——— layout ———

/** Back chevron + title row used on pushed screens. */
export function BackHeader({ title, onBack, right, sub }: { title: string; onBack: () => void; right?: ReactNode; sub?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
      <Tap onPress={onBack} accessibilityLabel="Back" style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
        <Chevron color={palette.text} strokeWidth={1.3} />
      </Tap>
      <View style={{ flex: 1, minWidth: 0, gap: 5, alignItems: 'flex-start' }}>
        <T size={28} w={300} style={{ letterSpacing: -0.8 }}>
          {title}
        </T>
        {sub}
      </View>
      {right}
    </View>
  );
}

/** The scrim + rounded panel every bottom sheet sits in. */
export function SheetFrame({ children, onClose, gap = 12, border = palette.vio44, bottom = 34 }: { children: ReactNode; onClose: () => void; gap?: number; border?: string; bottom?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9 }]}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]} />
      <SlideUp style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <View
          style={{
            backgroundColor: palette.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingHorizontal: 24,
            paddingBottom: bottom,
            gap: Math.max(gap, 14),
            boxShadow: '0 -1px 0 rgba(0,0,0,0.07), 0 -20px 40px rgba(0,0,0,0.06)',
            maxHeight: '92%',
          }}
        >
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.vio55, alignSelf: 'center' }} />
          {children}
        </View>
      </SlideUp>
    </View>
  );
}

export function SheetTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View>
      <T size={24} w={300} style={{ letterSpacing: -0.6 }}>
        {children}
      </T>
      {sub ? (
        <T size={13} color={palette.muted} style={{ marginTop: 6, lineHeight: 20 }}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

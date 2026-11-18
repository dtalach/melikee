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

import { brand, font, palette, type Weight } from '@/theme/tokens';
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
  return <Text {...rest} style={[{ fontFamily: font[w], fontSize: typeSize(size), color }, style]} />;
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

/** "WHAT FRIENDS SEE" — the small tracked-out caps label above a group. */
export function SectionLabel({ children, style, color = palette.muted }: { children: ReactNode; style?: StyleProp<TextStyle>; color?: string }) {
  return (
    <T size={11} w={700} color={color} style={[{ letterSpacing: 0.66 }, style]}>
      {children}
    </T>
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

/** The lime gradient fill used on every primary action. */
export function LimeFill({ style, children, radius = 999 }: { style?: StyleProp<ViewStyle>; children?: ReactNode; radius?: number }) {
  return (
    <LinearGradient colors={[brand.limeTop, brand.lime]} style={[{ borderRadius: radius }, style]}>
      {children}
    </LinearGradient>
  );
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
      <LimeFill style={{ paddingVertical: pad, paddingHorizontal: 16, alignItems: 'center' }}>
        <T size={size} w={800} color={brand.limeInk}>
          {label}
        </T>
      </LimeFill>
    </Tap>
  );
}

/** Outlined in the accent: "Type it instead", "Paste a link". */
export function AccentButton({ label, onPress, size = 13.5, pad = 12, style, flex, color = palette.vio, width = 1.5 }: BtnProps & { color?: string; width?: number }) {
  return (
    <Tap onPress={onPress} style={[flex && { flex: 1 }, { paddingVertical: pad, paddingHorizontal: 16, borderRadius: 999, borderWidth: width, borderColor: color, alignItems: 'center' }, style]}>
      <T size={size} w={800} color={color}>
        {label}
      </T>
    </Tap>
  );
}

/** Quiet, outlined: "Not it", "Edit profile", "Share". */
export function GhostButton({ label, onPress, size = 13.5, pad = 12, style, flex, w = 700, border = palette.vio55, color = palette.text }: BtnProps & { w?: Weight; border?: string; color?: string }) {
  return (
    <Tap onPress={onPress} style={[flex && { flex: 1 }, { paddingVertical: pad, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: border, alignItems: 'center' }, style]}>
      <T size={size} w={w} color={color}>
        {label}
      </T>
    </Tap>
  );
}

/** Filled chip-grey: "Try again", "Cancel", "Undo". */
export function ChipButton({ label, onPress, size = 13.5, pad = 12, style, flex }: BtnProps) {
  return (
    <Tap onPress={onPress} style={[flex && { flex: 1 }, { paddingVertical: pad, paddingHorizontal: 16, borderRadius: 999, backgroundColor: palette.chip, alignItems: 'center' }, style]}>
      <T size={size} w={700}>
        {label}
      </T>
    </Tap>
  );
}

/** Small solid lime pill: "+ New list", "+ Invite", "Accept", "Add". */
export function LimePill({ label, onPress, size = 12.5, style }: { label: string; onPress?: () => void; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Tap onPress={onPress} style={[{ backgroundColor: brand.lime, paddingVertical: 7, paddingHorizontal: 15, borderRadius: 999 }, style]}>
      <T size={size} w={800} color={brand.limeInk}>
        {label}
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
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: on ? palette.vio : palette.vio33,
        backgroundColor: on ? palette.vio22 : 'transparent',
      }}
    >
      <T size={size} w={700} color={on ? palette.text : palette.muted}>
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
    <View style={{ width: 38, height: 22, borderRadius: 11, backgroundColor: on ? palette.vio : palette.chip }}>
      <View style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: 8, backgroundColor: on ? palette.bg : palette.text }} />
    </View>
  );
}

export function ToggleRow({ title, sub, on, onPress, style }: { title: string; sub?: string; on: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Tap onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <View style={{ flex: 1 }}>
        <T size={13} w={700}>
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

export function Card({ children, style, border = palette.vio33, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; border?: string; onPress?: () => void }) {
  const s = [{ backgroundColor: palette.card, borderWidth: 1, borderColor: border, borderRadius: 16 }, style];
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
    <Card onPress={onPress} border={border} style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {left}
      <View style={{ flex: 1 }}>
        {typeof title === 'string' ? (
          <T size={13} w={700}>
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
}: {
  style?: StyleProp<ViewStyle>;
  label?: string;
  labelSize?: number;
  children?: ReactNode;
  vertical?: boolean;
  uri?: string | null;
  fallback?: string | null;
  fit?: 'contain' | 'cover';
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const ok = (u?: string | null): u is string => !!u && !failed.includes(u);
  const src = ok(uri) ? uri : ok(fallback) ? fallback : null;
  // Your own shot fills the frame; a store photo (usually product-on-white) sits on a white card.
  const mode = src && src === uri ? fit : 'cover';
  return (
    <LinearGradient
      colors={[palette.ph1, palette.ph2]}
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
        <T size={labelSize} color={palette.muted}>
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
      <T size={size} w={800} color={brand.white}>
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
          borderWidth: 1,
          borderColor: palette.vio44,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 12,
          fontSize: 13,
          fontFamily: font[500],
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
        style={{ backgroundColor: palette.inset, borderWidth: 1, borderColor: open ? palette.vio : palette.vio44, borderRadius: 12, paddingVertical: pad, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}
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
      <Tap onPress={onBack} accessibilityLabel="Back" style={{ width: 28, height: 32, justifyContent: 'center' }}>
        <Chevron color={palette.muted} />
      </Tap>
      <View style={{ flex: 1, minWidth: 0, gap: 5, alignItems: 'flex-start' }}>
        <T size={20} w={800}>
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
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: border,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 14,
            paddingHorizontal: 18,
            paddingBottom: bottom,
            gap,
            boxShadow: '0 -10px 34px rgba(0,0,0,0.6)',
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
      <T size={17} w={800}>
        {children}
      </T>
      {sub ? (
        <T size={12} color={palette.muted} style={{ marginTop: 3, lineHeight: 18 }}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

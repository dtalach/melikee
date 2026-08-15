/**
 * The shared building blocks every screen is assembled from. They encode the
 * turn-8 contrast treatment the user picked: cards sit two steps above the
 * ground with a 2px tinted border and a real shadow, so they read as objects
 * rather than tints.
 */
import { type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

// ── Text ───────────────────────────────────────────────────────────────────

type AppTextProps = TextProps & {
  /** Semantic colour role; falls back to the theme's primary text. */
  tone?: 'text' | 'muted' | 'soft' | 'lime' | 'violet' | 'pink' | 'ink';
  /** Adds the signature lilac glow used on hero headlines. */
  glow?: boolean;
};

export function AppText({ tone = 'text', glow, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const color =
    tone === 'muted'
      ? theme.muted
      : tone === 'soft'
        ? theme.soft
        : tone === 'lime'
          ? theme.limeText
          : tone === 'violet'
            ? theme.violet
            : tone === 'pink'
              ? brand.pink
              : tone === 'ink'
                ? brand.limeInk
                : theme.text;

  return (
    <Text
      style={[
        { color, fontWeight: '600' },
        glow && {
          textShadowColor: brand.violetGlow,
          textShadowOffset: { width: 0, height: 4 },
          textShadowRadius: 24,
        },
        style,
      ]}
      {...rest}
    />
  );
}

// ── Surfaces ───────────────────────────────────────────────────────────────

type CardProps = {
  children: ReactNode;
  /** Border colour — defaults to the standard lilac card edge. */
  border?: string;
  /** Passive cards are flattened: inset ground, hairline edge, no shadow. */
  variant?: 'raised' | 'flat';
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, border, variant = 'raised', style }: CardProps) {
  const theme = useTheme();
  const flat = variant === 'flat';
  return (
    <View
      style={[
        {
          backgroundColor: flat ? theme.inset : theme.card,
          borderWidth: flat ? 1.5 : 2,
          borderColor: border ?? (flat ? theme.violet22 : theme.violet66),
          borderRadius: layout.radius.card,
          overflow: 'hidden',
        },
        !flat && {
          boxShadow: `0 10px 28px ${theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(45,36,71,0.10)'}`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * The radial glow ground the app uses to stage its hero moments — the camera
 * screen, and both full-bleed null states.
 */
export function GlowGround({
  children,
  style,
  /** Vertical position of the glow's centre, as a fraction of the box. */
  center = 0.3,
  spread = { x: 0.6, y: 0.4 },
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  center?: number;
  spread?: { x: number; y: number };
}) {
  const theme = useTheme();
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient
            id="glow"
            cx="50%"
            cy={`${center * 100}%`}
            rx={`${spread.x * 100}%`}
            ry={`${spread.y * 100}%`}
          >
            <Stop offset="0" stopColor={theme.radial1} />
            <Stop offset="0.9" stopColor={theme.radial2} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
      </Svg>
      {children}
    </View>
  );
}

/** Placeholder standing in for product imagery, or the real captured photo. */
export function Photo({
  uri,
  label = 'photo',
  style,
  radius = 0,
}: {
  uri?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const theme = useTheme();
  if (uri) {
    // Layout styles are shared between the placeholder and the real image;
    // the overlap with ImageStyle is safe for everything callers pass here.
    return (
      <Image
        source={{ uri }}
        style={[{ borderRadius: radius }, style as StyleProp<ImageStyle>]}
        resizeMode="cover"
      />
    );
  }
  return (
    <LinearGradient
      colors={[theme.photo1, theme.photo2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ alignItems: 'center', justifyContent: 'center', borderRadius: radius }, style]}
    >
      <AppText tone="muted" style={{ fontSize: 9 }}>
        {label}
      </AppText>
    </LinearGradient>
  );
}

// ── Controls ───────────────────────────────────────────────────────────────

type ButtonProps = PressableProps & {
  label: string;
  /** lime = the primary squishy CTA; the rest are secondary treatments. */
  variant?: 'lime' | 'pink' | 'violet' | 'chip' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: ReactNode;
};

export function Button({
  label,
  variant = 'lime',
  size = 'md',
  style,
  textStyle,
  icon,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const pad =
    size === 'lg'
      ? { paddingVertical: 12, paddingHorizontal: 24, fontSize: 13 }
      : size === 'sm'
        ? { paddingVertical: 5, paddingHorizontal: 11, fontSize: 11 }
        : { paddingVertical: 7, paddingHorizontal: 14, fontSize: 12 };

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text
        style={[
          {
            fontSize: pad.fontSize,
            fontWeight: '800',
            color:
              variant === 'lime'
                ? brand.limeInk
                : variant === 'pink'
                  ? brand.pinkInk
                  : variant === 'violet'
                    ? theme.bg
                    : variant === 'chip'
                      ? theme.limeText
                      : theme.muted,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );

  const shared: ViewStyle = {
    paddingVertical: pad.paddingVertical,
    paddingHorizontal: pad.paddingHorizontal,
    borderRadius: layout.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (variant === 'lime') {
    return (
      <Squish style={style} {...rest}>
        <LinearGradient
          colors={[brand.limeLight, brand.lime]}
          style={[shared, { boxShadow: `0 6px 18px ${brand.limeGlow}` }]}
        >
          {body}
        </LinearGradient>
      </Squish>
    );
  }

  return (
    <Squish style={style} {...rest}>
      <View
        style={[
          shared,
          variant === 'pink' && { backgroundColor: brand.pink },
          variant === 'violet' && { backgroundColor: theme.violet },
          variant === 'chip' && {
            backgroundColor: theme.chip,
            borderWidth: 1.5,
            borderColor: theme.violet55,
          },
        ]}
      >
        {body}
      </View>
    </Squish>
  );
}

/**
 * Press feedback for the whole app: a small squish. The teen direction called
 * for "touchable" UI, and a uniform 0.96 press keeps it consistent without the
 * jelly overshoot that read as cartoonish.
 */
export function Squish({
  children,
  style,
  ...rest
}: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }, style]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

/** A rotated sticker label — the brand's way of shouting one short line. */
export function Sticker({
  children,
  tone = 'lime',
  rotate = -2,
  style,
}: {
  children: ReactNode;
  tone?: 'lime' | 'pink' | 'violet';
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg = tone === 'lime' ? brand.lime : tone === 'pink' ? brand.pink : theme.violet;
  const fg = tone === 'lime' ? brand.limeInk : tone === 'pink' ? brand.pinkInk : theme.bg;
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: 6,
          paddingHorizontal: 10,
          paddingVertical: 3,
          transform: [{ rotate: `${rotate}deg` }],
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 }}>
        {children}
      </Text>
    </View>
  );
}

/** A selectable chip — list access, move targets, request permissions. */
export function Chip({
  label,
  selected,
  onPress,
  trailing,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Squish onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          backgroundColor: selected ? brand.lime : theme.chip,
          borderWidth: 1.5,
          borderColor: theme.violet55,
          borderRadius: layout.radius.pill,
          paddingHorizontal: 12,
          paddingVertical: 5,
        }}
      >
        <Text
          style={{
            fontSize: 11.5,
            fontWeight: '800',
            color: selected ? brand.limeInk : theme.soft,
          }}
        >
          {label}
        </Text>
        {trailing}
      </View>
    </Squish>
  );
}

/** The make-it-secret switch. */
export function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      <View
        style={{
          width: 38,
          height: 22,
          borderRadius: 11,
          backgroundColor: value ? theme.violet : theme.chip,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: value ? 19 : 3,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: value ? theme.bg : '#7d6fae',
          }}
        />
      </View>
    </Pressable>
  );
}

/** Gradient-ringed avatar; the ring goes flat when there's no connection. */
export function Avatar({
  initial,
  size = 38,
  ring = 'gradient',
}: {
  initial: string;
  size?: number;
  ring?: 'gradient' | 'flat' | 'none';
}) {
  const theme = useTheme();
  const padding = size >= 60 ? 3 : 2;
  const inner = (
    <View
      style={{
        width: '100%',
        height: '100%',
        borderRadius: size / 2,
        backgroundColor: theme.chip,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.36, fontWeight: '800', color: theme.avatarText }}>
        {initial}
      </Text>
    </View>
  );

  if (ring === 'gradient') {
    return (
      <LinearGradient
        colors={[brand.pink, theme.violet]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, padding }}
      >
        {inner}
      </LinearGradient>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding,
        borderWidth: ring === 'flat' ? 2.5 : 0,
        borderColor: theme.deep,
        backgroundColor: ring === 'none' ? theme.deep : undefined,
      }}
    >
      {inner}
    </View>
  );
}

/** Section caption — "WHILE YOU WERE OUT". */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <AppText tone="muted" style={[{ fontSize: 11, fontWeight: '800', letterSpacing: 0.88 }, style]}>
      {children}
    </AppText>
  );
}

/** A stand-in for the user's QR code — real encoding is a backend concern. */
export function QrPlaceholder({ size = 54 }: { size?: number }) {
  const theme = useTheme();
  const cells = 5;
  const cell = (size - 6) / cells;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: theme.text,
        backgroundColor: theme.bg,
        overflow: 'hidden',
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}
    >
      {Array.from({ length: cells * cells }).map((_, i) => {
        const row = Math.floor(i / cells);
        const col = i % cells;
        return (
          <View
            key={i}
            style={{
              width: cell,
              height: cell,
              backgroundColor: (row + col) % 2 === 0 ? theme.text : theme.bg,
            }}
          />
        );
      })}
    </View>
  );
}

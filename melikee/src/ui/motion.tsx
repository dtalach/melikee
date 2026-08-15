/**
 * The app's motion vocabulary, ported from the turn-6 choreography card.
 *
 * The rules it set: transitions live in 200–350ms, overshoot is reserved for
 * rewards, motion always travels toward the shutter, and reduce-motion gets a
 * deliberately designed crossfade rather than a skipped animation.
 */
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';

import { SparkleIcon } from '@/ui/icons';
import { useAppStore } from '@/store/useAppStore';
import { motion } from '@/theme/tokens';

const linear: WithTimingConfig = { easing: Easing.linear };
const easeOut: WithTimingConfig = { easing: Easing.out(Easing.quad) };

export function useReduceMotion() {
  return useAppStore((s) => s.reduceMotion);
}

/**
 * A slowly pulsing sparkle. Used as ambient decoration on glow grounds — the
 * app's signal that "something magic happens here".
 */
export function Twinkle({
  size = 12,
  color = '#c8f542',
  duration = 2200,
  delay = 0,
  style,
}: {
  size?: number;
  color?: string;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) {
      t.value = 0.5;
      return;
    }
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [t, duration, delay, reduced]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.25 + t.value * 0.75,
    transform: [{ scale: 0.8 + t.value * 0.35 }],
  }));

  return (
    <Animated.View style={[style, animated]} pointerEvents="none">
      <SparkleIcon size={size} color={color} />
    </Animated.View>
  );
}

/** The gentle 3.2s scale pulse on null-state orbs and the dock shutter. */
export function Breathe({
  children,
  duration = 3200,
  style,
}: {
  children: ReactNode;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [t, duration, reduced]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.05 }] }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Continuous rotation — the "working our magic" arc and its orbiting sparkle. */
export function Spin({
  children,
  duration = 1000,
  style,
}: {
  children: ReactNode;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration, ...linear }), -1, false);
  }, [t, duration, reduced]);

  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** A sparkle orbiting a centre point at a fixed radius. */
export function Orbit({
  radius = 40,
  duration = 1600,
  children,
}: {
  radius?: number;
  duration?: number;
  children: ReactNode;
}) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration, ...linear }), -1, false);
  }, [t, duration, reduced]);

  const animated = useAnimatedStyle(() => {
    const angle = t.value * Math.PI * 2;
    return {
      transform: [{ translateX: Math.cos(angle) * radius }, { translateY: Math.sin(angle) * radius }],
    };
  });

  return <Animated.View style={[{ position: 'absolute' }, animated]}>{children}</Animated.View>;
}

/**
 * The sticker slap-in: drops in big and tilted, snaps down with a slight
 * overshoot, settles at its resting -2° tilt. One time, first run only.
 */
export function SlapIn({ children, delay = motion.slapDelay }: { children: ReactNode; delay?: number }) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) {
      t.value = withDelay(delay, withTiming(1, { duration: motion.transition }));
      return;
    }
    t.value = withDelay(
      delay,
      withSequence(
        withTiming(0.6, { duration: motion.slap * 0.6, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: motion.slap * 0.4, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  }, [t, delay, reduced]);

  const animated = useAnimatedStyle(() => {
    // 0 → big and tilted, 0.6 → slightly under, 1 → resting.
    const scale = t.value < 0.6 ? 1.6 - (t.value / 0.6) * 0.64 : 0.96 + ((t.value - 0.6) / 0.4) * 0.04;
    const rotate = t.value < 0.6 ? -9 + (t.value / 0.6) * 8 : -1 - ((t.value - 0.6) / 0.4);
    return {
      opacity: Math.min(1, t.value / 0.6),
      transform: [{ scale }, { rotate: `${rotate}deg` }],
    };
  });

  return <Animated.View style={animated}>{children}</Animated.View>;
}

/** Content entrance used by every screen — a 16px rise with a fade. */
export function RiseIn({
  children,
  style,
  delay = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: motion.transition, ...easeOut }));
  }, [t, delay]);

  const animated = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 16 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * The reward pop — the found card being dealt in. This is the one place
 * overshoot is allowed, and it's why the moment feels like a reveal.
 */
export function PopIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) {
      t.value = withTiming(1, { duration: motion.transition });
      return;
    }
    t.value = withSequence(
      withTiming(1.06, { duration: motion.pop * 0.6, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: motion.pop * 0.4, easing: Easing.inOut(Easing.quad) }),
    );
  }, [t, reduced]);

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value / 0.7),
    transform: [{ scale: 0.7 + t.value * 0.3 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * The claim: the card flies down into the shutter and shrinks away. Motion
 * always travels toward the dock, so wishes visibly collect into the button
 * you'll press next time.
 */
export function FlyToShutter({
  children,
  distance = 225,
  onDone,
  style,
}: {
  children: ReactNode;
  distance?: number;
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    const duration = reduced ? motion.transition : motion.fly;
    t.value = withTiming(1, { duration, easing: reduced ? Easing.linear : Easing.in(Easing.cubic) });
    const timer = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(timer);
  }, [t, reduced, onDone]);

  const animated = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1 - t.value };
    return {
      opacity: t.value > 0.7 ? 1 - (t.value - 0.7) / 0.3 : 1,
      transform: [{ translateY: t.value * distance }, { scale: 1 - t.value * 0.84 }],
    };
  });

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

const BURST = [
  { dx: -34, dy: -26, size: 13, color: '#c8f542', delay: 0 },
  { dx: 32, dy: -30, size: 11, color: '#ff5da2', delay: 30 },
  { dx: -20, dy: 24, size: 10, color: '#a78bfa', delay: 50 },
  { dx: 40, dy: 14, size: 9, color: '#c8f542', delay: 70 },
  { dx: -42, dy: 6, size: 9, color: '#ff5da2', delay: 10 },
];

/** Sparkles bursting outward where the wish lands. */
export function SparkleBurst({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduced = useReduceMotion();
  if (reduced) return null;
  return (
    <View style={[{ position: 'absolute' }, style]} pointerEvents="none">
      {BURST.map((s, i) => (
        <BurstSparkle key={i} {...s} />
      ))}
    </View>
  );
}

function BurstSparkle({
  dx,
  dy,
  size,
  color,
  delay,
}: {
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: motion.burst, ...easeOut }));
  }, [t, delay]);

  const animated = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [
      { translateX: dx * t.value },
      { translateY: dy * t.value },
      { scale: 0.3 + t.value * 0.7 },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute' as const, inset: 0 }, animated]}>
      <SparkleIcon size={size} color={color} />
    </Animated.View>
  );
}

/** A one-shot scale bump — the shinies counter reacting to a new arrival. */
export function Bump({ trigger, children }: { trigger: unknown; children: ReactNode }) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) return;
    t.value = withSequence(
      withTiming(1, { duration: 140, ...easeOut }),
      withTiming(0, { duration: 220, ...easeOut }),
    );
  }, [t, trigger, reduced]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.35 }] }));

  return <Animated.View style={animated}>{children}</Animated.View>;
}

/** The white flash on snap. */
export function SnapFlash({ onDone }: { onDone?: () => void }) {
  const t = useSharedValue(1);

  useEffect(() => {
    t.value = withTiming(0, { duration: motion.flash, ...easeOut });
    const timer = setTimeout(() => onDone?.(), motion.flash);
    return () => clearTimeout(timer);
  }, [t, onDone]);

  const animated = useAnimatedStyle(() => ({ opacity: t.value * 0.95 }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute' as const, inset: 0 }, { backgroundColor: '#fdfcff' }, animated]}
    />
  );
}

/** Bottom-sheet / filing-tray entrance: rises with a soft overshoot settle. */
export function SlideUp({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) {
      t.value = withTiming(1, { duration: motion.transition });
      return;
    }
    t.value = withSequence(
      withTiming(1.04, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 80, easing: Easing.inOut(Easing.quad) }),
    );
  }, [t, reduced]);

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 2),
    transform: [{ translateY: (1 - Math.min(t.value, 1)) * 40 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

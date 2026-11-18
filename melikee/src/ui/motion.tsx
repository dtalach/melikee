/**
 * The prototype's keyframes (mlk-up, mlk-twinkle, mlk-breathe, mlk-spin,
 * mlk-drain, mlk-slap, mlk-flash, mlk-burst), as small Animated wrappers.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const native = Platform.OS !== 'web';

function useValue(init: number) {
  return useState(() => new Animated.Value(init))[0];
}

/** mlk-up: fade in while rising 16px. Used on every screen and sheet body. */
export function Appear({ children, style, delay = 0, distance = 16, duration = 250 }: { children: ReactNode; style?: StyleProp<ViewStyle>; delay?: number; distance?: number; duration?: number }) {
  const v = useValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [v, delay, duration]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** A bottom sheet's entrance: a springy rise, cubic-bezier(.34,1.2,.64,1). */
export function SlideUp({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useValue(0);
  useEffect(() => {
    Animated.spring(v, { toValue: 1, useNativeDriver: native, damping: 18, stiffness: 220, mass: 0.9 }).start();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [360, 0] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function useLoop(make: (v: Animated.Value) => Animated.CompositeAnimation, init = 0) {
  const v = useValue(init);
  useEffect(() => {
    const a = Animated.loop(make(v));
    a.start();
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return v;
}

/** mlk-twinkle: opacity .25→1 and scale .8→1.15. */
export function Twinkle({ children, period = 2200, delay = 0, style }: { children: ReactNode; period?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop((x) =>
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(x, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(x, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]),
  );
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] });
  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** A loading pulse: opacity only, so it never grows into its neighbours. */
export function Pulse({ children, period = 1400, style }: { children: ReactNode; period?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop((x) =>
    Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(x, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]),
  );
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

/** mlk-breathe: a slow 1→1.05 swell. */
export function Breathe({ children, period = 3200, on = true, style }: { children: ReactNode; period?: number; on?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useValue(0);
  useEffect(() => {
    if (!on) {
      v.setValue(0);
      return;
    }
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [v, on, period]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

export function Spin({ children, period = 1200 }: { children: ReactNode; period?: number }) {
  const v = useLoop((x) => Animated.timing(x, { toValue: 1, duration: period, easing: Easing.linear, useNativeDriver: native }));
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

/** mlk-drain: a bar that empties over `seconds`. */
export function Drain({ seconds, color, height = 2, style }: { seconds: number; color: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const v = useValue(1);
  useEffect(() => {
    Animated.timing(v, { toValue: 0, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: false }).start();
  }, [v, seconds]);
  const width = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <Animated.View style={[{ height, backgroundColor: color, width }, style]} />;
}

/** mlk-slap: a sticker landing — big and tilted, then settling at -2°. */
export function Slap({ children, delay = 400, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useValue(0);
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay, useNativeDriver: native, damping: 11, stiffness: 180 }).start();
  }, [v, delay]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['-9deg', '-2deg'] });
  const opacity = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  return <Animated.View style={[style, { opacity, transform: [{ scale }, { rotate }] }]}>{children}</Animated.View>;
}

/** mlk-flash: the white shutter flash. */
export function Flash() {
  const v = useValue(0.95);
  useEffect(() => {
    Animated.timing(v, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [v]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fdfcff', opacity: v }} />;
}

/** mlk-shim: a lime band sweeping up and down over the shot while matching. */
export function Shimmer({ height, children }: { height: number; children: ReactNode }) {
  const v = useValue(0);
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-45, height - 45] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 90, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/** mlk-burst: one sparkle flying outward from the shutter and fading. */
export function Burst({ dx, dy, delay, children }: { dx: number; dy: number; delay: number; children: ReactNode }) {
  const v = useValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** mlk-sheetout: the found card dropping away into the dock on "Want it". */
export function SheetOut({ children, active, style }: { children: ReactNode; active: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useValue(0);
  useEffect(() => {
    if (active) Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.bezier(0.5, 0, 0.75, 0), useNativeDriver: native }).start();
  }, [v, active]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, 600] });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

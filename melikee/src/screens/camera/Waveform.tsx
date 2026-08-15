import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { brand } from '@/theme/tokens';
import { useReduceMotion } from '@/ui/motion';

const BARS = [10, 22, 15, 24];

/**
 * The dictation waveform. Unlike the prototype's decorative loop, these bars
 * are driven by the recogniser's real input volume — so the screen shows you
 * it can actually hear you, which is half of what makes dictation trustworthy.
 */
export function Waveform({ active, level }: { active: boolean; level: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 26 }}>
      {BARS.map((height, index) => (
        <Bar key={index} height={height} index={index} active={active} level={level} />
      ))}
    </View>
  );
}

function Bar({
  height,
  index,
  active,
  level,
}: {
  height: number;
  index: number;
  active: boolean;
  level: number;
}) {
  const idle = useSharedValue(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced || active) {
      idle.value = withTiming(0.5, { duration: 200 });
      return;
    }
    idle.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [idle, active, reduced]);

  const animated = useAnimatedStyle(() => {
    // When listening, the voice drives it; otherwise it breathes gently.
    const scale = active ? 0.35 + level * 1.4 : 0.6 + idle.value * 0.5;
    return { height: Math.max(4, height * scale) };
  });

  return (
    <Animated.View
      style={[
        { width: 4, borderRadius: 2, backgroundColor: brand.lime, opacity: active ? 1 : 0.6 },
        animated,
      ]}
    />
  );
}

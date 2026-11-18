/**
 * The bottom dock: Home · Lists · shutter · Friends · Me. Home holds both
 * For you (gift ideas) and Friends (the Feed).
 *
 * Tapping the shutter opens the full-screen camera. Holding it (450ms) opens
 * the camera straight into Say mode; letting go captures.
 */
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/store/useApp';
import type { Route } from '@/store/types';
import { brand, palette } from '@/theme/tokens';
import { Plus, People, Sparkle, TabHome, TabLists, TabMe } from '@/ui/icons';
import { Breathe } from '@/ui/motion';
import { T, Tap } from '@/ui/primitives';

export function Dock({ route }: { route: Route }) {
  const insets = useSafeAreaInsets();
  const tab = useApp((s) => s.tab);
  const openCamera = useApp((s) => s.openCamera);
  const firstRun = useApp((s) => s.firstRun);
  const friendsBadge = useApp((s) => s.requests.length > 0);
  const held = useRef(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = (n: string) => {
    if (n === 'lists') return route.name === 'lists' || route.name === 'list';
    if (n === 'me') return route.name === 'me' || route.name === 'settings';
    if (n === 'people') return route.name === 'people';
    if (n === 'feed') return route.name === 'feed' || route.name === 'ideas';
    return route.name === n;
  };
  const color = (n: string) => (active(n) ? palette.limeText : palette.muted);

  const onPressIn = () => {
    held.current = false;
    if (hold.current) clearTimeout(hold.current);
    hold.current = setTimeout(() => {
      held.current = true;
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      // The dock goes away with the camera, so its press can't carry on into
      // dictation: holding opens the camera ready in Say mode instead.
      openCamera({ mode: 'say' });
    }, 450);
  };
  const onPressOut = () => {
    if (hold.current) clearTimeout(hold.current);
  };
  const onPress = () => {
    if (held.current) {
      held.current = false;
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    openCamera();
  };

  const item = (n: 'feed' | 'ideas' | 'lists' | 'people' | 'me', label: string, icon: React.ReactNode, badge?: boolean) => (
    <Tap
      onPress={() => tab(n)}
      accessibilityLabel={label}
      accessibilityState={{ selected: active(n) }}
      style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 9 }}
    >
      {icon}
      <T size={11} w={600} color={color(n)}>
        {label}
      </T>
      {badge ? (
        <View style={{ position: 'absolute', top: 7, left: '50%', marginLeft: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: brand.pink, borderWidth: 2, borderColor: palette.bg }} />
      ) : null}
    </Tap>
  );

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 8,
        paddingBottom: Math.max(insets.bottom, 12) + 4,
        backgroundColor: palette.dock,
        borderTopWidth: 1,
        borderTopColor: palette.vio33,
        zIndex: 5,
      }}
    >
      {item('feed', 'Home', <TabHome color={color('feed')} />)}
      {item('lists', 'Lists', <TabLists color={color('lists')} />)}
      <Breathe on={firstRun} period={3400} style={{ marginTop: -26 }}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel="Add a shiny"
          accessibilityHint="Opens the camera. Hold to open it in Say mode."
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 3,
            borderColor: palette.ring,
            backgroundColor: palette.inset,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
          }}
        >
          <LinearGradient
            colors={[brand.limeTop, brand.lime, brand.limeDeep]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.3, y: 0.25 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus color={brand.shutterInk} />
            <View style={{ position: 'absolute', top: 5, right: 6, opacity: 0.85 }}>
              <Sparkle size={9} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>
      </Breathe>
      {item('people', 'Friends', <People size={22} strokeWidth={1.4} color={color('people')} />, friendsBadge)}
      {item('me', 'Me', <TabMe color={color('me')} />)}
    </View>
  );
}


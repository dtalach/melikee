/**
 * The floating dock (turn 8b + the centre-shutter round).
 *
 * Five destinations: Lists · Feed · ◉ · Friends · Me. The shutter is not a tab
 * — it's a raised 70px button breaking out of the dock's top edge that fires
 * the capture when you're on the camera and jumps you there from anywhere
 * else, with a brighter glow in the "this fires now" state so the two
 * meanings never blur.
 */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedIcon, FriendsIcon, ListsIcon, MeIcon, PlusIcon, SparkleIcon } from '@/ui/icons';
import { Breathe } from '@/ui/motion';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore, type Tab } from '@/store/useAppStore';

const TABS: { id: Tab; label: string; Icon: typeof ListsIcon }[] = [
  { id: 'lists', label: 'Lists', Icon: ListsIcon },
  { id: 'feed', label: 'Feed', Icon: FeedIcon },
  { id: 'friends', label: 'Friends', Icon: FriendsIcon },
  { id: 'me', label: 'Me', Icon: MeIcon },
];

export function useDockBottom() {
  const insets = useSafeAreaInsets();
  // The design sits the dock 26px off the bottom on a device with a home
  // indicator (34px inset). Devices without one don't need that clearance.
  return Math.max(16, insets.bottom - 8);
}

export function Dock({
  onSelect,
  onShutter,
  /** True when pressing the shutter fires a capture rather than navigating. */
  armed = false,
}: {
  onSelect: (tab: Tab) => void;
  onShutter: () => void;
  armed?: boolean;
}) {
  const theme = useTheme();
  const activeTab = useAppStore((s) => s.activeTab);
  const bottom = useDockBottom();

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: layout.dockInset,
        right: layout.dockInset,
        bottom,
        zIndex: 5,
      }}
    >
      <BlurView
        intensity={Platform.OS === 'web' ? 24 : 30}
        tint={theme.isDark ? 'dark' : 'light'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingVertical: 9,
          paddingHorizontal: 10,
          backgroundColor: theme.dock,
          borderWidth: 1.5,
          borderColor: theme.violet66,
          borderRadius: 24,
          overflow: 'visible',
          boxShadow: `0 14px 34px ${theme.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(45,36,71,0.18)'}`,
        }}
      >
        {left.map((tab) => (
          <DockTab key={tab.id} {...tab} active={activeTab === tab.id} onPress={() => onSelect(tab.id)} />
        ))}

        <Shutter armed={armed} onPress={onShutter} />

        {right.map((tab) => (
          <DockTab key={tab.id} {...tab} active={activeTab === tab.id} onPress={() => onSelect(tab.id)} />
        ))}
      </BlurView>
    </View>
  );
}

function DockTab({
  label,
  Icon,
  active,
  onPress,
}: {
  label: string;
  Icon: typeof ListsIcon;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = active ? theme.limeText : theme.muted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={{ width: 56, alignItems: 'center', gap: 2 }}
    >
      {/* The active indicator: a lime bar riding above the glyph. */}
      {active ? (
        <View
          style={{
            position: 'absolute',
            top: -10,
            width: 26,
            height: 3,
            borderRadius: 2,
            backgroundColor: theme.limeText,
          }}
        />
      ) : null}
      <Icon size={19} color={color} />
      <Text style={{ fontSize: 10.5, fontWeight: '700', color }}>{label}</Text>
    </Pressable>
  );
}

function Shutter({ armed, onPress }: { armed: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={armed ? 'Capture a shiny' : 'Open the camera'}
      hitSlop={6}
      style={({ pressed }) => ({
        width: layout.shutterSize,
        height: layout.shutterSize,
        marginTop: -layout.shutterOverhang,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Breathe duration={3400}>
        <View
          style={{
            width: layout.shutterSize,
            height: layout.shutterSize,
            borderRadius: layout.shutterSize / 2,
            borderWidth: 3,
            borderColor: theme.ring,
            backgroundColor: theme.inset,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: armed
              ? `0 0 30px ${brand.limeGlowStrong}`
              : `0 0 16px ${brand.limeGlowSoft}`,
          }}
        >
          <LinearGradient
            colors={[brand.limeLight, brand.lime, brand.limeDeep]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.25, y: 0.15 }}
            end={{ x: 0.85, y: 1 }}
            style={{
              width: layout.shutterCore,
              height: layout.shutterCore,
              borderRadius: layout.shutterCore / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlusIcon size={24} color={brand.shutterInk} />
            {/* The glint that ties the button to the sparkle language. */}
            <View style={{ position: 'absolute', top: 5, right: 6, opacity: 0.85 }}>
              <SparkleIcon size={9} color="#ffffff" />
            </View>
          </LinearGradient>
        </View>
      </Breathe>
    </Pressable>
  );
}

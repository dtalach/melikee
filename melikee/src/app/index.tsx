/**
 * The app shell.
 *
 * Five destinations on one swipeable strip, with the camera as the leftmost
 * stop — the Snapchat-era expectation the design leaned into. Swiping and the
 * dock drive the same state, so they can never disagree. Swipes are suppressed
 * while a sheet or the filing tray is up, and during the capture flow.
 */
import { useEffect, useRef } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { Dock } from '@/components/Dock';
import { CameraScreen } from '@/screens/CameraScreen';
import { FeedScreen } from '@/screens/FeedScreen';
import { FriendsScreen } from '@/screens/FriendsScreen';
import { ListsScreen } from '@/screens/ListsScreen';
import { MeScreen } from '@/screens/MeScreen';
import { useTheme } from '@/theme/ThemeProvider';
import { TAB_ORDER, useAppStore, type Tab } from '@/store/useAppStore';
import { isBusy, useCaptureStore } from '@/store/useCaptureStore';
import { fireShutter } from '@/services/captureBridge';

export default function AppShell() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  /** The page the strip is actually showing, so state echoes don't re-scroll. */
  const settledIndex = useRef(0);

  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const sheet = useAppStore((s) => s.sheet);
  const filing = useAppStore((s) => s.filing);

  const phase = useCaptureStore((s) => s.phase);
  const capturing = isBusy(phase);

  const index = TAB_ORDER.indexOf(activeTab);

  useEffect(() => {
    if (settledIndex.current === index) return;
    settledIndex.current = index;
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  }, [index, width]);

  const goTo = (tab: Tab) => setActiveTab(tab);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!sheet && !filing && !capturing}
        // Vertical scrolling inside a page must win over the page swipe.
        directionalLockEnabled
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          if (next === settledIndex.current) return;
          settledIndex.current = next;
          setActiveTab(TAB_ORDER[next]);
        }}
      >
        <View style={{ width }}>
          <CameraScreen
            active={activeTab === 'camera'}
            onOpenFeed={() => goTo('feed')}
            onOpenMe={() => goTo('me')}
          />
        </View>
        <View style={{ width }}>
          <ListsScreen />
        </View>
        <View style={{ width }}>
          <FeedScreen />
        </View>
        <View style={{ width }}>
          <FriendsScreen />
        </View>
        <View style={{ width }}>
          <MeScreen />
        </View>
      </ScrollView>

      {/* The dock steps aside for the whole capture flow, so the reveal gets
          the full screen — and mid-flow shutter taps become impossible. */}
      {!capturing ? (
        <Dock
          onSelect={goTo}
          armed={activeTab === 'camera'}
          onShutter={() => {
            if (activeTab === 'camera') {
              // The camera screen owns what "fire" means right now.
              if (!fireShutter()) goTo('camera');
              return;
            }
            goTo('camera');
          }}
        />
      ) : null}
    </View>
  );
}

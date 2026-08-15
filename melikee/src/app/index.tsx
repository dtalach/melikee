/**
 * The app shell.
 *
 * Five destinations on one swipeable strip, with the camera as the leftmost
 * stop — the Snapchat-era expectation the design leaned into. Swiping and the
 * dock drive the same state, so they can never disagree. Swipes are suppressed
 * while a sheet or the filing tray is up, and during the capture flow.
 */
import { useEffect, useRef, type ReactNode } from 'react';
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
  // Pages need an explicit height as well as a width: inside a horizontal
  // ScrollView nothing stretches them, and the camera's chrome is positioned
  // against the full screen.
  const { width, height } = useWindowDimensions();
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
        <Page tab="camera" active={activeTab} width={width} height={height}>
          <CameraScreen
            active={activeTab === 'camera'}
            onOpenFeed={() => goTo('feed')}
            onOpenMe={() => goTo('me')}
          />
        </Page>
        <Page tab="lists" active={activeTab} width={width} height={height}>
          <ListsScreen />
        </Page>
        <Page tab="feed" active={activeTab} width={width} height={height}>
          <FeedScreen />
        </Page>
        <Page tab="friends" active={activeTab} width={width} height={height}>
          <FriendsScreen />
        </Page>
        <Page tab="me" active={activeTab} width={width} height={height}>
          <MeScreen />
        </Page>
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

/**
 * One page of the strip.
 *
 * Every page stays mounted so the camera keeps its preview and screens keep
 * their scroll position — but only the active one is interactive and visible
 * to assistive tech. Without this, a screen reader walks straight through the
 * pages parked off-screen, and a browser can scroll the strip out from under
 * the app's own state.
 */
function Page({
  tab,
  active,
  width,
  height,
  children,
}: {
  tab: Tab;
  active: Tab;
  width: number;
  height: number;
  children: ReactNode;
}) {
  const isActive = tab === active;
  return (
    <View
      style={{ width, height }}
      pointerEvents={isActive ? 'auto' : 'none'}
      accessibilityElementsHidden={!isActive}
      importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
      aria-hidden={!isActive}
    >
      {children}
    </View>
  );
}

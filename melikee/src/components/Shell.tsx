/**
 * The app: one screen at a time from the navigation stack, with the dock,
 * filing tray, sheets and toast layered above.
 */
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Camera } from '@/screens/Camera';
import { Feed } from '@/screens/Feed';
import { FriendListScreen } from '@/screens/FriendList';
import { Friends } from '@/screens/Friends';
import { GifterPage } from '@/screens/Gifter';
import { ItemDetail } from '@/screens/ItemDetail';
import { ListDetail } from '@/screens/ListDetail';
import { Lists } from '@/screens/Lists';
import { Me } from '@/screens/Me';
import { Notifications } from '@/screens/Notifications';
import { Onboarding } from '@/screens/Onboarding';
import { Settings } from '@/screens/Settings';
import { useApp } from '@/store/useApp';
import type { Route } from '@/store/types';
import { palette } from '@/theme/tokens';
import { Dock } from './Dock';
import { FilingTray } from './FilingTray';
import { Sheets } from './sheets/Sheets';
import { Toast } from './Toast';
import { usePublisher } from './usePublisher';

const DOCKED: Route['name'][] = ['feed', 'lists', 'list', 'me', 'people', 'friendList', 'settings', 'notifs'];

export function Shell() {
  const onboarded = useApp((s) => s.onboarded);
  // Every account is a verified phone; anyone without one is asked once.
  const verified = useApp((s) => !!s.phone);
  const route = useApp((s) => s.stack[s.stack.length - 1]);
  const sheet = useApp((s) => s.sheet);
  const insets = useSafeAreaInsets();
  // Keeps your Friends + link lists live at melikee.app.
  usePublisher();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const s = useApp.getState();
      if (s.sheet) {
        s.closeSheet();
        return true;
      }
      const top = s.stack[s.stack.length - 1];
      if (top.name === 'camera') {
        if (s.capture.phase !== 'idle') s.resetCapture();
        else s.closeCamera();
        return true;
      }
      if (s.stack.length > 1) {
        s.back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  if (!onboarded || !verified) {
    return (
      <View style={{ flex: 1 }}>
        <Onboarding />
        <Toast />
      </View>
    );
  }

  const fullBleed = route.name === 'camera' || route.name === 'gifter';

  return (
    <View style={{ flex: 1, backgroundColor: route.name === 'gifter' ? '#faf7f2' : palette.bg }}>
      <StatusBar style={route.name === 'gifter' ? 'dark' : 'light'} />
      <View style={{ flex: 1, paddingTop: fullBleed ? 0 : insets.top }}>
        <Screen route={route} />
      </View>
      {DOCKED.includes(route.name) ? <Dock route={route} /> : null}
      <FilingTray onCamera={route.name === 'camera'} />
      <Toast />
      {sheet ? <Sheets sheet={sheet} /> : null}
    </View>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'camera':
      return <Camera />;
    case 'feed':
      return <Feed />;
    case 'lists':
      return <Lists />;
    case 'list':
      return <ListDetail id={route.id} key={route.id} />;
    case 'item':
      return <ItemDetail id={route.id} key={route.id} />;
    case 'people':
      return <Friends />;
    case 'friendList':
      return <FriendListScreen id={route.id} />;
    case 'me':
      return <Me />;
    case 'settings':
      return <Settings />;
    case 'notifs':
      return <Notifications />;
    case 'gifter':
      return <GifterPage listId={route.listId} preview />;
    default:
      return <Feed />;
  }
}

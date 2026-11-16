/** melikee.app/<handle> — someone's page, for friends and family with the link. */
import { useLocalSearchParams } from 'expo-router';

import { resolveProfile } from '@/lib/links';
import { GifterPage, RemoteGifter } from '@/screens/Gifter';
import { useApp } from '@/store/useApp';

export default function ProfileRoute() {
  const { handle = '' } = useLocalSearchParams<{ handle: string }>();
  const own = useApp((s) => s.onboarded && s.profile.handle === handle.toLowerCase());
  const profileHandle = useApp((s) => s.profile.handle);
  const lists = useApp((s) => s.lists);
  // Your own link on your own device: the local preview, which never shows dibs.
  if (own) {
    const { listId } = resolveProfile({ profileHandle, lists }, handle);
    return <GifterPage listId={listId ?? 'w'} expired={!listId} />;
  }
  return <RemoteGifter handle={handle} />;
}

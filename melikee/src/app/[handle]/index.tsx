/** melikee.app/<handle> — someone's page, for friends and family with the link. */
import { useLocalSearchParams } from 'expo-router';

import { resolveProfile } from '@/lib/links';
import { GifterPage } from '@/screens/Gifter';
import { useApp } from '@/store/useApp';

export default function ProfileRoute() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const profileHandle = useApp((s) => s.profile.handle);
  const lists = useApp((s) => s.lists);
  const { listId } = resolveProfile({ profileHandle, lists }, handle ?? '');
  return <GifterPage listId={listId ?? 'w'} expired={!listId} />;
}

/**
 * The public gifter page: melikee.app/g/<handle>?l=<list>&t=<token>.
 *
 * Without a backend this reads the device's own lists, so it works as a
 * preview of the real thing. The link dies when the list goes private, the
 * token is reset, or the handle doesn't match.
 */
import { useLocalSearchParams } from 'expo-router';

import { GifterPage } from '@/screens/Gifter';
import { useApp } from '@/store/useApp';

export default function GifterRoute() {
  const { handle, l, t } = useLocalSearchParams<{ handle: string; l?: string; t?: string }>();
  const profileHandle = useApp((s) => s.profile.handle);
  const list = useApp((s) => s.lists.find((x) => x.id === (l ?? 'w')));
  const expired = handle !== profileHandle || !list || list.archived || list.vis !== 'invite' || (t != null && t !== list.linkToken);
  return <GifterPage listId={list?.id ?? 'w'} expired={expired} />;
}

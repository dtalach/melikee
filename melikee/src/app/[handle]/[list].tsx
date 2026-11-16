/** melikee.app/<handle>/<list>?t=<token> — one shared list, for gifters with the link. */
import { useLocalSearchParams } from 'expo-router';

import { resolveList } from '@/lib/links';
import { GifterPage } from '@/screens/Gifter';
import { useApp } from '@/store/useApp';

export default function ListRoute() {
  const { handle, list, t } = useLocalSearchParams<{ handle: string; list: string; t?: string }>();
  const profileHandle = useApp((s) => s.profile.handle);
  const lists = useApp((s) => s.lists);
  const { listId } = resolveList({ profileHandle, lists }, handle ?? '', list ?? '', t);
  return <GifterPage listId={listId ?? 'w'} expired={!listId} />;
}

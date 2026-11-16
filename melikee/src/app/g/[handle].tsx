/**
 * Older link form, melikee.app/g/<handle>?l=<list id>&t=<token>, kept so links
 * already copied keep working. New links use /<handle> and /<handle>/<list>.
 */
import { useLocalSearchParams } from 'expo-router';

import { resolveList, resolveProfile, slug } from '@/lib/links';
import { GifterPage } from '@/screens/Gifter';
import { useApp } from '@/store/useApp';

export default function LegacyGifterRoute() {
  const { handle, l, t } = useLocalSearchParams<{ handle: string; l?: string; t?: string }>();
  const profileHandle = useApp((s) => s.profile.handle);
  const lists = useApp((s) => s.lists);
  const target = l ? lists.find((x) => x.id === l) : undefined;
  const { listId } = target ? resolveList({ profileHandle, lists }, handle ?? '', slug(target.name), t) : resolveProfile({ profileHandle, lists }, handle ?? '');
  return <GifterPage listId={listId ?? 'w'} expired={!listId} />;
}

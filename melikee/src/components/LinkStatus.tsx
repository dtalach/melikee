/** One line under a link: is it live, and if not, what to do about it. */
import { useApp } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { T, Tap } from '@/ui/primitives';

export function LinkStatus({ shared = true }: { shared?: boolean }) {
  const state = useApp((s) => s.publishState);
  const handle = useApp((s) => s.profile.handle);
  const openSheet = useApp((s) => s.openSheet);

  if (state === 'taken') {
    return (
      <Tap onPress={() => openSheet({ type: 'handle' })}>
        <T size={11.5} w={600} color={brand.pink}>
          @{handle} is taken, so this link won’t open yet. <T size={11.5} w={800} color={brand.pink}>Change handle</T>
        </T>
      </Tap>
    );
  }
  const text =
    state === 'off'
      ? 'Sharing isn’t switched on for this server yet.'
      : state === 'error'
        ? 'Couldn’t sync just now — we’ll keep trying.'
        : !shared
          ? 'Set a list to “Anyone with the link” to share it here.'
          : state === 'live'
            ? 'Live — opens on any phone, no app needed.'
            : 'Getting your link ready…';
  return (
    <T size={11} color={state === 'live' && shared ? palette.limeText : palette.muted}>
      {text}
    </T>
  );
}

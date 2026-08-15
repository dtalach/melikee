import { InviteSheet } from '@/components/sheets/InviteSheet';
import { NewListSheet } from '@/components/sheets/NewListSheet';
import { SettingsSheet } from '@/components/sheets/SettingsSheet';
import { ShareSheet } from '@/components/sheets/ShareSheet';
import { useAppStore } from '@/store/useAppStore';

/** One host for every half-sheet, mounted above the navigator. */
export function Sheets() {
  const sheet = useAppStore((s) => s.sheet);
  if (!sheet) return null;

  switch (sheet.kind) {
    case 'share':
      return <ShareSheet listId={sheet.listId} />;
    case 'invite':
      return <InviteSheet />;
    case 'newList':
      return <NewListSheet />;
    case 'settings':
      return <SettingsSheet />;
  }
}

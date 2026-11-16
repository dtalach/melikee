import type { Sheet } from '@/store/types';
import { useApp } from '@/store/useApp';
import { SheetFrame } from '@/ui/primitives';
import { BdaySheet, CleanupSheet, NotifSettingsSheet, ParentSheet, PrivacySheet } from './AccountSheets';
import { ConfirmSheet, FeedItemSheet, InviteSheet } from './PeopleSheets';
import { ListSettingsSheet, NewListSheet, ShareSheet, VisSheet } from './ListSheets';

export function Sheets({ sheet }: { sheet: Sheet }) {
  const close = useApp((s) => s.closeSheet);
  return (
    <SheetFrame key={sheet.type} onClose={close} gap={sheet.type === 'notifSettings' ? 4 : sheet.type === 'vis' ? 10 : 12}>
      <Body sheet={sheet} />
    </SheetFrame>
  );
}

function Body({ sheet }: { sheet: Sheet }) {
  switch (sheet.type) {
    case 'share':
      return <ShareSheet listId={sheet.listId} />;
    case 'vis':
      return <VisSheet listId={sheet.listId} />;
    case 'newList':
      return <NewListSheet />;
    case 'listSettings':
      return <ListSettingsSheet listId={sheet.listId} />;
    case 'invite':
      return <InviteSheet />;
    case 'feedItem':
      return <FeedItemSheet id={sheet.id} />;
    case 'confirm':
      return <ConfirmSheet action={sheet.action} friendId={sheet.friendId} />;
    case 'bday':
      return <BdaySheet />;
    case 'parent':
      return <ParentSheet />;
    case 'cleanup':
      return <CleanupSheet listId={sheet.listId} />;
    case 'notifSettings':
      return <NotifSettingsSheet />;
    case 'privacy':
      return <PrivacySheet />;
  }
}

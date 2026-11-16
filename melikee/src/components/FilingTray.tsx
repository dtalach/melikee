/**
 * After an add: "In My wants ✓" with the price-alert bell, Undo and View, and
 * a bar that drains over six seconds. The add already happened — this is just
 * the receipt.
 */
import { View } from 'react-native';

import { FILING_SECONDS, listById, useApp } from '@/store/useApp';
import { palette } from '@/theme/tokens';
import { Bell } from '@/ui/icons';
import { Appear, Drain } from '@/ui/motion';
import { PhotoBox, T, Tap } from '@/ui/primitives';

export function FilingTray({ onCamera }: { onCamera: boolean }) {
  const filing = useApp((s) => s.filing);
  const item = useApp((s) => (s.filing ? s.items.find((i) => i.id === s.filing!.itemId) : undefined));
  const list = useApp((s) => (item ? listById(s, item.list) : undefined));
  const updateItem = useApp((s) => s.updateItem);
  const undo = useApp((s) => s.undoFiling);
  const end = useApp((s) => s.endFiling);
  const go = useApp((s) => s.go);

  if (!filing || !item || !list) return null;
  const alertOn = item.alert !== false;

  return (
    <Appear key={filing.key} style={{ position: 'absolute', left: 14, right: 14, bottom: onCamera ? 214 : 104, zIndex: 6 }}>
      <View
        style={{
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.vio33,
          borderRadius: 18,
          paddingVertical: 10,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
        }}
      >
        <PhotoBox label="" style={{ width: 40, height: 40, borderRadius: 10 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={13} w={700} numberOfLines={1}>
            In {list.name} ✓
          </T>
          <T size={11} color={palette.muted} numberOfLines={1}>
            {item.name} · {item.price} · {alertOn ? 'alert if price drops' : 'no price alerts'}
          </T>
        </View>
        <Tap
          onPress={() => updateItem(item.id, { alert: !alertOn })}
          accessibilityRole="switch"
          accessibilityState={{ checked: alertOn }}
          accessibilityLabel="Price drop alert"
          style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: alertOn ? palette.vio22 : palette.chip }}
        >
          <Bell size={15} color={alertOn ? palette.vio : palette.muted} fill={alertOn ? palette.vio : 'none'} />
        </Tap>
        <Tap onPress={undo} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
          <T size={12.5} w={700} color={palette.vio}>
            Undo
          </T>
        </Tap>
        <Tap
          onPress={() => {
            end();
            go({ name: 'item', id: item.id });
          }}
          style={{ backgroundColor: palette.chip, borderWidth: 1, borderColor: palette.vio44, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 }}
        >
          <T size={12} w={700}>
            View
          </T>
        </Tap>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <Drain key={filing.key} seconds={FILING_SECONDS} color={palette.vio} />
        </View>
      </View>
    </Appear>
  );
}

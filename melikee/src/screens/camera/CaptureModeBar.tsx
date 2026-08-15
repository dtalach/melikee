/**
 * The mode selector.
 *
 * Deliberately *not* pills: three lozenge chips above a lozenge dock read as
 * two stacked nav bars. Camera apps solved this years ago with plain uppercase
 * labels (PHOTO · VIDEO · PORTRAIT), so that's what this is — with a 13px
 * inline icon that inherits the label colour, so the active mode lights up
 * icon and text as one unit.
 */
import { Pressable, View } from 'react-native';

import { CameraIcon, MicIcon, ScanIcon } from '@/ui/icons';
import { AppText } from '@/ui/primitives';
import { useTheme } from '@/theme/ThemeProvider';
import { useCaptureStore } from '@/store/useCaptureStore';
import type { CaptureMode } from '@/store/types';

const MODES: { id: CaptureMode; label: string; Icon: typeof ScanIcon }[] = [
  { id: 'scan', label: 'Scan', Icon: ScanIcon },
  { id: 'snap', label: 'Snap', Icon: CameraIcon },
  { id: 'say', label: 'Say it', Icon: MicIcon },
];

export function CaptureModeBar() {
  const theme = useTheme();
  const mode = useCaptureStore((s) => s.mode);
  const setMode = useCaptureStore((s) => s.setMode);

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 122,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
      }}
    >
      {MODES.map(({ id, label, Icon }) => {
        const selected = mode === id;
        const color = selected ? theme.limeText : '#8d82b5';
        return (
          <Pressable
            key={id}
            onPress={() => setMode(id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            hitSlop={10}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Icon size={13} color={color} />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: '800',
                letterSpacing: 1.17,
                textTransform: 'uppercase',
                color,
                textShadowColor: 'rgba(13,10,22,0.8)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 8,
              }}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

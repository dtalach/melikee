/**
 * Picking a birthday.
 *
 * A native date picker is the obvious control and the wrong one: it opens on
 * today, spins through a year nobody wants, and asks for a birth *year* the app
 * has no use for. A birthday here is a month and a day — twelve chips and a
 * grid of numbers, both tappable, nothing to type.
 *
 * Shared by onboarding and the Me screen, which are the two places it is asked
 * for and therefore the two places it has to look the same.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { daysInMonth, MONTHS } from '@/store/profile';
import { AppText, Squish } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export function BirthdayPicker({
  month,
  day,
  onChange,
}: {
  month?: number;
  day?: number;
  onChange: (value: { month: number; day: number }) => void;
}) {
  // The month drives which days exist, so a month with no day yet still needs
  // one held here — otherwise picking "Feb" then "30" would be reachable.
  const [pendingMonth, setPendingMonth] = useState(month);
  const activeMonth = month ?? pendingMonth;

  const pickMonth = (next: number) => {
    setPendingMonth(next);
    // Keep the day if it still exists in the new month; February eats the 30th.
    if (day !== undefined) onChange({ month: next, day: Math.min(day, daysInMonth(next)) });
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {MONTHS.map((label, index) => (
          <Chip
            key={label}
            label={label}
            selected={activeMonth === index}
            onPress={() => pickMonth(index)}
            width={72}
          />
        ))}
      </View>

      {activeMonth !== undefined ? (
        <ScrollView style={{ maxHeight: 148 }} contentContainerStyle={{ paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: daysInMonth(activeMonth) }, (_, i) => i + 1).map((n) => (
              <Chip
                key={n}
                label={String(n)}
                selected={month === activeMonth && day === n}
                onPress={() => onChange({ month: activeMonth, day: n })}
                width={40}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        <AppText tone="muted" style={{ fontSize: 11.5 }}>
          Pick a month first.
        </AppText>
      )}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  width,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  width: number;
}) {
  const theme = useTheme();
  return (
    <Squish onPress={onPress}>
      <View
        style={{
          width,
          alignItems: 'center',
          paddingVertical: 8,
          borderRadius: layout.radius.chip,
          borderWidth: 1.5,
          borderColor: selected ? brand.pink : theme.violet44,
          backgroundColor: selected ? brand.pink : theme.inset,
        }}
      >
        <AppText
          style={{
            fontSize: 12.5,
            fontWeight: '800',
            color: selected ? brand.pinkInk : theme.text,
          }}
        >
          {label}
        </AppText>
      </View>
    </Squish>
  );
}

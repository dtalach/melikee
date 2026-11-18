/**
 * Christmas gift wrap: a red ribbon crossing a card with a bow on the knot.
 * Used on the Feed's Christmas countdown and on the Christmas board in Lists.
 */
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const RIBBON = '#d3263a';
export const RIBBON_DARK = '#a51b2c';
/** The Christmas board's day-count badge. */
export const XMAS_GREEN = '#2f9e5b';

/** A two-loop bow with tails. 60×48 at scale 1. */
export function Bow({ width = 78 }: { width?: number }) {
  return (
    <Svg width={width} height={(width * 48) / 60} viewBox="0 0 60 48">
      <Path d="M27 22 C 16 6, 2 8, 6 20 C 9 29, 20 27, 27 22 Z" fill={RIBBON} stroke={RIBBON_DARK} strokeWidth={1.2} />
      <Path d="M33 22 C 44 6, 58 8, 54 20 C 51 29, 40 27, 33 22 Z" fill={RIBBON} stroke={RIBBON_DARK} strokeWidth={1.2} />
      <Path d="M28 25 L 20 44 L 25 41 L 28 46 L 30 27 Z" fill={RIBBON} stroke={RIBBON_DARK} strokeWidth={1} />
      <Path d="M32 25 L 40 44 L 35 41 L 32 46 L 30 27 Z" fill={RIBBON} stroke={RIBBON_DARK} strokeWidth={1} />
      <Path d="M25 18 h10 a3 3 0 0 1 3 3 v3 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 -3 -3 v-3 a3 3 0 0 1 3 -3 z" fill={RIBBON_DARK} />
    </Svg>
  );
}

/**
 * The ribbon and bow, laid over the parent (which clips them with
 * overflow: hidden). `right` and `top` place the centre of the crossing.
 */
export function GiftWrap({ right, top, band = 12, bow = 78 }: { right: number; top: number; band?: number; bow?: number }) {
  const bowH = (bow * 48) / 60;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: top - band / 2, height: band, backgroundColor: RIBBON, borderTopWidth: 1, borderBottomWidth: 1, borderColor: RIBBON_DARK }} />
      <View style={{ position: 'absolute', top: 0, bottom: 0, right: right - band / 2, width: band, backgroundColor: RIBBON, borderLeftWidth: 1, borderRightWidth: 1, borderColor: RIBBON_DARK }} />
      {/* The knot sits at (30, 22.5) of the bow's 60×48 box. */}
      <View style={{ position: 'absolute', top: top - bowH * (22.5 / 48), right: right - bow / 2 }}>
        <Bow width={bow} />
      </View>
    </View>
  );
}

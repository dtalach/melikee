/**
 * Occasion decorations. Christmas: a red ribbon crossing a card with a bow on
 * the knot (the Feed's countdown and the Christmas board). Birthday: cake
 * sprinkles scattered over the Birthday board.
 */
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

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

/** [x, y, rotation, colour] in a 168×125 board; circles have no rotation. */
const SPRINKLES: [number, number, number, string][] = [
  [74, 17, 30, '#ff3d8b'],
  [96, 31, -40, '#ffb020'],
  [60, 45, 70, '#4aa8ff'],
  [114, 53, -10, '#ff3d8b'],
  [84, 65, 50, '#2f9e5b'],
  [144, 69, 20, '#ffb020'],
  [34, 31, -60, '#ffb020'],
  [128, 89, -35, '#4aa8ff'],
  [102, 97, 80, '#ff3d8b'],
  [70, 87, 15, '#111111'],
  [154, 105, -70, '#ff3d8b'],
  [122, 21, 60, '#111111'],
  [48, 65, -25, '#ff3d8b'],
  [88, 113, 35, '#ffb020'],
];
const DOTS: [number, number, string][] = [
  [102, 76, '#ff3d8b'],
  [52, 22, '#4aa8ff'],
  [136, 44, '#2f9e5b'],
  [74, 100, '#ff3d8b'],
];

/** Birthday cake sprinkles scattered over a board cover (the parent clips them). */
export function Sprinkles() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 168 125" preserveAspectRatio="xMidYMid slice">
        {SPRINKLES.map(([x, y, r, c], i) => (
          <Rect key={i} x={x - 4.5} y={y - 1.5} width={9} height={3} rx={1.5} fill={c} transform={`rotate(${r} ${x} ${y})`} />
        ))}
        {DOTS.map(([x, y, c], i) => (
          <Circle key={`d${i}`} cx={x} cy={y} r={1.9} fill={c} />
        ))}
      </Svg>
    </View>
  );
}

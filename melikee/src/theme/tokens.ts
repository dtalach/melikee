/**
 * Design tokens, lifted from the Teen Prototype's `.mlk-dark.mlk-ink` theme —
 * the combination the design ships with (accent "ink", dark ground).
 *
 * Names follow the prototype's CSS variables (`--mbg` → `bg`, `--mvio44` →
 * `vio44`) so a value can be traced back to the design file by eye.
 */
export const palette = {
  bg: '#121212',
  inset: '#121212',
  card: '#1e1e1f',
  cardT: '#1e1e1fee',
  chip: '#29292b',
  deep: '#3a3a3d',
  ph1: '#2a2a2d',
  ph2: '#3c3c40',
  rad1: '#1c1c1e',
  rad2: '#0b0b0c',
  text: '#f5f4f0',
  /** Secondary text: 7.4:1 on the background, readable outdoors. */
  muted: '#aaa9a3',
  soft: '#c8c7c1',
  avt: '#dad9d3',
  vio: '#e9e6dd',
  vio22: '#e9e6dd22',
  vio33: '#e9e6dd33',
  vio44: '#e9e6dd44',
  vio55: '#e9e6dd55',
  vio66: '#e9e6dd66',
  vio99: '#e9e6dd99',
  lime55: '#c8f54255',
  lime66: '#c8f54266',
  limeText: '#c8f542',
  dock: 'rgba(41,41,43,0.9)',
  vioFill: 'rgba(233,230,221,0.1)',
  ring: 'rgba(245,244,240,0.92)',
  glow50: 'rgba(233,230,221,0.5)',
  glow40: 'rgba(233,230,221,0.4)',
  scrim: 'rgba(12,12,12,0.6)',
} as const;

/** Colors that never change with theme: the brand's lime and pink. */
export const brand = {
  lime: '#c8f542',
  limeTop: '#e6ff85',
  limeDeep: '#9fc22e',
  limeInk: '#141a04',
  shutterInk: '#1a2004',
  pink: '#ff5da2',
  pink22: '#ff5da222',
  pink66: '#ff5da266',
  white: '#ffffff',
  /** The camera's stand-in ground when there's no live preview. */
  camTop: '#3a3442',
  camBottom: '#141018',
  camText: '#f6f2ff',
  camSoft: '#c9bdf0',
  camMuted: '#a79ecf',
  shotTop: '#4a4256',
  shotBottom: '#231c2c',
} as const;

/** The gifter page is a light, paper-toned page — it's what family opens. */
export const gift = {
  page: '#faf7f2',
  band: '#f0eae0',
  bandLine: '#e2dacc',
  rowLine: '#eee7da',
  thumb: '#efe9dd',
  meta: '#8a8074',
  body: '#5c5347',
  accent: '#2d2a26',
  accent66: '#2d2a2666',
  fill: '#eceae4',
  text: '#2d2a26',
} as const;

/** Friends' list accents offered when making a new list. */
export const listColors = ['#5b8cff', '#2fd4c2', '#ffb02e', '#ff5da2', '#a78bfa'] as const;

export const font = {
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
} as const;

export type Weight = keyof typeof font;

/** The pink "soon" ring used on avatars of friends with a birthday coming. */
export const ringSoon = [brand.pink, palette.vio] as const;

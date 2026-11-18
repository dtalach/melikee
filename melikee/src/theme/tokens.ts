/**
 * Design tokens, lifted from the Teen Prototype's `.mlk-dark.mlk-ink` theme —
 * the combination the design ships with (accent "ink", dark ground).
 *
 * Names follow the prototype's CSS variables (`--mbg` → `bg`, `--mvio44` →
 * `vio44`) so a value can be traced back to the design file by eye.
 */
/**
 * "Mono": white surfaces, black ink, hairlines instead of cards, light type.
 * The keys keep the names from the first (dark) design so every screen moved
 * over at once; what they mean now is in the comments.
 */
export const palette = {
  bg: '#ffffff',
  /** Inputs and inset areas. */
  inset: '#f6f6f6',
  /** Sheets and panels: white, separated by space rather than colour. */
  card: '#ffffff',
  cardT: '#ffffffee',
  /** Rare neutral fills: chips, unselected options. */
  chip: '#f3f3f3',
  deep: '#ebebeb',
  /** Photo placeholders. */
  ph1: '#f5f5f5',
  ph2: '#ebebeb',
  rad1: '#ffffff',
  rad2: '#ffffff',
  /** Ink: text, the one black button, icons, selected states. */
  text: '#111111',
  muted: '#8a8a8a',
  soft: '#444444',
  avt: '#111111',
  /** Was violet; everything violet is ink now. */
  vio: '#111111',
  vio22: 'rgba(0,0,0,0.04)',
  /** Hairline divider. */
  vio33: 'rgba(0,0,0,0.07)',
  /** Strong hairline: dashed "add" tiles, unselected outlines. */
  vio44: 'rgba(0,0,0,0.15)',
  vio55: 'rgba(0,0,0,0.15)',
  vio66: 'rgba(0,0,0,0.2)',
  vio99: 'rgba(0,0,0,0.5)',
  lime55: 'rgba(0,0,0,0.15)',
  lime66: 'rgba(0,0,0,0.2)',
  /** Was lime text (prices, highlights); lime fails contrast on white, so ink. */
  limeText: '#111111',
  dock: '#ffffff',
  vioFill: 'rgba(0,0,0,0.04)',
  ring: 'rgba(0,0,0,0.15)',
  glow50: 'transparent',
  glow40: 'transparent',
  scrim: 'rgba(0,0,0,0.18)',
} as const;

/**
 * The two accents carry meaning and nothing else gets colour:
 * pink = birthdays and urgency, lime = add (the + shutter, My wants).
 * Text on either is always ink.
 */
export const accent = {
  bday: '#ff3d8b',
  add: '#d4ff2e',
  ink: '#111111',
} as const;

/**
 * Older names, re-pointed for Mono: "lime" was the primary action colour,
 * which is ink now (white text on it); the real lime lives in `accent.add`.
 */
export const brand = {
  lime: '#111111',
  limeTop: '#111111',
  limeDeep: '#111111',
  limeInk: '#ffffff',
  shutterInk: '#111111',
  pink: '#ff3d8b',
  pink22: '#ff3d8b22',
  pink66: '#ff3d8b66',
  white: '#ffffff',
  /** The camera's stand-in ground when there's no live preview: it stays dark. */
  camTop: '#2a2a2c',
  camBottom: '#111111',
  camText: '#ffffff',
  camSoft: '#d6d6d6',
  camMuted: '#a6a6a6',
  shotTop: '#3a3a3c',
  shotBottom: '#1c1c1e',
} as const;

/** The gifter page: the same white Mono page family see from a link. */
export const gift = {
  page: '#ffffff',
  band: '#f6f6f6',
  bandLine: 'rgba(0,0,0,0.07)',
  rowLine: 'rgba(0,0,0,0.07)',
  thumb: '#f5f5f5',
  meta: '#8a8a8a',
  body: '#444444',
  accent: '#111111',
  accent66: 'rgba(0,0,0,0.4)',
  fill: '#f3f3f3',
  text: '#111111',
} as const;

/**
 * The light Feed (Home → Friends): white page, thin oversized type, a black
 * countdown card, lots of air. Every other screen keeps the dark theme.
 */
export const paper = {
  bg: '#ffffff',
  text: '#111111',
  body: '#3a3a3a',
  muted: '#8e8e8e',
  line: '#ececec',
  photo: '#f4f4f4',
  ring: '#e4e4e4',
  avatar: '#f2f2f2',
  card: '#121212',
  cardText: '#ffffff',
  cardMuted: '#bdbdbd',
} as const;

/** Friends' list accents offered when making a new list. */
export const listColors = ['#5b8cff', '#2fd4c2', '#ffb02e', '#ff5da2', '#a78bfa'] as const;

export const font = {
  200: 'Inter_200ExtraLight',
  300: 'Inter_300Light',
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
} as const;

export type Weight = keyof typeof font;

/** The pink "soon" ring used on avatars of friends with a birthday coming. */
export const ringSoon = [brand.pink, brand.pink] as const;

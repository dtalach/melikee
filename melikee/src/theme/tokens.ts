/**
 * Design tokens, ported 1:1 from the MeLikee Teen Prototype.
 *
 * The prototype carried two CSS custom-property sets — `.mlk-dark` and
 * `.mlk-light` — plus a handful of colours that were hard-coded because they
 * are brand constants rather than themed surfaces (the lime CTA, the pink
 * accent, the ink used on top of lime). That split is preserved here: `brand`
 * never changes, `themes.dark` / `themes.light` do.
 */

/** Brand constants — identical in both themes. */
export const brand = {
  /** The neon shutter / CTA lime. */
  lime: '#c8f542',
  /** Top stop of the CTA gradient (`linear-gradient(180deg,#e6ff85,#c8f542)`). */
  limeLight: '#e6ff85',
  /** Bottom stop of the shutter core's radial gradient. */
  limeDeep: '#9fc22e',
  /** Text/glyph colour used on top of lime fills. */
  limeInk: '#141a04',
  /** Slightly deeper ink, used for the shutter glyph specifically. */
  shutterInk: '#1a2004',
  /** The pink accent — birthdays, secrets-adjacent warnings, destructive actions. */
  pink: '#ff5da2',
  pinkInk: '#ffffff',
  /** Glow colours used by shadows and text-shadows. */
  limeGlow: 'rgba(200,245,66,0.35)',
  limeGlowStrong: 'rgba(200,245,66,0.65)',
  limeGlowSoft: 'rgba(200,245,66,0.3)',
  violetGlow: 'rgba(167,139,250,0.5)',
  violetGlowSoft: 'rgba(167,139,250,0.4)',
} as const;

/** The gifter page is its own light brand surface in both themes. */
export const gifter = {
  bg: '#faf7f2',
  bar: '#f0eae0',
  barEdge: '#e2dacc',
  card: '#ffffff',
  cardEdge: '#eee7da',
  cardEdgeDibsed: '#7a5fd066',
  photo: '#efe9dd',
  text: '#2d2447',
  muted: '#8a8074',
  note: '#5c5347',
  violet: '#7a5fd0',
  violetWash: '#f1ecfa',
} as const;

export type Theme = {
  /** Page ground. */
  bg: string;
  /** Inset/recessed surface — one step off the ground. */
  inset: string;
  /** Card surface — two steps above the ground (turn-8 contrast pass). */
  card: string;
  /** Card surface with alpha, for pills floating over the viewfinder. */
  cardTranslucent: string;
  /** Chip / secondary control fill. */
  chip: string;
  /** Deep fill — avatars, inactive rings. */
  deep: string;
  /** Photo placeholder gradient stops. */
  photo1: string;
  photo2: string;
  /** Radial glow-ground stops. */
  radial1: string;
  radial2: string;
  /** Primary text. */
  text: string;
  /** Secondary text — brightened in the turn-8 contrast pass to ~4.5:1. */
  muted: string;
  /** Softer body text, one step brighter than muted. */
  soft: string;
  /** Avatar initials. */
  avatarText: string;
  /** The lilac accent. */
  violet: string;
  violet22: string;
  violet33: string;
  violet44: string;
  violet55: string;
  violet66: string;
  violet99: string;
  /** Lime at alpha, for card edges. */
  lime55: string;
  lime66: string;
  /** Lime as *text* — darkened in light mode so it stays legible. */
  limeText: string;
  /** The floating dock's frosted fill. */
  dock: string;
  /** Violet wash used inside null-state orbs. */
  violetFill: string;
  /** The ring around the dock shutter. */
  ring: string;
  /** Scrim behind bottom sheets. */
  scrim: string;
  /** Shadow colour for elevated cards. */
  shadow: string;
  /** Whether this theme is the dark one — for status bar / camera chrome. */
  isDark: boolean;
};

export const darkTheme: Theme = {
  bg: '#14101f',
  inset: '#14101f',
  card: '#221a38',
  cardTranslucent: 'rgba(34,26,56,0.93)',
  chip: '#2b2145',
  deep: '#3a2b5e',
  photo1: '#312653',
  photo2: '#443370',
  radial1: '#241b3a',
  radial2: '#0e0b18',
  text: '#f6f2ff',
  muted: '#a79ecf',
  soft: '#c9bdf0',
  avatarText: '#d9d1f5',
  violet: '#a78bfa',
  violet22: 'rgba(167,139,250,0.13)',
  violet33: 'rgba(167,139,250,0.2)',
  violet44: 'rgba(167,139,250,0.27)',
  violet55: 'rgba(167,139,250,0.33)',
  violet66: 'rgba(167,139,250,0.4)',
  violet99: 'rgba(167,139,250,0.6)',
  lime55: 'rgba(200,245,66,0.33)',
  lime66: 'rgba(200,245,66,0.4)',
  limeText: '#c8f542',
  dock: 'rgba(43,33,69,0.9)',
  violetFill: 'rgba(167,139,250,0.1)',
  ring: 'rgba(246,242,255,0.92)',
  scrim: 'rgba(13,10,22,0.6)',
  shadow: '#000000',
  isDark: true,
};

export const lightTheme: Theme = {
  bg: '#faf8ff',
  inset: '#f1ecfa',
  card: '#ffffff',
  cardTranslucent: 'rgba(255,255,255,0.93)',
  chip: '#ebe5f8',
  deep: '#ddd3f4',
  photo1: '#e5def6',
  photo2: '#cabcec',
  radial1: '#ece4fb',
  radial2: '#f7f3fe',
  text: '#221a38',
  muted: '#6f639c',
  soft: '#57497f',
  avatarText: '#453a70',
  violet: '#7a5fd0',
  violet22: 'rgba(122,95,208,0.13)',
  violet33: 'rgba(122,95,208,0.2)',
  violet44: 'rgba(122,95,208,0.27)',
  violet55: 'rgba(122,95,208,0.33)',
  violet66: 'rgba(122,95,208,0.4)',
  violet99: 'rgba(122,95,208,0.6)',
  lime55: 'rgba(134,168,39,0.33)',
  lime66: 'rgba(134,168,39,0.4)',
  limeText: '#6c8b12',
  dock: 'rgba(255,255,255,0.92)',
  violetFill: 'rgba(122,95,208,0.12)',
  ring: 'rgba(34,26,56,0.2)',
  scrim: 'rgba(45,36,71,0.35)',
  shadow: '#2d2447',
  isDark: false,
};

/**
 * Motion constants from the choreography card in turn 6.
 * Transitions live in 200–350ms; overshoot is reserved for rewards.
 */
export const motion = {
  /** Standard screen / state transition. */
  transition: 260,
  /** The found-card pop. */
  pop: 320,
  /** The card's flight into the shutter. */
  fly: 900,
  /** Sparkle burst after landing. */
  burst: 700,
  /** Sticker slap-in, delayed after the camera appears. */
  slap: 500,
  slapDelay: 400,
  /** Flash on snap. */
  flash: 400,
  /** How long "Working our magic…" runs before the found card. */
  magic: 1600,
  /** Springs — the overshoot used for rewards only. */
  spring: { damping: 13, stiffness: 190, mass: 0.9 },
  gentleSpring: { damping: 18, stiffness: 160, mass: 0.9 },
} as const;

/** Layout constants shared by the dock and the screens that clear it. */
export const layout = {
  dockHeight: 62,
  dockBottom: 26,
  dockInset: 16,
  shutterSize: 70,
  shutterCore: 54,
  shutterOverhang: 34,
  /** Bottom padding scroll views need so content clears the floating dock. */
  dockClearance: 110,
  radius: { card: 16, bigCard: 18, sheet: 22, pill: 999, chip: 14, tile: 10 },
} as const;

export const typography = {
  /** Screen titles — "The Feed", "Your lists". */
  screenTitle: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.78 },
  /** Detail titles — a list or friend name. */
  sectionTitle: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.4 },
  /** The camera greeting. */
  hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.96 },
  /** Section captions — "WHILE YOU WERE OUT". */
  eyebrow: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.88 },
  body: { fontSize: 12, fontWeight: '600' as const },
  /** Prices — bumped to 12px in the contrast pass so lime stays legible. */
  price: { fontSize: 12, fontWeight: '800' as const },
} as const;

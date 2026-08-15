import { create } from 'zustand';

import { matchProduct, type MatchRequest } from '@/services/productMatch';
import type { RecognizeErrorCode, RecognizeImage } from '@/services/recognition/contract';
import { motion } from '@/theme/tokens';
import type { CaptureMode, ProductMatch } from '@/store/types';

/**
 * The capture state machine.
 *
 * idle → snap (flash) → magic → found → fly → (filing tray)
 *                          ↘ alts ↗
 *                          ↘ miss
 *
 * It lives in its own store because two components drive it: the camera screen
 * owns the viewfinder and the reveal, while the dock's centre shutter is the
 * thing you actually press.
 *
 * `miss` arrived with real lookup. A scripted matcher always found something;
 * a real one sometimes looks at a photo of a wall, or searches for a product
 * that isn't sold anywhere, and the flow has to end somewhere honest instead of
 * showing headphones.
 */
export type CapturePhase = 'idle' | 'snap' | 'magic' | 'found' | 'alts' | 'fly' | 'miss';

/** Phases where the reveal owns the screen and the dock steps aside. */
export const BUSY_PHASES: CapturePhase[] = ['snap', 'magic', 'found', 'alts', 'fly', 'miss'];

type CaptureState = {
  phase: CapturePhase;
  mode: CaptureMode;
  candidates: ProductMatch[];
  /** Which candidate the found card is currently showing. */
  chosen: number;
  /** The photo this capture produced, when there was one. */
  photoUri?: string;
  /** When the prices on `candidates` were checked. */
  checkedAt?: string;
  /** True when the match came from the demo catalogue rather than a real lookup. */
  demo: boolean;
  /** Why the lookup came back empty, in the `miss` phase. */
  missCode?: RecognizeErrorCode;
  /** Live dictation, in Say-it mode. */
  transcript: string;
  listening: boolean;
  /** Set when the hardware or a permission got in the way. */
  error?: string;

  setMode: (mode: CaptureMode) => void;
  setTranscript: (transcript: string) => void;
  setListening: (listening: boolean) => void;
  setError: (error?: string) => void;

  /** Start a capture. The flash only plays for a real shutter press. */
  begin: (input: BeginInput) => Promise<void>;
  /** Run the same lookup again — the wish is still in front of the user. */
  retry: () => Promise<void>;

  showAlternates: () => void;
  chooseAlternate: (index: number) => void;
  /** Back to the viewfinder, discarding the match. */
  cancel: () => void;
  /** The claim: play the flight, then hand off to the filing tray. */
  claim: () => void;
  finish: () => void;
};

type BeginInput =
  | { mode: 'snap'; photoUri?: string; image?: RecognizeImage }
  | { mode: 'scan'; upc: string }
  | { mode: 'say'; transcript: string };

/**
 * The request behind the capture in flight, kept outside the store because
 * nothing renders it — it exists so "try again" can mean the same lookup rather
 * than making the user re-photograph something they are still holding.
 */
let lastRequest: MatchRequest | null = null;

const toRequest = (input: BeginInput): MatchRequest =>
  input.mode === 'scan'
    ? { mode: 'scan', upc: input.upc }
    : input.mode === 'say'
      ? { mode: 'say', transcript: input.transcript }
      : { mode: 'snap', photoUri: input.photoUri, image: input.image };

export const useCaptureStore = create<CaptureState>((set, get) => ({
  phase: 'idle',
  mode: 'snap',
  candidates: [],
  chosen: 0,
  demo: false,
  transcript: '',
  listening: false,

  setMode: (mode) => set({ mode, transcript: '', error: undefined }),
  setTranscript: (transcript) => set({ transcript }),
  setListening: (listening) => set({ listening }),
  setError: (error) => set({ error }),

  begin: async (input) => {
    if (get().phase !== 'idle') return;

    // Only a photo capture earns the flash — it's a camera affordance, not a
    // loading state.
    if (input.mode === 'snap') {
      set({ phase: 'snap', mode: 'snap', photoUri: input.photoUri, chosen: 0, error: undefined });
      await new Promise((resolve) => setTimeout(resolve, motion.flash));
    } else {
      set({ phase: 'magic', mode: input.mode, chosen: 0, error: undefined });
    }

    set({ phase: 'magic', missCode: undefined });

    lastRequest = toRequest(input);
    await resolve(lastRequest, set, get);
  },

  retry: async () => {
    if (!lastRequest) return set({ phase: 'idle' });
    set({ phase: 'magic', missCode: undefined, chosen: 0 });
    await resolve(lastRequest, set, get);
  },

  showAlternates: () => set({ phase: 'alts' }),
  chooseAlternate: (chosen) => set({ chosen, phase: 'found' }),

  cancel: () => {
    lastRequest = null;
    set({
      phase: 'idle',
      candidates: [],
      chosen: 0,
      photoUri: undefined,
      transcript: '',
      missCode: undefined,
      demo: false,
    });
  },

  claim: () => set({ phase: 'fly' }),

  finish: () => {
    lastRequest = null;
    set({
      phase: 'idle',
      candidates: [],
      chosen: 0,
      photoUri: undefined,
      transcript: '',
      missCode: undefined,
      demo: false,
    });
  },
}));

type Setter = (partial: Partial<CaptureState>) => void;
type Getter = () => CaptureState;

async function resolve(request: MatchRequest, set: Setter, get: Getter) {
  const outcome = await matchProduct(request);

  // A cancel mid-flight wins — don't yank the user back into a reveal.
  if (get().phase !== 'magic') return;

  if (outcome.ok) {
    set({
      candidates: outcome.candidates,
      demo: outcome.demo,
      checkedAt: new Date().toISOString(),
      phase: 'found',
    });
  } else {
    set({ candidates: [], missCode: outcome.code, phase: 'miss' });
  }
}

/** The match currently on the found card. */
export const selectMatch = (s: CaptureState): ProductMatch | undefined =>
  s.candidates[s.chosen] ?? s.candidates[0];

export const isBusy = (phase: CapturePhase) => BUSY_PHASES.includes(phase);

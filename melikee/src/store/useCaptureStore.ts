import { create } from 'zustand';

import { matchProduct } from '@/services/productMatch';
import { motion } from '@/theme/tokens';
import type { CaptureMode, ProductMatch } from '@/store/types';

/**
 * The capture state machine.
 *
 * idle → snap (flash) → magic → found → fly → (filing tray)
 *                          ↘ alts ↗
 *
 * It lives in its own store because two components drive it: the camera screen
 * owns the viewfinder and the reveal, while the dock's centre shutter is the
 * thing you actually press.
 */
export type CapturePhase = 'idle' | 'snap' | 'magic' | 'found' | 'alts' | 'fly';

/** Phases where the reveal owns the screen and the dock steps aside. */
export const BUSY_PHASES: CapturePhase[] = ['snap', 'magic', 'found', 'alts', 'fly'];

type CaptureState = {
  phase: CapturePhase;
  mode: CaptureMode;
  candidates: ProductMatch[];
  /** Which candidate the found card is currently showing. */
  chosen: number;
  /** The photo this capture produced, when there was one. */
  photoUri?: string;
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

  showAlternates: () => void;
  chooseAlternate: (index: number) => void;
  /** Back to the viewfinder, discarding the match. */
  cancel: () => void;
  /** The claim: play the flight, then hand off to the filing tray. */
  claim: () => void;
  finish: () => void;
};

type BeginInput =
  | { mode: 'snap'; photoUri?: string }
  | { mode: 'scan'; upc: string }
  | { mode: 'say'; transcript: string };

export const useCaptureStore = create<CaptureState>((set, get) => ({
  phase: 'idle',
  mode: 'snap',
  candidates: [],
  chosen: 0,
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

    set({ phase: 'magic' });

    const candidates = await matchProduct(
      input.mode === 'scan'
        ? { mode: 'scan', upc: input.upc }
        : input.mode === 'say'
          ? { mode: 'say', transcript: input.transcript }
          : { mode: 'snap', photoUri: input.photoUri },
    );

    // A cancel mid-flight wins — don't yank the user back into a reveal.
    if (get().phase !== 'magic') return;
    set({ candidates, phase: 'found' });
  },

  showAlternates: () => set({ phase: 'alts' }),
  chooseAlternate: (chosen) => set({ chosen, phase: 'found' }),

  cancel: () =>
    set({ phase: 'idle', candidates: [], chosen: 0, photoUri: undefined, transcript: '' }),

  claim: () => set({ phase: 'fly' }),

  finish: () =>
    set({ phase: 'idle', candidates: [], chosen: 0, photoUri: undefined, transcript: '' }),
}));

/** The match currently on the found card. */
export const selectMatch = (s: CaptureState): ProductMatch | undefined =>
  s.candidates[s.chosen] ?? s.candidates[0];

export const isBusy = (phase: CapturePhase) => BUSY_PHASES.includes(phase);

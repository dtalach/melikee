import { create } from 'zustand';

import { readPhoto } from '@/services/productMatch';
import { resolveInBackground } from '@/services/pricing';
import { useAppStore } from '@/store/useAppStore';
import type { CaptureSeed } from '@/store/useAppStore';
import type {
  ProductReading,
  RecognizeErrorCode,
  RecognizeImage,
} from '@/services/recognition/contract';
import { motion } from '@/theme/tokens';
import type { CaptureMode } from '@/store/types';

/**
 * The capture state machine.
 *
 * idle → snap (flash) → magic → caught → fly → (filing tray)
 *                          ↘ miss
 *
 * **One tap.** Pressing the shutter is the claim; there is no second press to
 * confirm it. The capture ends as soon as we have something that identifies
 * what was wanted — a photo that has been read, a barcode's digits, or the
 * words someone said — and the shiny is filed there and then. What it costs
 * and who sells it is an errand that finishes half a minute later, against an
 * item already sitting on a list.
 *
 * `caught` is a beat, not a question. It shows what we got, holds long enough
 * to read, then flies into the shutter. Everything it might have asked —
 * wrong product, wrong variant, a better near match — is answerable later on
 * the item itself, where there is room and nobody is standing in a shop.
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
export type CapturePhase = 'idle' | 'snap' | 'magic' | 'caught' | 'fly' | 'miss';

/** Phases where the reveal owns the screen and the dock steps aside. */
export const BUSY_PHASES: CapturePhase[] = ['snap', 'magic', 'caught', 'fly', 'miss'];

/** How long the caught card holds before it flies — long enough to read. */
const CAUGHT_BEAT = 1500;

type CaptureState = {
  phase: CapturePhase;
  mode: CaptureMode;
  /** The photo this capture produced, when there was one. */
  photoUri?: string;
  /** Why the lookup came back empty, in the `miss` phase. */
  missCode?: RecognizeErrorCode;
  /** What actually broke, when the cause was a fault rather than a miss. */
  missDetail?: string;
  /** What the eye read, once it has. Shown on the wait and on the caught card. */
  reading?: ProductReading;
  /** What was caught, in the words the caught card shows. */
  caught?: { title: string; note?: string };
  /** The shiny this capture filed, so the tray can be raised once it lands. */
  caughtItemId?: string;
  /** Live dictation, in Say-it mode. */
  transcript: string;
  listening: boolean;
  /** Set when the hardware or a permission got in the way. */
  error?: string;

  setMode: (mode: CaptureMode) => void;
  setTranscript: (transcript: string) => void;
  setListening: (listening: boolean) => void;
  setError: (error?: string) => void;

  /** Start a capture. One tap: this files the shiny and plays the reward. */
  begin: (input: BeginInput) => Promise<void>;
  /** Run the same capture again after a miss. */
  retry: () => Promise<void>;

  /** Back to the viewfinder, discarding the capture. */
  cancel: () => void;
  finish: () => void;
};

type BeginInput =
  | { mode: 'snap'; photoUri?: string; image?: RecognizeImage }
  | { mode: 'scan'; upc: string }
  | { mode: 'say'; transcript: string };

/**
 * The capture in flight, kept outside the store because nothing renders it —
 * it exists so "try again" after a miss can mean the same capture rather than
 * making someone re-photograph what they are still holding.
 */
let lastInput: BeginInput | null = null;

export const useCaptureStore = create<CaptureState>((set, get) => ({
  phase: 'idle',
  mode: 'snap',
  transcript: '',
  listening: false,

  setMode: (mode) => set({ mode, transcript: '', error: undefined }),
  setTranscript: (transcript) => set({ transcript }),
  setListening: (listening) => set({ listening }),
  setError: (error) => set({ error }),

  begin: async (input) => {
    if (get().phase !== 'idle') return;

    // Whatever the last capture was still offering to undo, this one supersedes.
    useAppStore.getState().dismissFiling();

    // Only a photo capture earns the flash — it's a camera affordance, not a
    // loading state.
    if (input.mode === 'snap') {
      set({ phase: 'snap', mode: 'snap', photoUri: input.photoUri, error: undefined });
      await new Promise((resolve) => setTimeout(resolve, motion.flash));
    } else {
      set({ phase: 'magic', mode: input.mode, photoUri: undefined, error: undefined });
    }

    set({
      phase: 'magic',
      missCode: undefined,
      missDetail: undefined,
      reading: undefined,
      caught: undefined,
      caughtItemId: undefined,
    });

    lastInput = input;
    await identify(input, set, get);
  },

  retry: async () => {
    if (!lastInput) return set({ phase: 'idle' });
    set({ phase: 'magic', missCode: undefined, missDetail: undefined });
    await identify(lastInput, set, get);
  },

  cancel: () => {
    lastInput = null;
    set(RESET);
  },

  finish: () => {
    // The card has landed in the shutter; now the tray can have the screen.
    const { caughtItemId } = get();
    if (caughtItemId) useAppStore.getState().openFiling(caughtItemId);
    lastInput = null;
    set(RESET);
  },
}));

const RESET = {
  phase: 'idle' as const,
  photoUri: undefined,
  transcript: '',
  missCode: undefined,
  missDetail: undefined,
  reading: undefined,
  caught: undefined,
  caughtItemId: undefined,
};

type Setter = (partial: Partial<CaptureState>) => void;
type Getter = () => CaptureState;

/**
 * Work out what was wanted, file it, and play the reward.
 *
 * Only a photo needs asking: the eye has to read it before there is a name to
 * show. A barcode's digits and a spoken sentence identify themselves, so those
 * are filed on the spot and the shops name them properly later.
 */
async function identify(input: BeginInput, set: Setter, get: Getter) {
  let seed: CaptureSeed;

  if (input.mode === 'snap') {
    const read = await readPhoto(input.image);

    // A cancel mid-flight wins — don't yank the user back into a reveal.
    if (get().phase !== 'magic') return;

    if (read && !read.ok) {
      useAppStore.getState().recordLookup({
        at: new Date().toISOString(),
        mode: 'snap',
        error: { code: read.code, message: read.message },
      });
      set({ missCode: read.code, missDetail: read.message, phase: 'miss' });
      return;
    }

    if (!read?.ok) {
      // No service to ask and no reading to show: the demo path, which still
      // has to end somewhere. It ends honestly, on the miss screen.
      set({ missCode: 'not_configured', missDetail: undefined, phase: 'miss' });
      return;
    }

    useAppStore.getState().recordLookup({
      at: new Date().toISOString(),
      mode: 'snap',
      reading: read.reading,
      readMs: read.readMs,
    });
    set({ reading: read.reading });
    seed = { mode: 'snap', reading: read.reading, photoUri: input.photoUri };
  } else if (input.mode === 'scan') {
    seed = { mode: 'scan', upc: input.upc };
  } else {
    seed = { mode: 'say', transcript: input.transcript };
  }

  if (get().phase !== 'magic') return;

  // One tap. The shutter press was the claim; this is where it becomes a
  // shiny, without asking anyone to press anything a second time.
  const id = useAppStore.getState().addCapture(seed);
  resolveInBackground(id, seed);

  set({ caught: caughtCopy(seed), caughtItemId: id, phase: 'caught' });

  // A beat to read it by, then the flight into the shutter.
  await new Promise((resolve) => setTimeout(resolve, CAUGHT_BEAT));
  if (get().phase === 'caught') set({ phase: 'fly' });
}

/** What the caught card says it got, in the language of how it was got. */
function caughtCopy(seed: CaptureSeed): { title: string; note?: string } {
  if (seed.mode === 'scan') return { title: 'Got the barcode', note: seed.upc };
  if (seed.mode === 'say') return { title: 'Got it', note: `“${seed.transcript.trim()}”` };

  const { reading } = seed;
  const named = [reading.brand, reading.productName].filter(Boolean).join(' ').trim();
  return {
    title: named || reading.category || 'Something shiny',
    note: reading.variant || undefined,
  };
}

export const isBusy = (phase: CapturePhase) => BUSY_PHASES.includes(phase);

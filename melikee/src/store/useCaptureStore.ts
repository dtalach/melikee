import { create } from 'zustand';

import { identifyCapture } from '@/services/productMatch';
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
 * All three ways in get the same quick identity pass, because a barcode's
 * digits and a half-heard sentence are both worse names than the product
 * actually has. A photo is read; a barcode gets one search; spoken words are
 * turned into a proper product name. None of them waits on a price.
 */
async function identify(input: BeginInput, set: Setter, get: Getter) {
  const read = await identifyCapture(
    input.mode === 'snap'
      ? { mode: 'snap', image: input.image }
      : input.mode === 'scan'
        ? { mode: 'scan', upc: input.upc }
        : { mode: 'say', transcript: input.transcript },
  );

  // A cancel mid-flight wins — don't yank the user back into a reveal.
  if (get().phase !== 'magic') return;

  if (read && !read.ok) {
    useAppStore.getState().recordLookup({
      at: new Date().toISOString(),
      mode: input.mode,
      error: { code: read.code, message: read.message },
    });
    set({ missCode: read.code, missDetail: read.message, phase: 'miss' });
    return;
  }

  // A photo with no reading has nothing to show and nothing to search — it
  // ends honestly on the miss screen. A barcode or a sentence still has the
  // user's own input to wear, so those carry on unnamed rather than failing.
  if (!read?.ok && input.mode === 'snap') {
    set({ missCode: 'not_configured', missDetail: undefined, phase: 'miss' });
    return;
  }

  if (read?.ok) {
    useAppStore.getState().recordLookup({
      at: new Date().toISOString(),
      mode: input.mode,
      reading: read.reading,
      readMs: read.readMs,
    });
    set({ reading: read.reading });
  }

  const reading = read?.ok ? read.reading : undefined;
  const seed: CaptureSeed =
    input.mode === 'snap'
      ? { mode: 'snap', reading: reading!, photoUri: input.photoUri }
      : input.mode === 'scan'
        ? { mode: 'scan', upc: input.upc, reading }
        : { mode: 'say', transcript: input.transcript, reading };

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

/**
 * What the caught card says it got.
 *
 * The product's own name when we have it, whichever way it was captured — and
 * the note underneath keeps the user's own input in view, so a scan still
 * shows its digits and a spoken want still shows the words that were said.
 */
function caughtCopy(seed: CaptureSeed): { title: string; note?: string } {
  const { reading } = seed;
  const named = reading
    ? [reading.brand, reading.productName].filter(Boolean).join(' ').trim() || reading.category
    : '';

  const ownWords =
    seed.mode === 'scan'
      ? seed.upc
      : seed.mode === 'say'
        ? `“${seed.transcript.trim()}”`
        : reading?.variant;

  if (named) return { title: named, note: [reading?.variant, ownWords].filter(Boolean)[0] };

  // Naming failed or there was nothing to ask. What the user did is still true.
  if (seed.mode === 'scan') return { title: 'Got the barcode', note: seed.upc };
  if (seed.mode === 'say') return { title: 'Got it', note: `“${seed.transcript.trim()}”` };
  return { title: 'Something shiny' };
}

export const isBusy = (phase: CapturePhase) => BUSY_PHASES.includes(phase);

/**
 * A door for the smoke test, which drives a real browser with a synthetic
 * camera — and a synthetic camera has no barcode to scan and no microphone to
 * speak into. Without this, two of the three ways into the app could only ever
 * be checked by hand on a phone.
 */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__melikeeCapture = {
    begin: (input: BeginInput) => void useCaptureStore.getState().begin(input),
  };
}

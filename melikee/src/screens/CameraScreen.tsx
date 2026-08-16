/**
 * The camera screen — the app opens here, camera-first.
 *
 * It carries the whole capture ritual: the viewfinder and its three modes,
 * the flash, "Working our magic…", the found-card reveal, near-match recovery,
 * the graceful save-my-photo fallback, and the flight into the shutter. The
 * dock steps aside for the whole flow so the reveal gets the full screen.
 */
import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTopInset } from '@/hooks/useTopInset';

import { CaptureModeBar } from '@/screens/camera/CaptureModeBar';
import { CaughtCard } from '@/screens/camera/CaughtCard';
import { MissCard } from '@/screens/camera/MissCard';
import { WorkingOurMagic } from '@/screens/camera/WorkingOurMagic';
import { Waveform } from '@/screens/camera/Waveform';
import { useDictation } from '@/hooks/useDictation';
import { setShutterHandler } from '@/services/captureBridge';
import { captureHint } from '@/services/productMatch';
import { preparePhoto } from '@/services/photo';
import { useCameraAccess } from '@/hooks/useCameraAccess';
import { BellIcon, CloseIcon, GiftIcon, ViewfinderBrackets } from '@/ui/icons';
import { SlapIn, SnapFlash, SparkleBurst } from '@/ui/motion';
import { AppText, Button, GlowGround, Squish, Sticker } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { attentionCount, useAppStore } from '@/store/useAppStore';
import { daysUntilBirthday } from '@/store/profile';
import { isBusy, useCaptureStore } from '@/store/useCaptureStore';

/**
 * Polls a ref rather than awaiting an event, because the readiness callback
 * may already have fired before anyone pressed anything. Gives up after a few
 * seconds so a camera that never starts doesn't hang the shutter.
 */
async function waitForCamera(ready: { current: boolean }, timeoutMs = 3000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!ready.current && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return ready.current;
}

export function CameraScreen({
  active,
  onOpenFeed,
  onOpenMe,
}: {
  active: boolean;
  onOpenFeed: () => void;
  onOpenMe: () => void;
}) {
  const theme = useTheme();
  const topInset = useTopInset();
  const cameraRef = useRef<CameraView>(null);
  // Arriving here *is* the request — the app opens shooting, so a viewfinder
  // waiting behind a button is the app not working.
  const { requestPermission, granted, canAsk, pending } = useCameraAccess();
  // The shutter's handler is held by the dock, so it has to read a live value
  // rather than one closed over at registration time.
  const grantedRef = useRef(granted);
  useEffect(() => {
    grantedRef.current = granted;
  }, [granted]);

  // Permission granted is not the same as camera running. On iOS the stream
  // takes a beat to start, and a shutter press in that gap used to produce a
  // photo-less capture — which the matcher then answered with a demo product
  // nobody had photographed.
  const readyRef = useRef(false);
  const onCameraReady = useCallback(() => {
    readyRef.current = true;
  }, []);
  useEffect(() => {
    if (!granted) readyRef.current = false;
  }, [granted]);

  const phase = useCaptureStore((s) => s.phase);
  const mode = useCaptureStore((s) => s.mode);
  const listening = useCaptureStore((s) => s.listening);
  const transcript = useCaptureStore((s) => s.transcript);
  const error = useCaptureStore((s) => s.error);
  const reading = useCaptureStore((s) => s.reading);
  const caught = useCaptureStore((s) => s.caught);
  const missCode = useCaptureStore((s) => s.missCode);
  const missDetail = useCaptureStore((s) => s.missDetail);
  const begin = useCaptureStore((s) => s.begin);
  const retry = useCaptureStore((s) => s.retry);
  const cancel = useCaptureStore((s) => s.cancel);
  const finish = useCaptureStore((s) => s.finish);

  const firstRun = useAppStore((s) => s.firstRun);
  const profile = useAppStore((s) => s.profile);
  const waiting = useAppStore(attentionCount);
  const daysToBirthday = daysUntilBirthday(profile);
  const savePendingPhoto = useAppStore((s) => s.savePendingPhoto);
  const showToast = useAppStore((s) => s.showToast);

  /** The most recent barcode the viewfinder saw, for a shutter press in Scan. */
  const lastBarcode = useRef<string | null>(null);

  const dictation = useDictation({
    onFinal: (finalTranscript) => {
      void begin({ mode: 'say', transcript: finalTranscript });
    },
  });

  const busy = isBusy(phase);
  const idle = phase === 'idle';

  // ── Firing ───────────────────────────────────────────────────────────────

  const fire = useCallback(async () => {
    if (useCaptureStore.getState().phase !== 'idle') return;
    const currentMode = useCaptureStore.getState().mode;

    // The shutter is the clearest statement of intent in the app, and on the
    // web it is also the user gesture Safari requires before it will show a
    // camera prompt at all. So pressing it asks.
    if (!grantedRef.current && currentMode !== 'say') {
      const response = await requestPermission().catch(() => null);
      if (!response?.granted) {
        showToast('MeLikee needs the camera for that');
        return;
      }
    }

    // Granted, but the stream may still be starting. Wait for the viewfinder
    // to say it is running rather than photographing nothing — a press that
    // does nothing is recoverable, and a wish nobody made is not.
    if (currentMode !== 'say' && !readyRef.current) {
      const ready = await waitForCamera(readyRef);
      if (!ready) {
        showToast('One sec — the camera’s still waking up');
        return;
      }
    }

    if (currentMode === 'say') {
      if (useCaptureStore.getState().listening) dictation.stop();
      else await dictation.start();
      return;
    }

    if (currentMode === 'scan') {
      const upc = lastBarcode.current;
      if (!upc) {
        showToast('Line a barcode up in the frame');
        return;
      }
      await begin({ mode: 'scan', upc });
      return;
    }

    // `skipProcessing` is gone on purpose. It was there for speed, but it also
    // skips the orientation fix, and a sideways photo is a photo Claude has to
    // read sideways — the model number on the box is the whole match.
    let prepared: Awaited<ReturnType<typeof preparePhoto>> = {};
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      prepared = await preparePhoto(photo);
    } catch {
      prepared = {};
    }

    // No frame, no capture. This used to fall through and be answered with a
    // scripted product, which put a wishlist item on screen that nobody had
    // photographed — a far worse outcome than a press that politely fails.
    if (!prepared.uri && !prepared.image) {
      showToast('That didn’t come through — try again');
      return;
    }

    await begin({ mode: 'snap', photoUri: prepared.uri, image: prepared.image });
  }, [begin, dictation, showToast, requestPermission]);

  // While this screen is on top, the dock's shutter fires a capture.
  useEffect(() => {
    if (!active) return;
    setShutterHandler(() => {
      void fire();
    });
    return () => setShutterHandler(null);
  }, [active, fire]);

  // Leaving the camera mid-flow abandons the capture rather than freezing it.
  useEffect(() => {
    if (!active && useCaptureStore.getState().phase !== 'idle') cancel();
  }, [active, cancel]);

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      lastBarcode.current = result.data;
      // In Scan mode a detected barcode *is* the capture — no press needed.
      if (useCaptureStore.getState().mode === 'scan' && useCaptureStore.getState().phase === 'idle') {
        void begin({ mode: 'scan', upc: result.data });
      }
    },
    [begin],
  );

  // ── Outcomes ─────────────────────────────────────────────────────────────
  //
  // There is no "want it" handler any more. The capture store files the shiny
  // itself the moment it knows what was wanted, because the shutter press was
  // already the claim. All that is left here is the miss.

  const saveForLater = () => {
    savePendingPhoto(useCaptureStore.getState().photoUri);
    finish();
  };

  // ── Chrome ───────────────────────────────────────────────────────────────


  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* The viewfinder. Falls back to the glow ground when there's no camera
          — the screen still has to be usable and on-brand without one. */}
      {granted ? (
        <CameraView
          ref={cameraRef}
          onCameraReady={onCameraReady}
          style={StyleSheet.absoluteFill}
          facing="back"
          active={active && phase !== 'fly'}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
          }}
          onBarcodeScanned={mode === 'scan' || idle ? onBarcodeScanned : undefined}
        />
      ) : (
        <GlowGround style={StyleSheet.absoluteFill} edge="deep" />
      )}

      {/* A scrim so the app's own type stays legible over any scene. */}
      {granted ? (
        <View
          style={[
            { position: 'absolute' as const, inset: 0 },
            { backgroundColor: theme.isDark ? 'rgba(13,10,22,0.42)' : 'rgba(13,10,22,0.25)' },
          ]}
          pointerEvents="none"
        />
      ) : null}

      <View style={{ position: 'absolute', inset: 20 }} pointerEvents="none">
        <ViewfinderBrackets color={theme.violet} />
      </View>

      {/* Top chrome — steps aside during the capture flow. */}
      {!busy ? (
        <View
          style={{
            position: 'absolute',
            top: topInset + 14,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Without a birthday there is no countdown to make — the pill
              becomes the way to go and set one. */}
          <Squish onPress={onOpenMe}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: theme.cardTranslucent,
                borderWidth: 1.5,
                borderColor: 'rgba(255,93,162,0.4)',
                borderRadius: layout.radius.pill,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <GiftIcon size={15} color={brand.pink} />
              <AppText style={{ fontSize: 12, fontWeight: '700' }}>
                {daysToBirthday === undefined
                  ? 'Add your birthday'
                  : daysToBirthday === 0
                    ? 'Happy birthday!'
                    : `${daysToBirthday} days till your birthday`}
              </AppText>
            </View>
          </Squish>

          <View style={{ flex: 1 }} />

          <Squish onPress={onOpenFeed}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: theme.card,
                borderWidth: 1.5,
                borderColor: theme.violet66,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BellIcon size={16} color={theme.text} />
              {waiting > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: brand.pink,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <AppText style={{ fontSize: 9.5, fontWeight: '700', color: brand.pinkInk }}>
                    {waiting}
                  </AppText>
                </View>
              ) : null}
            </View>
          </Squish>
        </View>
      ) : null}

      {/* The escape hatch, for the one phase that still waits on a person. */}
      {phase === 'miss' ? (
        <Squish
          onPress={cancel}
          style={{ position: 'absolute', top: topInset + 14, left: 16, zIndex: 3 }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: theme.cardTranslucent,
              borderWidth: 1.5,
              borderColor: theme.violet66,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon size={14} color={theme.muted} />
          </View>
        </Squish>
      ) : null}

      {/* Idle: the greeting, the promise, and the mode you're in. */}
      {idle ? (
        <View
          style={{
            position: 'absolute',
            top: '26%',
            left: 0,
            right: 0,
            alignItems: 'center',
            gap: 6,
          }}
          pointerEvents="none"
        >
          <AppText glow style={{ fontSize: 32, fontWeight: '800', letterSpacing: -0.96 }}>
            Ooh. Shiny.
          </AppText>
          <AppText tone="soft" style={{ fontSize: 13, fontWeight: '600' }}>
            {error ?? captureHint(mode)}
          </AppText>
          {firstRun ? (
            <SlapIn>
              <Sticker>YOUR WISHLIST WRITES ITSELF</Sticker>
            </SlapIn>
          ) : null}
        </View>
      ) : null}

      {/* Say-it: the live transcript, driven by real dictation. */}
      {idle && mode === 'say' ? (
        <View
          style={{ position: 'absolute', top: '52%', left: 0, right: 0, alignItems: 'center', gap: 8 }}
          pointerEvents="none"
        >
          <Waveform active={listening} level={dictation.level} />
          <AppText
            tone="soft"
            style={{ fontSize: 13, maxWidth: 250, textAlign: 'center' }}
          >
            {transcript
              ? `“${transcript}”`
              : listening
                ? 'Listening…'
                : 'Tap the button and say what you want'}
          </AppText>
        </View>
      ) : null}

      {/* The permission was already asked for on arrival. This is what's left
          when the answer was no, or the dialog was dismissed — so it leads with
          the reason, and the way back in is a button that looks like one. */}
      {!granted && !pending && idle ? (
        <View
          style={{
            position: 'absolute',
            left: 34,
            right: 34,
            bottom: 190,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AppText tone="muted" style={{ fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            {canAsk
              ? 'MeLikee needs the camera to see what you see.'
              : 'Camera access is off — turn it on in Settings to snap and scan.'}
          </AppText>
          {canAsk ? (
            <Button
              label="Turn on the camera"
              size="md"
              onPress={() => void requestPermission().catch(() => undefined)}
            />
          ) : null}
        </View>
      ) : null}

      {phase === 'snap' ? <SnapFlash /> : null}
      {phase === 'magic' ? <WorkingOurMagic mode={mode} /> : null}

      {(phase === 'caught' || phase === 'fly') && caught ? (
        <CaughtCard
          title={caught.title}
          note={caught.note}
          reading={reading}
          photoUri={useCaptureStore.getState().photoUri}
          flying={phase === 'fly'}
          onFlightDone={finish}
        />
      ) : null}

      {phase === 'miss' && missCode ? (
        <MissCard
          code={missCode}
          detail={missDetail}
          mode={mode}
          photoUri={useCaptureStore.getState().photoUri}
          onRetry={() => void retry()}
          onSaveForLater={saveForLater}
          onDismiss={cancel}
        />
      ) : null}

      {/* The sparkle burst lands where the shutter sits. */}
      {phase === 'fly' ? (
        <SparkleBurst style={{ left: '50%', bottom: 36 }} />
      ) : null}

      {/* Mode selector — plain text labels, so the dock stays the only lozenge. */}
      {idle ? <CaptureModeBar /> : null}
    </View>
  );
}

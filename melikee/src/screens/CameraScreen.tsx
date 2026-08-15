/**
 * The camera screen — the app opens here, camera-first.
 *
 * It carries the whole capture ritual: the viewfinder and its three modes,
 * the flash, "Working our magic…", the found-card reveal, near-match recovery,
 * the graceful save-my-photo fallback, and the flight into the shutter. The
 * dock steps aside for the whole flow so the reveal gets the full screen.
 */
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureModeBar } from '@/screens/camera/CaptureModeBar';
import { FoundCard } from '@/screens/camera/FoundCard';
import { NearMatches } from '@/screens/camera/NearMatches';
import { WorkingOurMagic } from '@/screens/camera/WorkingOurMagic';
import { Waveform } from '@/screens/camera/Waveform';
import { useDictation } from '@/hooks/useDictation';
import { setShutterHandler } from '@/services/captureBridge';
import { captureHint } from '@/services/productMatch';
import { BellIcon, CloseIcon, GiftIcon, ViewfinderBrackets } from '@/ui/icons';
import { SlapIn, SnapFlash, SparkleBurst } from '@/ui/motion';
import { AppText, GlowGround, Squish, Sticker } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { meProfile, useAppStore } from '@/store/useAppStore';
import { isBusy, selectMatch, useCaptureStore } from '@/store/useCaptureStore';

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
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const phase = useCaptureStore((s) => s.phase);
  const mode = useCaptureStore((s) => s.mode);
  const listening = useCaptureStore((s) => s.listening);
  const transcript = useCaptureStore((s) => s.transcript);
  const error = useCaptureStore((s) => s.error);
  const match = useCaptureStore(selectMatch);
  const begin = useCaptureStore((s) => s.begin);
  const cancel = useCaptureStore((s) => s.cancel);
  const claim = useCaptureStore((s) => s.claim);
  const finish = useCaptureStore((s) => s.finish);
  const showAlternates = useCaptureStore((s) => s.showAlternates);

  const firstRun = useAppStore((s) => s.firstRun);
  const addShiny = useAppStore((s) => s.addShiny);
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

    let photoUri: string | undefined;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6, skipProcessing: true });
      photoUri = photo?.uri;
    } catch {
      // No camera (simulator, denied permission, web without a device): the
      // ritual still runs — losing the wish would be the worse failure.
      photoUri = undefined;
    }
    await begin({ mode: 'snap', photoUri });
  }, [begin, dictation, showToast]);

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

  const wantIt = () => {
    if (!match) return;
    addShiny(match, {
      photoUri: useCaptureStore.getState().photoUri,
      provenance:
        mode === 'scan' ? 'scanned · just now' : mode === 'say' ? 'dictated · just now' : 'by camera · just now',
    });
    claim();
  };

  const saveForLater = () => {
    savePendingPhoto(useCaptureStore.getState().photoUri);
    finish();
  };

  // ── Chrome ───────────────────────────────────────────────────────────────

  const granted = permission?.granted ?? false;
  const canAsk = permission?.canAskAgain ?? true;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* The viewfinder. Falls back to the glow ground when there's no camera
          — the screen still has to be usable and on-brand without one. */}
      {granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          active={active && phase !== 'fly'}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
          }}
          onBarcodeScanned={mode === 'scan' || idle ? onBarcodeScanned : undefined}
        />
      ) : (
        <GlowGround style={StyleSheet.absoluteFill} />
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
        <ViewfinderBrackets width="100%" height="100%" color={theme.violet} />
      </View>

      {/* Top chrome — steps aside during the capture flow. */}
      {!busy ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 14,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
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
                {meProfile.daysToBirthday} days till your birthday
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
                  3
                </AppText>
              </View>
            </View>
          </Squish>
        </View>
      ) : null}

      {/* The escape hatch during a reveal. */}
      {phase === 'found' || phase === 'alts' ? (
        <Squish
          onPress={cancel}
          style={{ position: 'absolute', top: insets.top + 14, left: 16, zIndex: 3 }}
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

      {/* Permission prompt, in the app's own voice. */}
      {!granted && idle ? (
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
            <Pressable onPress={requestPermission}>
              <Sticker tone="lime" rotate={-1.5}>
                TURN ON THE CAMERA
              </Sticker>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {phase === 'snap' ? <SnapFlash /> : null}
      {phase === 'magic' ? <WorkingOurMagic mode={mode} /> : null}

      {(phase === 'found' || phase === 'fly') && match ? (
        <FoundCard
          match={match}
          mode={mode}
          flying={phase === 'fly'}
          photoUri={useCaptureStore.getState().photoUri}
          onWantIt={wantIt}
          onSeeAlternates={showAlternates}
          onFlightDone={finish}
        />
      ) : null}

      {phase === 'alts' ? <NearMatches onSaveForLater={saveForLater} /> : null}

      {/* The sparkle burst lands where the shutter sits. */}
      {phase === 'fly' ? (
        <SparkleBurst style={{ left: '50%', bottom: 36 }} />
      ) : null}

      {/* Mode selector — plain text labels, so the dock stays the only lozenge. */}
      {idle ? <CaptureModeBar /> : null}
    </View>
  );
}

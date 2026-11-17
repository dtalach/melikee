/**
 * Full-screen camera (Camera Options 1b): opened from the dock, no dock and no
 * top chrome, ✕ returns to wherever you came from.
 *
 * Modes: Scan (captures as soon as it reads a barcode; shutter dims; torch
 * appears), Snap (tap), Say (hold the shutter, let go to search). Swipe across
 * the screen to switch. Every capture is matched for real by /api/match.
 */
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { hostOf, isExact, matchBadge } from '@/lib/match';
import { preparePhoto } from '@/lib/photo';
import { listAccent, listById, useApp, type CaptureMode } from '@/store/useApp';
import { brand, font, palette } from '@/theme/tokens';
import { Close, Photos, Sparkle, Torch } from '@/ui/icons';
import { Appear, Burst, Flash, SheetOut, Shimmer, Slap, Spin, Twinkle } from '@/ui/motion';
import { AccentButton, ChipButton, GhostButton, LimeButton, LimeFill, PhotoBox, RadialGround, T, Tap } from '@/ui/primitives';

const MODES: CaptureMode[] = ['scan', 'snap', 'say'];
const native = Platform.OS !== 'web';
const BARCODES = ['upc_a', 'upc_e', 'ean13', 'ean8'] as const;

export function Camera() {
  const c = useApp((s) => s.capture);
  const firstRun = useApp((s) => s.firstRun);
  const setCapture = useApp((s) => s.setCapture);
  const runCapture = useApp((s) => s.runCapture);
  const closeCamera = useApp((s) => s.closeCamera);
  const showToast = useApp((s) => s.showToast);

  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const asked = useRef(false);
  useEffect(() => {
    // Native can ask on arrival. The web only allows it inside a tap.
    if (!native || asked.current || !permission || permission.granted || !permission.canAskAgain) return;
    asked.current = true;
    requestPermission().catch(() => undefined);
  }, [permission, requestPermission]);
  const live = !!permission?.granted;
  const denied = !!permission && !permission.granted && (!permission.canAskAgain || permission.status === 'denied');
  const ensureCamera = () => {
    if (!native && permission && !permission.granted && permission.canAskAgain) requestPermission().catch(() => undefined);
  };

  // A link on the clipboard offers itself (only when one is actually there).
  const [clip, setClip] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        if (!(await Clipboard.hasStringAsync())) return;
        const text = (await Clipboard.getStringAsync()).trim();
        if (on && /^https?:\/\/\S+$/i.test(text)) setClip(text);
      } catch {
        // Clipboard can be unavailable (web without permission): no chip then.
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const [torch, setTorch] = useState(false);
  const idle = c.phase === 'idle';

  // ── Snap ──
  const snap = async () => {
    if (!idle) return;
    ensureCamera();
    if (!live || !cameraRef.current) {
      showToast(denied ? 'Camera’s off — type it or use a screenshot' : 'Allow the camera, then snap');
      if (denied) setCapture({ phase: 'type', typeQ: '' });
      return;
    }
    if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: !native });
      if (!shot) throw new Error('no photo');
      const prepared = await preparePhoto(shot);
      void runCapture({ source: 'photo', image: prepared.image, uri: prepared.uri, thumb: prepared.thumb });
    } catch {
      showToast(ready ? 'That photo didn’t take — try again' : 'Camera’s still starting — try again');
    }
  };

  // ── Screenshot / camera roll ──
  const fromRoll = async () => {
    if (!idle) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, base64: !native });
      const asset = res.canceled ? null : res.assets[0];
      if (!asset) return;
      const prepared = await preparePhoto({ uri: asset.uri, width: asset.width, height: asset.height, base64: asset.base64 });
      void runCapture({ source: 'screenshot', image: prepared.image, uri: prepared.uri, thumb: prepared.thumb });
    } catch {
      showToast('Couldn’t open your photos');
    }
  };

  // ── Scan ──
  const scanned = useRef(false);
  useEffect(() => {
    if (c.mode === 'scan' && idle) scanned.current = false;
  }, [c.mode, idle]);
  const onBarcode = (r: BarcodeScanningResult) => {
    const digits = r.data.replace(/\D/g, '');
    if (scanned.current || useApp.getState().capture.phase !== 'idle' || digits.length < 6) return;
    scanned.current = true;
    if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void runCapture({ source: 'barcode', upc: digits });
  };

  // ── Say: hold the shutter, let go to search ──
  const finalRef = useRef('');
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    finalRef.current = text;
    setCapture({ transcript: text });
  });
  useSpeechRecognitionEvent('end', () => {
    const st = useApp.getState().capture;
    setCapture({ listening: false });
    const said = finalRef.current.trim();
    finalRef.current = '';
    if (st.phase === 'idle' && st.mode === 'say' && said) void runCapture({ source: 'voice', query: said });
  });
  useSpeechRecognitionEvent('error', (e) => {
    setCapture({ listening: false });
    showToast(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'MeLikee needs the mic to hear you' : e.error === 'no-speech' ? 'Didn’t hear anything — hold and say it' : 'Couldn’t listen — try typing it');
  });
  const listen = async () => {
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        showToast('Voice isn’t available here — type it instead');
        setCapture({ phase: 'type', typeQ: '' });
        return;
      }
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        showToast('MeLikee needs the mic to hear you');
        return;
      }
      finalRef.current = '';
      setCapture({ listening: true, transcript: '' });
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    } catch {
      setCapture({ listening: false });
    }
  };
  const stopListening = () => {
    if (useApp.getState().capture.listening) ExpoSpeechRecognitionModule.stop();
  };

  const setMode = (m: CaptureMode) => {
    ensureCamera();
    setCapture({ mode: m });
  };

  // Swipe the screen to move between modes.
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30 && Math.abs(g.dy) < 30,
      onPanResponderRelease: (_, g) => {
        const st = useApp.getState().capture;
        if (st.phase !== 'idle' || Math.abs(g.dx) < 60) return;
        const i = MODES.indexOf(st.mode) + (g.dx < 0 ? 1 : -1);
        if (i >= 0 && i < MODES.length) useApp.getState().setCapture({ mode: MODES[i] });
      },
    }),
  );

  // Holding the shutter is Say: switch on press-and-hold, search on release.
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);
  const onPressIn = () => {
    holding.current = false;
    holdTimer.current = setTimeout(() => {
      holding.current = true;
      if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      setCapture({ mode: 'say' });
      void listen();
    }, c.mode === 'say' ? 0 : 450);
  };
  const onPressOut = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (holding.current) stopListening();
  };
  const onShutter = () => {
    if (holding.current) {
      holding.current = false;
      return;
    }
    if (c.mode === 'say') showToast('Hold the shutter and say what you want');
    else if (c.mode === 'snap') void snap();
  };

  const pasteClip = () => {
    const url = clip;
    setClip(null);
    if (url) void runCapture({ source: 'link', url });
    else setCapture({ phase: 'type', typeQ: '' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: brand.camBottom, overflow: 'hidden' }} {...pan.panHandlers}>
      <RadialGround inner={brand.camTop} outer={brand.camBottom} cy="35%" rx="70%" ry="65%" />
      {live && !denied ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setReady(true)}
          enableTorch={torch && c.mode === 'scan'}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODES] }}
          onBarcodeScanned={c.mode === 'scan' && idle ? onBarcode : undefined}
        />
      ) : null}

      {clip && idle && !denied ? (
        <View style={{ position: 'absolute', top: 66, left: 0, right: 0, alignItems: 'center', zIndex: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(20,16,31,0.7)', borderWidth: 1.5, borderColor: '#c8f54266', borderRadius: 999, paddingVertical: 5, paddingLeft: 14, paddingRight: 6 }}>
            <Tap onPress={pasteClip} style={{ flexShrink: 1 }}>
              <T size={12} w={600} color={brand.camText} numberOfLines={1}>
                Copied link · <T size={12} color={brand.camSoft}>{hostOf(clip).slice(0, 18)}…</T>
              </T>
            </Tap>
            <Tap onPress={pasteClip} style={{ backgroundColor: brand.lime, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 }}>
              <T size={11.5} w={800} color={brand.limeInk}>
                Add
              </T>
            </Tap>
            <Tap onPress={() => setClip(null)} accessibilityLabel="Dismiss" style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Close size={12} color={brand.camSoft} />
            </Tap>
          </View>
        </View>
      ) : null}

      {c.mode === 'scan' && idle && !denied ? (
        <Tap
          onPress={() => setTorch((t) => !t)}
          accessibilityRole="switch"
          accessibilityLabel="Flashlight"
          accessibilityState={{ checked: torch }}
          style={{ position: 'absolute', top: 70, right: 18, zIndex: 3, width: 44, height: 44, borderRadius: 22, backgroundColor: torch ? brand.lime : palette.card, alignItems: 'center', justifyContent: 'center' }}
        >
          <Torch color={torch ? brand.limeInk : palette.text} fill={torch ? brand.limeInk : 'none'} />
        </Tap>
      ) : null}

      {idle ? <IdleLayer mode={c.mode} firstRun={firstRun} denied={denied} live={live} onPaste={pasteClip} onRoll={fromRoll} /> : null}
      {c.phase === 'snap' ? <Flash /> : null}
      {c.phase === 'scan' ? <Matching /> : null}
      {c.phase === 'found' || c.phase === 'fly' ? <FoundSheet /> : null}
      {c.phase === 'fly' ? <FlyBurst /> : null}
      {c.phase === 'nomatch' ? <MissSheet /> : null}
      {c.phase === 'alts' ? <Alternates /> : null}
      {c.phase === 'type' ? <TypeIt /> : null}

      {c.phase === 'alts' || c.phase === 'type' || c.phase === 'scan' ? (
        <Tap
          onPress={useApp.getState().resetCapture}
          accessibilityLabel="Cancel"
          style={{ position: 'absolute', top: 70, left: 16, zIndex: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: palette.cardT, borderWidth: 1, borderColor: palette.vio44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Close size={14} strokeWidth={1.6} color={palette.muted} />
        </Tap>
      ) : null}

      {idle ? (
        <>
          <LinearGradient pointerEvents="none" colors={['rgba(10,8,16,0)', 'rgba(10,8,16,0.85)']} locations={[0, 0.45]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 240 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 40, zIndex: 4, alignItems: 'center', gap: 14 }}>
            {firstRun ? (
              <T size={12.5} w={600} color={brand.camSoft}>
                {c.mode === 'snap' ? 'Tap to snap · hold for voice · swipe for modes' : c.mode === 'scan' ? 'Point at any barcode' : 'Hold the shutter and say what you want'}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 22, alignItems: 'center' }}>
              {MODES.map((m) => (
                <Tap key={m} onPress={() => setMode(m)} accessibilityState={{ selected: c.mode === m }} style={{ paddingVertical: 10, paddingHorizontal: 2 }}>
                  <T size={12.5} w={800} color={c.mode === m ? palette.limeText : palette.muted} style={{ letterSpacing: 1.25, textTransform: 'uppercase' }}>
                    {m}
                  </T>
                </Tap>
              ))}
            </View>
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 34 }}>
              <Tap onPress={fromRoll} accessibilityLabel="Add from a screenshot">
                <LinearGradient colors={[palette.ph1, palette.ph2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 12, borderWidth: 2, borderColor: brand.camText, alignItems: 'center', justifyContent: 'center' }}>
                  <Photos color={brand.camText} />
                </LinearGradient>
              </Tap>
              <Pressable
                onPress={onShutter}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                accessibilityRole="button"
                accessibilityLabel={c.mode === 'say' ? 'Hold and say what you want' : 'Snap'}
                style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 3.5, borderColor: 'rgba(246,242,255,0.92)', alignItems: 'center', justifyContent: 'center', opacity: c.mode === 'scan' ? 0.45 : 1, transform: [{ scale: c.listening ? 1.08 : 1 }] }}
              >
                <LinearGradient
                  colors={[brand.limeTop, brand.lime, brand.limeDeep]}
                  locations={[0, 0.55, 1]}
                  start={{ x: 0.3, y: 0.25 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 64, height: 64, borderRadius: 32, boxShadow: `0 0 ${c.listening ? 40 : 26}px rgba(200,245,66,0.5)` }}
                />
              </Pressable>
              <Tap onPress={closeCamera} accessibilityLabel="Close camera" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(246,242,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Close color={brand.camText} />
              </Tap>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

function IdleLayer({ mode, firstRun, denied, live, onPaste, onRoll }: { mode: CaptureMode; firstRun: boolean; denied: boolean; live: boolean; onPaste: () => void; onRoll: () => void }) {
  const showToast = useApp((s) => s.showToast);
  const transcript = useApp((s) => s.capture.transcript);
  const listening = useApp((s) => s.capture.listening);
  return (
    <>
      {mode === 'scan' && !denied ? (
        <>
          <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '40%', width: 240, height: 120, marginLeft: -120, marginTop: -60, borderRadius: 14, borderWidth: 2, borderColor: brand.lime, boxShadow: '0 0 0 2000px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
            <Twinkle period={1200} style={{ position: 'absolute', left: 10, right: 10, top: 58 }}>
              <View style={{ height: 2, backgroundColor: brand.pink, boxShadow: `0 0 10px ${brand.pink}` }} />
            </Twinkle>
          </View>
          <T size={12.5} w={600} color={brand.camText} style={{ position: 'absolute', left: 0, right: 0, top: '49%', textAlign: 'center', marginTop: 16, textShadowColor: 'rgba(12,12,12,0.8)', textShadowRadius: 8 }}>
            {live ? 'Hold steady on the barcode' : 'Allow the camera to scan barcodes'}
          </T>
        </>
      ) : null}

      {denied ? (
        <View style={{ position: 'absolute', left: 28, right: 28, top: '22%', zIndex: 2, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio33, borderRadius: 18, padding: 18, gap: 10 }}>
          <T size={16} w={800} style={{ textAlign: 'center' }}>
            Camera’s off for MeLikee
          </T>
          <T size={12} color={palette.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
            No problem. Add from a screenshot or a link instead, or turn the camera on in Settings.
          </T>
          <LimeButton label="Use a screenshot" size={13} pad={11} onPress={onRoll} />
          <AccentButton label="Paste a link" size={13} pad={11} onPress={onPaste} />
          <Tap
            onPress={() => {
              if (native) Linking.openSettings().catch(() => undefined);
              else showToast('Turn the camera on in your browser’s site settings');
            }}
            style={{ alignItems: 'center', paddingVertical: 4 }}
          >
            <T size={12} w={700} color={palette.muted}>
              Open Settings
            </T>
          </Tap>
        </View>
      ) : null}

      {firstRun && !denied && mode !== 'say' ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '26%', alignItems: 'center', gap: 6 }}>
          <T size={32} w={800} color={brand.camText} style={{ letterSpacing: -0.96, textShadowColor: palette.glow50, textShadowRadius: 24, textShadowOffset: { width: 0, height: 4 } }}>
            Ooh. Shiny.
          </T>
          <Slap style={{ marginTop: 4 }}>
            <View style={{ backgroundColor: brand.lime, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 }}>
              <T size={11} w={800} color={brand.limeInk} style={{ letterSpacing: 0.66 }}>
                YOUR WISHLIST WRITES ITSELF
              </T>
            </View>
          </Slap>
        </View>
      ) : null}

      {mode === 'say' ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '52%', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 26, opacity: listening ? 1 : 0.4 }}>
            {[10, 22, 15, 24].map((h, i) =>
              listening ? (
                <Twinkle key={i} period={1000} delay={i * 150}>
                  <View style={{ width: 4, height: h, borderRadius: 2, backgroundColor: brand.lime }} />
                </Twinkle>
              ) : (
                <View key={i} style={{ width: 4, height: h, borderRadius: 2, backgroundColor: brand.lime }} />
              ),
            )}
          </View>
          <T size={13} w={600} color={palette.soft} style={{ maxWidth: 260, textAlign: 'center' }}>
            {transcript ? `“${transcript}”` : listening ? 'Listening…' : 'Hold the shutter and say what you want'}
          </T>
        </View>
      ) : null}
    </>
  );
}

function Matching() {
  const c = useApp((s) => s.capture);
  const [h, setH] = useState(800);
  const label = c.input?.source === 'voice' ? `“${c.input.query}”` : c.input?.source === 'link' ? hostOf(c.input.url) : c.input?.source === 'search' ? `“${c.input.query}”` : c.fromRoll ? 'your screenshot' : 'your shot';
  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <LinearGradient colors={[brand.shotTop, brand.shotBottom]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {c.shotUri ? (
          <PhotoBox uri={c.shotUri} fit="cover" label="" style={StyleSheet.absoluteFill} />
        ) : (
          <T size={11} color="#b8aec8" style={{ maxWidth: 260, textAlign: 'center' }}>
            {label}
          </T>
        )}
      </LinearGradient>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <Shimmer height={h}>
          <LinearGradient colors={['rgba(200,245,66,0)', 'rgba(200,245,66,0.28)', 'rgba(200,245,66,0)']} style={{ flex: 1 }} />
        </Shimmer>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 64, alignItems: 'center', paddingHorizontal: 24 }}>
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(20,16,31,0.75)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, maxWidth: '100%' }}>
          <Spin>
            <Sparkle size={13} color={brand.lime} />
          </Spin>
          <T size={12.5} w={600} color={brand.camText} numberOfLines={1} style={{ flexShrink: 1 }}>
            {c.note}
          </T>
        </View>
      </View>
    </View>
  );
}

function ShotDim() {
  return <LinearGradient pointerEvents="none" colors={[brand.shotTop, brand.shotBottom]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} />;
}

/** "Ooh, shiny." — the found sheet. */
function FoundSheet() {
  const c = useApp((s) => s.capture);
  const lastList = useApp((s) => s.lastList);
  const dest = useApp((s) => listById(s, s.lastList));
  const allLists = useApp((s) => s.lists);
  const lists = allLists.filter((l) => !l.archived);
  const dupe = useApp((s) => (c.match ? s.items.find((i) => i.name === c.match!.name && !i.pending) : undefined));
  const dupeList = useApp((s) => (dupe ? listById(s, dupe.list).name : ''));
  const set = useApp((s) => s.setCapture);
  const reset = useApp((s) => s.resetCapture);
  const wantIt = useApp((s) => s.wantIt);
  const m = c.match;
  if (!m) return null;
  const exact = isExact(m);
  const stores = [{ store: m.store, price: m.price, best: true }, ...(m.others ?? []).map((x) => ({ ...x, best: false }))];
  const hasAlts = c.alternates.length > 1;

  const chip = (label: React.ReactNode, onPress: () => void, on = false, key?: string) => (
    <Tap
      key={key}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: on ? brand.lime : palette.vio44, backgroundColor: on ? brand.lime : 'transparent' }}
    >
      {label}
    </Tap>
  );

  return (
    <>
      <ShotDim />
      <SheetOut active={c.phase === 'fly'} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5 }}>
        <Appear distance={60} duration={300}>
          <ScrollView
            bounces={false}
            style={{ maxHeight: 640 }}
            contentContainerStyle={{ backgroundColor: palette.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 18, paddingBottom: 34, gap: 11 }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.vio55, alignSelf: 'center', marginBottom: 2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Sparkle size={12} color={palette.limeText} />
                <T size={13} w={800} color={palette.limeText}>
                  Ooh, shiny.
                </T>
              </View>
              <View style={{ borderWidth: 1, borderColor: exact ? palette.lime66 : palette.vio44, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                <T size={11} w={600} color={exact ? palette.limeText : palette.soft}>
                  {matchBadge(m, c.chosen)}
                </T>
              </View>
              <Tap onPress={reset} accessibilityLabel="Close" style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 15, backgroundColor: palette.chip, alignItems: 'center', justifyContent: 'center' }}>
                <Close size={11} color={palette.muted} />
              </Tap>
            </View>
            <PhotoBox uri={m.image} fallback={c.shotUri} label="finding a photo…" style={{ height: 150, borderRadius: 16 }}>
              {!exact && c.shotUri && m.image ? (
                <View style={{ position: 'absolute', left: 10, bottom: 10, width: 54, height: 54, borderRadius: 10, borderWidth: 2, borderColor: palette.text, overflow: 'hidden' }}>
                  <PhotoBox uri={c.shotUri} fit="cover" label="you" style={{ flex: 1 }} />
                </View>
              ) : null}
            </PhotoBox>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <T size={18} w={800} style={{ flex: 1, lineHeight: 22 }}>
                {m.name}
              </T>
              <T size={18} w={800} color={palette.limeText}>
                {m.price}
              </T>
            </View>
            <Tap onPress={() => stores.length > 1 && set({ storesOpen: !c.storesOpen })} style={{ flexDirection: 'row', marginTop: -6 }}>
              <T size={12} color={palette.muted}>
                {stores.length > 1 ? 'Best price at ' : 'At '}
                <T size={12} w={700}>{m.store}</T>
                {stores.length > 1 ? (
                  <T size={12} w={700} color={palette.vio}>
                    {' '}· {c.storesOpen ? 'hide stores' : `${stores.length - 1} other ${stores.length === 2 ? 'store' : 'stores'}`}
                  </T>
                ) : null}
              </T>
            </Tap>
            {c.storesOpen ? (
              <View style={{ backgroundColor: palette.inset, borderRadius: 12, paddingVertical: 2, paddingHorizontal: 12 }}>
                {stores.map((s, i) => (
                  <View key={s.store + i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < stores.length - 1 ? 1 : 0, borderBottomColor: palette.vio22 }}>
                    <T size={12.5} w={600}>
                      {s.store}
                    </T>
                    <T size={12.5} w={700} color={s.best ? palette.limeText : palette.soft}>
                      {s.price}
                    </T>
                  </View>
                ))}
              </View>
            ) : null}
            {dupe ? (
              <View style={{ backgroundColor: brand.pink22, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10 }}>
                <T size={12} w={700} color={brand.pink}>
                  Already in {dupeList}
                </T>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {chip(
                <T size={12} w={700} color={c.star ? brand.limeInk : palette.soft}>
                  ★ Really want
                </T>,
                () => set({ star: !c.star }),
                c.star,
              )}
              {chip(
                <T size={12} w={700} color={palette.soft}>
                  {c.size || '+ Size / color'}
                </T>,
                () => set({ sizeEditing: !c.sizeEditing }),
              )}
              {chip(
                <>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: listAccent(dest) }} />
                  <T size={12} w={700} color={palette.soft}>
                    {dest.name} ▾
                  </T>
                </>,
                () => set({ destOpen: !c.destOpen }),
              )}
            </View>
            {c.sizeEditing ? (
              <TextInput
                value={c.size}
                onChangeText={(v) => set({ size: v })}
                placeholder="Size, color — e.g. M, black"
                placeholderTextColor={palette.muted}
                autoFocus
                style={{ backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, fontSize: 13, fontFamily: font[500], color: palette.text }}
              />
            ) : null}
            {c.destOpen ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {lists.map((l) => (
                  <Tap
                    key={l.id}
                    onPress={() => {
                      useApp.setState({ lastList: l.id });
                      set({ destOpen: false });
                    }}
                    style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: l.id === lastList ? brand.lime : palette.chip }}
                  >
                    <T size={12} w={700} color={l.id === lastList ? brand.limeInk : palette.soft}>
                      {l.name}
                    </T>
                  </Tap>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              <GhostButton label={exact ? 'Wrong product?' : 'Not it'} pad={13} onPress={() => set(hasAlts ? { phase: 'alts' } : { phase: 'type', typeQ: '' })} />
              <LimeButton label={dupe ? 'Add again' : 'Want it'} size={14.5} flex onPress={wantIt} />
            </View>
          </ScrollView>
        </Appear>
      </SheetOut>
    </>
  );
}

function FlyBurst() {
  const sparks = [
    { dx: -34, dy: -26, d: 550, s: 13, c: brand.lime },
    { dx: 32, dy: -30, d: 580, s: 11, c: brand.pink },
    { dx: -20, dy: 24, d: 600, s: 10, c: palette.vio },
    { dx: 40, dy: 14, d: 620, s: 9, c: brand.lime },
    { dx: -42, dy: 6, d: 560, s: 9, c: brand.pink },
  ];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', bottom: 36, zIndex: 2 }}>
      {sparks.map((p, i) => (
        <Burst key={i} dx={p.dx} dy={p.dy} delay={p.d}>
          <Sparkle size={p.s} color={p.c} />
        </Burst>
      ))}
    </View>
  );
}

function MissSheet() {
  const c = useApp((s) => s.capture);
  const set = useApp((s) => s.setCapture);
  const reset = useApp((s) => s.resetCapture);
  const runCapture = useApp((s) => s.runCapture);
  const savePending = useApp((s) => s.savePending);
  const showToast = useApp((s) => s.showToast);
  const miss = c.miss;
  if (!miss) return null;
  const isLink = c.input?.source === 'link';
  const isPhoto = c.input?.source === 'photo' || c.input?.source === 'screenshot';
  // An error (not a "nothing found") can just be tried again with the same input.
  const retry = miss.kind === 'error' && c.input ? () => void runCapture(c.input!) : reset;
  const canSave = c.fixItem == null && !!c.input;
  return (
    <>
      <ShotDim />
      <Appear style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5 }} distance={60} duration={300}>
        <View style={{ backgroundColor: palette.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 34, gap: 11, boxShadow: '0 -12px 40px rgba(0,0,0,0.55)' }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {c.shotUri ? (
              <PhotoBox uri={c.shotUri} fit="cover" label="" style={{ width: 58, height: 58, borderRadius: 12 }} />
            ) : (
              <LinearGradient colors={[brand.shotTop, brand.shotBottom]} style={{ width: 58, height: 58, borderRadius: 12 }} />
            )}
            <View style={{ flex: 1 }}>
              <T size={17} w={800}>
                {miss.title}
              </T>
              <T size={12} color={palette.muted} style={{ lineHeight: 17, marginTop: 2 }}>
                {miss.body}
              </T>
            </View>
          </View>
          <ChipButton label="Try again" onPress={retry} />
          <AccentButton label="Type it instead" width={1} onPress={() => set({ phase: 'type', typeQ: c.input && 'query' in c.input ? c.input.query : '' })} />
          {canSave ? (
            <LimeButton
              label={isLink ? 'Save link anyway' : isPhoto ? 'Save photo, keep matching' : 'Save it, keep matching'}
              size={13.5}
              pad={12}
              onPress={() => {
                savePending();
                showToast('Saved — we’ll keep matching it');
              }}
            />
          ) : null}
        </View>
      </Appear>
    </>
  );
}

/** "Which one is it?" — near matches from the search, also used by "Wrong product?". */
function Alternates() {
  const c = useApp((s) => s.capture);
  const set = useApp((s) => s.setCapture);
  const fixWith = useApp((s) => s.fixWith);
  const reset = useApp((s) => s.resetCapture);
  const savePending = useApp((s) => s.savePending);
  const showToast = useApp((s) => s.showToast);
  const fixing = c.fixItem != null;
  return (
    <Appear style={[StyleSheet.absoluteFill, { justifyContent: 'center', paddingHorizontal: 34, gap: 9, backgroundColor: 'rgba(10,8,16,0.55)' }]}>
      <T size={15} w={800} color={brand.camText} style={{ textAlign: 'center', marginBottom: 4 }}>
        Which one is it?
      </T>
      {c.alternates.map((a, i) => (
        <Tap
          key={a.name + i}
          onPress={() => (fixing ? fixWith(a) : set({ chosen: i, match: a, phase: 'found' }))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.card, borderWidth: 2, borderColor: !fixing && c.match?.name === a.name ? brand.lime : palette.vio44, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 }}
        >
          <PhotoBox uri={a.image} label="photo" labelSize={8} style={{ width: 42, height: 42, borderRadius: 9 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={12.5} w={700} style={{ lineHeight: 16 }} numberOfLines={2}>
              {a.name}
            </T>
            <T size={11} color={palette.muted} numberOfLines={1}>
              {a.tag} · {a.store}
            </T>
          </View>
          <T size={12.5} w={700} color={palette.limeText}>
            {a.price}
          </T>
        </Tap>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <AccentButton label="Type it instead" size={12.5} pad={11} width={1} flex onPress={() => set({ phase: 'type', typeQ: '' })} />
        <ChipButton
          label={fixing ? 'Keep as is' : c.input?.source === 'photo' || c.input?.source === 'screenshot' ? 'Save photo' : 'Save for later'}
          size={12.5}
          pad={11}
          flex
          onPress={() => {
            if (fixing) {
              reset();
              return;
            }
            savePending();
            showToast('Saved — we’ll keep matching it');
          }}
        />
      </View>
    </Appear>
  );
}

function TypeIt() {
  const c = useApp((s) => s.capture);
  const set = useApp((s) => s.setCapture);
  const runCapture = useApp((s) => s.runCapture);
  const openAlternates = useApp((s) => s.openAlternates);
  const q = c.typeQ.trim();
  const search = () => {
    if (!q) return;
    if (c.fixItem != null) void openAlternates(c.fixItem, q);
    else void runCapture({ source: 'search', query: q });
  };
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,16,0.85)' }]} />
      <Appear style={{ position: 'absolute', left: 24, right: 24, top: '26%', zIndex: 5, gap: 12 }}>
        <T size={18} w={800} color={brand.camText}>
          What is it?
        </T>
        <T size={12} color={brand.camSoft} style={{ marginTop: -6 }}>
          Brand and name work best, like “Stanley tumbler 40oz pink”.
        </T>
        <TextInput
          value={c.typeQ}
          onChangeText={(v) => set({ typeQ: v })}
          onSubmitEditing={search}
          placeholder="e.g. Stanley tumbler, pink"
          placeholderTextColor={palette.muted}
          autoFocus
          returnKeyType="search"
          style={{ backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio55, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, fontSize: 14, fontFamily: font[600], color: palette.text }}
        />
        <Tap onPress={search} disabled={!q} style={{ opacity: q ? 1 : 0.45 }}>
          <LimeFill style={{ paddingVertical: 13, alignItems: 'center' }}>
            <T size={14} w={800} color={brand.limeInk}>
              Search
            </T>
          </LimeFill>
        </Tap>
      </Appear>
    </View>
  );
}

import { useCallback, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { useCaptureStore } from '@/store/useCaptureStore';

/**
 * Say-it mode's dictation.
 *
 * Real speech-to-text: SFSpeechRecognizer on iOS, the platform recogniser on
 * Android, the Web Speech API on web. The mic permission is requested at the
 * moment you press the shutter in Say-it mode — the design review flagged that
 * the prototype had no permission moment at all.
 */
export function useDictation({ onFinal }: { onFinal: (transcript: string) => void }) {
  const setTranscript = useCaptureStore((s) => s.setTranscript);
  const setListening = useCaptureStore((s) => s.setListening);
  const setError = useCaptureStore((s) => s.setError);

  /** Input volume, 0–1, used to make the waveform respond to your voice. */
  const [level, setLevel] = useState(0);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    setTranscript(transcript);
    if (event.isFinal && transcript.trim()) onFinal(transcript);
  });

  useSpeechRecognitionEvent('nomatch', () => {
    setError('Didn’t catch that — try again');
    setListening(false);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setLevel(0);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    setLevel(0);
    setError(
      event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'MeLikee needs the mic to hear what you want'
        : event.error === 'no-speech'
          ? 'Didn’t hear anything — tap and say it again'
          : 'Dictation isn’t available right now',
    );
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    // The module reports roughly -2…10; anything below 0 is inaudible.
    setLevel(Math.max(0, Math.min(1, event.value / 10)));
  });

  const start = useCallback(async () => {
    setError(undefined);
    setTranscript('');

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError('Dictation isn’t available on this device');
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('MeLikee needs the mic to hear what you want');
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      // Product names are the whole job here, so bias toward brand-shaped words.
      contextualStrings: ['Sony', 'AirPods', 'On Cloudmonster', 'Instax', 'Glossier', 'Stanley'],
    });
    setListening(true);
  }, [setError, setListening, setTranscript]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { start, stop, level };
}

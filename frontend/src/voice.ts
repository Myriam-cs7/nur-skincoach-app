import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { API_BASE } from './api';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// ---------- Clinical UI sounds ----------
const SOUND_SOURCES = {
  send: require('../assets/sounds/send.wav'),
  receive: require('../assets/sounds/receive.wav'),
  analysis: require('../assets/sounds/analysis.wav'),
};
export type UiSound = keyof typeof SOUND_SOURCES;

const uiPlayers: Partial<Record<UiSound, AudioPlayer>> = {};

function uiPlayer(kind: UiSound): AudioPlayer | null {
  try {
    if (!uiPlayers[kind]) uiPlayers[kind] = createAudioPlayer(SOUND_SOURCES[kind]);
    return uiPlayers[kind]!;
  } catch (e) {
    console.warn('[voice] cannot create ui player', kind, e);
    return null;
  }
}

export function playUiSound(kind: UiSound, { volume = 0.35, loop = false } = {}) {
  const p = uiPlayer(kind);
  if (!p) return;
  try {
    p.volume = volume;
    p.loop = loop;
    p.seekTo(0);
    p.play();
  } catch (e) {
    console.warn('[voice] ui sound failed', kind, e);
  }
}

export function stopUiSound(kind: UiSound) {
  try {
    const p = uiPlayers[kind];
    if (p) {
      p.loop = false;
      p.pause();
      p.seekTo(0);
    }
  } catch {
    // player already released
  }
}

// ---------- Text to speech (OpenAI "nova" served by the backend) ----------
let speaker: AudioPlayer | null = null;
let speakSeq = 0;

export function stopSpeaking() {
  speakSeq += 1;
  const p = speaker;
  speaker = null;
  if (!p) return;
  try {
    p.pause();
    p.remove();
  } catch {
    // already released
  }
}

/** Resolves once playback is finished. Throws on any pipeline failure. */
export async function speak(text: string, lang: string): Promise<void> {
  const seq = ++speakSeq;
  stopSpeaking();
  speakSeq = seq;

  const res = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  });
  if (!res.ok) throw new Error(`tts_request_${res.status}`);
  const { path } = (await res.json()) as { path: string };
  if (seq !== speakSeq) return;

  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  const player = createAudioPlayer({ uri: `${BACKEND}${path}` });
  speaker = player;

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        sub.remove();
      } catch {
        // noop
      }
      if (speaker === player) {
        try {
          player.remove();
        } catch {
          // noop
        }
        speaker = null;
      }
      resolve();
    };
    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status?.didJustFinish) finish();
      if (seq !== speakSeq) finish();
    });
    try {
      player.play();
    } catch (e) {
      console.warn('[voice] playback failed', e);
      finish();
    }
  });
}

// ---------- Speech to text ----------
export async function transcribeRecording(uri: string, lang: string): Promise<string> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    // iPhone Safari records mp4, Chrome webm; anything else the provider decodes as webm
    const ext = /mp4|aac|m4a/.test(blob.type) ? 'mp4' : 'webm';
    form.append('audio', blob, `recording.${ext}`);
  } else {
    form.append('audio', new File(uri) as any, 'recording.m4a');
  }
  form.append('lang', lang);

  const doFetch: typeof fetch = Platform.OS === 'web' ? fetch : (expoFetch as any);
  const res = await doFetch(`${API_BASE}/transcribe`, { method: 'POST', body: form as any });
  if (!res.ok) throw new Error(`stt_${res.status}`);
  const data = (await res.json()) as { text?: string };
  return (data.text || '').trim();
}

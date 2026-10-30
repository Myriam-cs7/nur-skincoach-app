/**
 * Microphone recording inside a phone browser (the native recorder does not
 * exist there). MediaRecorder captures the voice, an AnalyserNode watches the
 * level so the turn can stop on its own after a silence.
 */
export type WebMicError = 'denied' | 'unsupported' | 'nodevice' | 'failed';

export class WebMicException extends Error {
  constructor(public reason: WebMicError) {
    super(reason);
  }
}

export function webMicSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

/** 'granted' when the browser already remembers the permission (Safari: unknown). */
export async function webMicState(): Promise<'granted' | 'denied' | 'unknown'> {
  try {
    const status = await (navigator as any).permissions?.query({ name: 'microphone' });
    if (status?.state === 'granted') return 'granted';
    if (status?.state === 'denied') return 'denied';
  } catch {
    // Safari does not expose the microphone permission
  }
  return 'unknown';
}

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
}

export type WebRecording = {
  /** Resolves to an object URL ready for transcription, or null when empty. */
  stop: () => Promise<string | null>;
  cancel: () => void;
};

export async function startWebRecording(opts: {
  onLevel?: (db: number) => void;
  onSilence?: () => void;
  silenceMs?: number;
}): Promise<WebRecording> {
  if (!webMicSupported()) throw new WebMicException('unsupported');

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: any) {
    const name = String(e?.name || '');
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new WebMicException('denied');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new WebMicException('nodevice');
    throw new WebMicException('failed');
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e: BlobEvent) => { if (e.data.size) chunks.push(e.data); };
  recorder.start(250);

  // Level watching: enough to animate the halo and to notice a silence
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  audioCtx.createMediaStreamSource(stream).connect(analyser);
  const buffer = new Uint8Array(analyser.frequencyBinCount);
  const startedAt = Date.now();
  let silenceSince: number | null = null;
  let stopped = false;

  const tick = setInterval(() => {
    analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const v = (buffer[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buffer.length);
    const db = 20 * Math.log10(Math.max(rms, 0.0001));
    opts.onLevel?.(db);

    const elapsed = Date.now() - startedAt;
    if (db > -42) { silenceSince = null; return; }
    if (silenceSince === null) { silenceSince = Date.now(); return; }
    if (elapsed > 2500 && Date.now() - silenceSince > (opts.silenceMs ?? 1500)) {
      clearInterval(tick);
      opts.onSilence?.();
    }
  }, 120);

  const teardown = () => {
    clearInterval(tick);
    stream.getTracks().forEach((track) => track.stop());
    audioCtx.close().catch(() => {});
  };

  return {
    stop: () =>
      new Promise<string | null>((resolve) => {
        if (stopped) { resolve(null); return; }
        stopped = true;
        recorder.onstop = () => {
          teardown();
          if (!chunks.length) { resolve(null); return; }
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          resolve(blob.size > 1200 ? URL.createObjectURL(blob) : null);
        };
        try {
          recorder.stop();
        } catch {
          teardown();
          resolve(null);
        }
      }),
    cancel: () => {
      stopped = true;
      try { recorder.stop(); } catch { /* already stopped */ }
      teardown();
    },
  };
}

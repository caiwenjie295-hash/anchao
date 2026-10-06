import { resolveBrowserStorage } from '../core/persistence/browserStorage';

type AudioCue = 'keyboard';

interface AudioSession {
  context: AudioContext;
  master: GainNode;
  sources: Set<AudioScheduledSourceNode>;
  nodes: Set<AudioNode>;
  pendingClickTimers: Set<number>;
  keyboardTimer: number | null;
  seed: number;
}

const PREFERENCE_KEY = 'anchao.ui.t07AmbientAudioEnabled';
let session: AudioSession | null = null;

function seededNoise(context: AudioContext, seconds: number, seed: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let value = seed >>> 0;
  for (let index = 0; index < samples.length; index += 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
    samples[index] = (value / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

function connectNoiseBed(active: AudioSession, seed: number, highpassHz: number, lowpassHz: number, gainValue: number) {
  const { context, master } = active;
  const source = context.createBufferSource();
  source.buffer = seededNoise(context, 5, seed);
  source.loop = true;
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = highpassHz;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = lowpassHz;
  const gain = context.createGain();
  gain.gain.value = gainValue;
  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(master);
  active.sources.add(source);
  active.nodes.add(source);
  active.nodes.add(highpass);
  active.nodes.add(lowpass);
  active.nodes.add(gain);
  source.start();
}

function removeOneShot(active: AudioSession, source: AudioBufferSourceNode, nodes: AudioNode[]) {
  source.onended = () => {
    for (const node of nodes) {
      active.nodes.delete(node);
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    active.sources.delete(source);
  };
}

function typeClick(active: AudioSession) {
  const { context, master } = active;
  const source = context.createBufferSource();
  source.buffer = seededNoise(context, 0.026, active.seed += 7919);
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1150 + (active.seed % 500);
  band.Q.value = 0.7;
  const gain = context.createGain();
  const start = context.currentTime;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.022);
  source.connect(band);
  band.connect(gain);
  gain.connect(master);
  const nodes: AudioNode[] = [source, band, gain];
  for (const node of nodes) active.nodes.add(node);
  active.sources.add(source);
  removeOneShot(active, source, nodes);
  source.start(start);
  source.stop(start + 0.026);
}

function scheduleKeyboard(active: AudioSession) {
  const scheduleNext = () => {
    if (session !== active) return;
    const delay = 2100 + (active.seed % 3100);
    active.keyboardTimer = window.setTimeout(() => {
      if (session !== active) return;
      const count = 2 + (active.seed % 3);
      for (let index = 0; index < count; index += 1) {
        let timer = 0;
        timer = window.setTimeout(() => {
          active.pendingClickTimers.delete(timer);
          if (session === active) typeClick(active);
        }, index * (38 + ((active.seed + index * 17) % 42)));
        active.pendingClickTimers.add(timer);
      }
      active.seed = (active.seed * 48271) % 0x7fffffff;
      scheduleNext();
    }, delay);
  };
  scheduleNext();
}

/** Starts locally synthesized rain, low wind and sparse keyboard taps. Call from a user gesture. */
export function setInvestigationAudioEnabled(enabled: boolean): boolean {
  if (!enabled) {
    stopInvestigationAudio();
    return true;
  }
  if (session) return true;
  const audioGlobals = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = audioGlobals.AudioContext ?? audioGlobals.webkitAudioContext;
  if (!AudioContextConstructor) return false;
  try {
    const context = new AudioContextConstructor();
    const master = context.createGain();
    master.gain.value = 0.045;
    master.connect(context.destination);
    const active: AudioSession = { context, master, sources: new Set(), nodes: new Set([master]), pendingClickTimers: new Set(), keyboardTimer: null, seed: 73129 };
    session = active;
    // Filtered looped noise avoids external assets and has no sudden peaks or loud transients.
    connectNoiseBed(active, 31057, 850, 5200, 0.26); // soft rain texture
    connectNoiseBed(active, 77011, 45, 330, 0.22); // low distant wind
    scheduleKeyboard(active);
    void context.resume().catch(() => stopInvestigationAudio());
    return true;
  } catch {
    stopInvestigationAudio();
    return false;
  }
}

/** Adds one quiet keyboard tap while the optional ambience is active. */
export function playInvestigationAudio(cue: AudioCue): boolean {
  if (!session || cue !== 'keyboard') return false;
  try { typeClick(session); return true; } catch { return false; }
}

/** Stops every loop, pending keyboard timer, one-shot, and AudioContext owned by this scene. */
export function stopInvestigationAudio(): void {
  const active = session;
  if (!active) return;
  session = null;
  if (active.keyboardTimer !== null) window.clearTimeout(active.keyboardTimer);
  for (const timer of active.pendingClickTimers) window.clearTimeout(timer);
  active.pendingClickTimers.clear();
  for (const source of active.sources) {
    try { source.stop(); } catch { /* one-shot already ended */ }
  }
  for (const node of active.nodes) {
    try { node.disconnect(); } catch { /* browser already disconnected the node */ }
  }
  void active.context.close().catch(() => undefined);
}

/** Only a UI preference; it is deliberately separate from story state and saved-game data. */
export function readInvestigationAudioPreference(): boolean | null {
  try {
    const value = resolveBrowserStorage()?.getItem(PREFERENCE_KEY);
    return value === null || value === undefined ? null : value === 'true';
  } catch { return null; }
}

export function writeInvestigationAudioPreference(enabled: boolean): void {
  try { resolveBrowserStorage()?.setItem(PREFERENCE_KEY, String(enabled)); } catch { /* audio still works without persisted UI preference */ }
}

export const investigationAudio = {
  setEnabled: setInvestigationAudioEnabled,
  play: playInvestigationAudio,
  stop: stopInvestigationAudio,
};

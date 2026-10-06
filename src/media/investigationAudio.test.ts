import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  investigationAudio,
  readInvestigationAudioPreference,
  writeInvestigationAudioPreference,
} from './investigationAudio';

class FakeAudioParam {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeGain extends FakeAudioNode { gain = new FakeAudioParam(); }
class FakeFilter extends FakeAudioNode {
  type = '';
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}
class FakeSource extends FakeAudioNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = 'suspended';
  sampleRate = 8000;
  currentTime = 0;
  destination = new FakeAudioNode();
  sources: FakeSource[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  constructor() { FakeAudioContext.instances.push(this); }
  createBuffer(_channels: number, length: number, _sampleRate: number) {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples } as unknown as AudioBuffer;
  }
  createBufferSource() { const source = new FakeSource(); this.sources.push(source); return source as unknown as AudioBufferSourceNode; }
  createBiquadFilter() { return new FakeFilter() as unknown as BiquadFilterNode; }
  createGain() { return new FakeGain() as unknown as GainNode; }
}

describe('T07 local ambience', () => {
  afterEach(() => {
    investigationAudio.stop();
    localStorage.removeItem('anchao.ui.t07AmbientAudioEnabled');
    FakeAudioContext.instances = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not start when Web Audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(investigationAudio.setEnabled(true)).toBe(false);
    expect(investigationAudio.play('keyboard')).toBe(false);
  });

  it('synthesizes the optional bed locally and stops every source when disabled', () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    expect(investigationAudio.setEnabled(true)).toBe(true);
    const context = FakeAudioContext.instances[0];
    expect(context.sources).toHaveLength(2);
    expect(context.sources.every((source) => source.loop)).toBe(true);
    expect(investigationAudio.play('keyboard')).toBe(true);
    expect(context.sources).toHaveLength(3);

    expect(investigationAudio.setEnabled(false)).toBe(true);
    expect(context.sources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(investigationAudio.play('keyboard')).toBe(false);
  });

  it('stores mute choice as a UI preference without touching game state', () => {
    writeInvestigationAudioPreference(false);
    expect(readInvestigationAudioPreference()).toBe(false);
    writeInvestigationAudioPreference(true);
    expect(readInvestigationAudioPreference()).toBe(true);
    expect(localStorage.getItem('anchao.ui.t07AmbientAudioEnabled')).toBe('true');
  });
});

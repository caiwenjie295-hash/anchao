import highSpiresUrl from '../assets/audio/drmseq_06_High_Spires_loop.ogg?url&no-inline';

export interface BackgroundMusicTrack {
  readonly title: string;
  readonly src: string;
}

export interface BackgroundMusicConfig {
  readonly track: BackgroundMusicTrack | null;
  /** Playback volume from 0 to 1. */
  readonly volume: number;
  readonly loop: boolean;
}

export const backgroundMusicConfig: BackgroundMusicConfig = {
  track: { title: 'High Spires', src: highSpiresUrl },
  volume: 0.2,
  loop: true,
};

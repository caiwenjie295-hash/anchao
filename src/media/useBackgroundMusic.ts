import { useSyncExternalStore } from 'react';
import { backgroundMusicPlayer } from './backgroundMusicPlayer';

export function useBackgroundMusic() {
  const snapshot = useSyncExternalStore(backgroundMusicPlayer.subscribe, backgroundMusicPlayer.getSnapshot, backgroundMusicPlayer.getSnapshot);
  return {
    ...snapshot,
    setEnabled: (enabled: boolean) => backgroundMusicPlayer.setEnabled(enabled),
    setVolume: (volume: number) => backgroundMusicPlayer.setVolume(volume),
    retry: () => backgroundMusicPlayer.retry(),
  };
}

import type { AppDefinition } from '../data/apps';
import { AppIcon } from './AppIcon';

export function DesktopIcon({ app, onOpen }: { app: AppDefinition; onOpen: () => void }) {
  return (
    <button
      className="desktop-icon"
      onDoubleClick={onOpen}
      onClick={() => undefined}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(); }}
      aria-label={`打开 ${app.title}`}
      title={`双击打开 ${app.title}`}
    >
      <AppIcon app={app} />
      <span>{app.title}</span>
    </button>
  );
}

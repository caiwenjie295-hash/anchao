import type { AppDefinition } from '../data/apps';
import { SpriteIcon } from './SpriteIcon';

interface AppIconProps {
  app: AppDefinition;
  compact?: boolean;
}

export function AppIcon({ app, compact = false }: AppIconProps) {
  const iconByAppId = { wechat: 'app-wechat', mail: 'app-mail', browser: 'app-browser', explorer: 'app-explorer', notepad: 'app-notepad', photos: 'app-photos' } as const;
  return (
    <span className={`app-icon${compact ? ' app-icon--compact' : ''}`} data-asset-id={app.assetId} aria-hidden="true">
      <SpriteIcon name={iconByAppId[app.appId]} />
    </span>
  );
}

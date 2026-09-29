import { ResetProgressButton } from './ResetProgressButton';
import type { AppId, DesktopState } from '../core/types';
import { apps } from '../data/apps';
import { AppIcon } from './AppIcon';
import type { ReactNode } from 'react';

export function Taskbar({ desktop, onAppClick, onResetProgress, time, investigation }: { desktop: DesktopState; onAppClick: (appId: AppId) => void; onResetProgress?: () => void; time: Date; investigation?: ReactNode }) {
  return (
    <footer className="taskbar" aria-label="任务栏">
      <div className="taskbar__apps">
        {apps.map((app) => {
          const windowState = desktop.windows[app.appId];
          const opened = windowState.status !== 'closed';
          const active = desktop.activeAppId === app.appId && windowState.status !== 'minimized';
          return <button key={app.appId} className={`taskbar__app${opened ? ' taskbar__app--open' : ''}${active ? ' taskbar__app--active' : ''}`} onClick={() => onAppClick(app.appId)} aria-label={`${opened ? '切换到' : '打开'} ${app.title}`}><AppIcon app={app} compact /></button>;
        })}
      </div>
      <div className="taskbar__system-area">
        {investigation && <details className="taskbar-investigation"><summary>调查</summary><div className="taskbar-investigation__menu">{investigation}</div></details>}
        {onResetProgress && <ResetProgressButton onReset={onResetProgress} />}
        <div className="taskbar__system" aria-label="系统时间">
          <span>{new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(time)}</span>
          <span>{new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(time)}</span>
        </div>
      </div>
    </footer>
  );
}

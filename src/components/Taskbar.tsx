import type { ReactNode } from 'react';
import type { AppId, DesktopState } from '../core/types';
import { apps } from '../data/apps';
import { AppIcon } from './AppIcon';

export function Taskbar({ desktop, onAppClick, time, chapterNavigation }: { desktop: DesktopState; onAppClick: (appId: AppId) => void; time: Date; chapterNavigation?: ReactNode }) {
  return (
    <footer className="taskbar" aria-label="任务栏">
      <span className="taskbar__brand" aria-hidden="true">暗潮<span>调查工作台</span></span>
      <div className="taskbar__apps">
        <span className="taskbar__apps-label">应用</span>
        {apps.map((app) => {
          const windowState = desktop.windows[app.appId];
          const opened = windowState.status !== 'closed';
          const active = desktop.activeAppId === app.appId && windowState.status !== 'minimized';
          return <button key={app.appId} className={`taskbar__app${opened ? ' taskbar__app--open' : ''}${active ? ' taskbar__app--active' : ''}`} onClick={() => onAppClick(app.appId)} aria-label={`${opened ? '切换到' : '打开'} ${app.title}`}><AppIcon app={app} compact /></button>;
        })}
      </div>
      <div className="taskbar__system-area">
        <div className="taskbar__system" aria-label="系统时间">
          <span>{new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(time)}</span>
          <span>{new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(time)}</span>
        </div>
        {chapterNavigation}
      </div>
    </footer>
  );
}

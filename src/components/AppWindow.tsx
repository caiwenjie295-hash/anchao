import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DesktopWindow } from '../core/types';
import type { AppDefinition } from '../data/apps';
import { AppIcon } from './AppIcon';
import { AppShell } from './AppShell';
import { SpriteIcon } from './SpriteIcon';
import { useInvestigationProgress } from './InvestigationProgressContext';
import '../sprites.css';

interface AppWindowProps {
  app: AppDefinition;
  windowState: DesktopWindow;
  active: boolean;
  onFocus: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onBoundsChange: (bounds: DesktopWindow['bounds']) => void;
}

type Gesture = { kind: 'move' | 'resize'; startX: number; startY: number; bounds: DesktopWindow['bounds'] };

export function AppWindow({ app, windowState, active, onFocus, onMinimize, onToggleMaximize, onClose, onBoundsChange }: AppWindowProps) {
  const gestureRef = useRef<Gesture | null>(null);
  const progressContext = useInvestigationProgress();
  const beginGesture = (event: ReactPointerEvent<HTMLDivElement>, kind: Gesture['kind']) => {
    if (windowState.status === 'maximized') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { kind, startX: event.clientX, startY: event.clientY, bounds: { ...windowState.bounds } };
    onFocus();
  };
  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    onBoundsChange(gesture.kind === 'move'
      ? { ...gesture.bounds, x: gesture.bounds.x + deltaX, y: gesture.bounds.y + deltaY }
      : { ...gesture.bounds, width: gesture.bounds.width + deltaX, height: gesture.bounds.height + deltaY });
  };
  const endGesture = () => { gestureRef.current = null; };
  const { bounds } = windowState;
  return (
    <article
      className={`app-window${active ? ' app-window--active' : ''}${windowState.status === 'maximized' ? ' app-window--maximized' : ''}`}
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height, zIndex: windowState.zIndex }}
      onPointerDown={onFocus}
      aria-label={`${app.title} 窗口`}
    >
      <div className="window-titlebar" onPointerDown={(event) => beginGesture(event, 'move')} onPointerMove={moveGesture} onPointerUp={endGesture} onDoubleClick={onToggleMaximize}>
        <div className="window-titlebar__name"><AppIcon app={app} compact /><span>{app.title}</span></div>
        {active && progressContext && <button
          type="button"
          className="window-titlebar__progress"
          aria-label={`打开调查进度；当前建议：${progressContext.progress.nextAction}`}
          title="点击查看当前路线与剧情回顾"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={(event) => progressContext.openProgress(event.currentTarget)}
        ><strong>调查进度</strong><span>{progressContext.progress.nextAction}</span></button>}
        <div className="window-controls" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={onMinimize} aria-label={`最小化 ${app.title}`} title="最小化"><SpriteIcon name="window-minimize" /></button>
          <button type="button" onClick={onToggleMaximize} aria-label={`${windowState.status === 'maximized' ? '还原' : '最大化'} ${app.title}`} title={windowState.status === 'maximized' ? '还原' : '最大化'}><SpriteIcon name={windowState.status === 'maximized' ? 'window-restore' : 'window-maximize'} /></button>
          <button type="button" className="window-controls__close" onClick={onClose} aria-label={`关闭 ${app.title}`} title="关闭"><SpriteIcon name="window-close" /></button>
        </div>
      </div>
      <AppShell app={app} />
      {windowState.status !== 'maximized' && <div className="resize-handle" role="presentation" onPointerDown={(event) => beginGesture(event, 'resize')} onPointerMove={moveGesture} onPointerUp={endGesture} />}
    </article>
  );
}

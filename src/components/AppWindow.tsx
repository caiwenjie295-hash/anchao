import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DesktopWindow } from '../core/types';
import type { AppDefinition } from '../data/apps';
import { AppIcon } from './AppIcon';
import { AppShell } from './AppShell';
import { SpriteIcon } from './SpriteIcon';
import { useInvestigationProgress } from './InvestigationProgressContext';
import { clampWindowBounds, DESKTOP_TASKBAR_CLEARANCE, sameWindowBounds } from './windowGeometry';
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

type Gesture = { kind: 'move' | 'resize'; pointerId: number; startX: number; startY: number; bounds: DesktopWindow['bounds'] };

const readViewport = () => ({
  width: typeof window === 'undefined' ? 1366 : window.innerWidth,
  height: typeof window === 'undefined' ? 768 : window.innerHeight,
});

export function AppWindow({ app, windowState, active, onFocus, onMinimize, onToggleMaximize, onClose, onBoundsChange }: AppWindowProps) {
  const gestureRef = useRef<Gesture | null>(null);
  const [viewport, setViewport] = useState(readViewport);
  const progressContext = useInvestigationProgress();
  const { bounds } = windowState;
  const visibleBounds = clampWindowBounds(bounds, viewport.width, viewport.height);

  useEffect(() => {
    const updateViewport = () => {
      const next = readViewport();
      setViewport((current) => current.width === next.width && current.height === next.height ? current : next);
    };
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    const desktopHeight = viewport.height - DESKTOP_TASKBAR_CLEARANCE;
    const stateManagerCanRepresentBounds = viewport.width >= 320 && desktopHeight >= 240;
    if (windowState.status !== 'maximized' && stateManagerCanRepresentBounds && !sameWindowBounds(bounds, visibleBounds)) onBoundsChange(visibleBounds);
  }, [bounds, visibleBounds, windowState.status, onBoundsChange]);

  const beginGesture = (event: ReactPointerEvent<HTMLDivElement>, kind: Gesture['kind']) => {
    if (windowState.status === 'maximized') return;
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button, a, input, [data-window-no-drag]'))) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { kind, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, bounds: { ...visibleBounds } };
    onFocus();
  };
  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const nextBounds = gesture.kind === 'move'
      ? { ...gesture.bounds, x: gesture.bounds.x + deltaX, y: gesture.bounds.y + deltaY }
      : { ...gesture.bounds, width: gesture.bounds.width + deltaX, height: gesture.bounds.height + deltaY };
    onBoundsChange(clampWindowBounds(nextBounds, viewport.width, viewport.height));
  };
  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.pointerId === event.pointerId) gestureRef.current = null;
  };
  return (
    <article
      className={`app-window app-window--${app.appId}${active ? ' app-window--active' : ''}${windowState.status === 'maximized' ? ' app-window--maximized' : ''}`}
      style={{ left: visibleBounds.x, top: visibleBounds.y, width: visibleBounds.width, height: visibleBounds.height, zIndex: windowState.zIndex }}
      onPointerDown={onFocus}
      aria-label={`${app.title} 窗口`}
    >
      <div className="window-titlebar" onPointerDown={(event) => beginGesture(event, 'move')} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture} onDoubleClick={onToggleMaximize}>
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
        <div className="window-controls" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={onMinimize} aria-label={`最小化 ${app.title}`} title="最小化"><SpriteIcon name="window-minimize" /></button>
          <button type="button" onClick={onToggleMaximize} aria-label={`${windowState.status === 'maximized' ? '还原' : '最大化'} ${app.title}`} title={windowState.status === 'maximized' ? '还原' : '最大化'}><SpriteIcon name={windowState.status === 'maximized' ? 'window-restore' : 'window-maximize'} /></button>
          <button type="button" className="window-controls__close" onClick={onClose} aria-label={`关闭 ${app.title}`} title="关闭"><SpriteIcon name="window-close" /></button>
        </div>
      </div>
      <AppShell app={app} />
      {windowState.status !== 'maximized' && <div className="resize-handle" role="presentation" onPointerDown={(event) => beginGesture(event, 'resize')} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture} />}
    </article>
  );
}

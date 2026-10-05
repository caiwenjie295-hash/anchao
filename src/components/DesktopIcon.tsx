import { useRef } from 'react';
import type { AppDefinition } from '../data/apps';
import { AppIcon } from './AppIcon';

interface DesktopIconProps {
  app: AppDefinition;
  onOpen: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

export function DesktopIcon({ app, onOpen, selected = false, onSelect }: DesktopIconProps) {
  const pointerTypeRef = useRef('');
  return (
    <button
      type="button"
      className={`desktop-icon${selected ? ' desktop-icon--selected' : ''}`}
      aria-pressed={selected}
      onPointerDown={(event) => { pointerTypeRef.current = event.pointerType; }}
      onDoubleClick={onOpen}
      onClick={(event) => {
        if (event.detail === 0 || pointerTypeRef.current === 'touch') onOpen();
        else onSelect?.();
        pointerTypeRef.current = '';
      }}
      aria-label={`打开 ${app.title}`}
      title={selected ? `${app.title}，已选中；双击打开` : `单击选择，双击打开 ${app.title}`}
    >
      <AppIcon app={app} />
      <span>{app.title}</span>
    </button>
  );
}

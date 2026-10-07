import { useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react';
import { useCurtainExit } from '../scenePolish/useCurtainExit';
import './investigation.css';

export interface InvestigationDetailProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  fallbackFocus?: () => HTMLElement | null;
}

const getFocusable = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
)].filter((element) => element.getAttribute('aria-hidden') !== 'true');

export function InvestigationDetail({ title, children, onClose, closeLabel = '关闭特写，返回现场', fallbackFocus }: InvestigationDetailProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const fallbackFocusRef = useRef(fallbackFocus);
  const { closing, beginExit } = useCurtainExit(onClose);

  useEffect(() => { fallbackFocusRef.current = fallbackFocus; }, [fallbackFocus]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      const opener = previousFocusRef.current;
      const target = opener?.isConnected && opener !== document.body && opener !== document.documentElement
        ? opener
        : fallbackFocusRef.current?.();
      target?.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      beginExit();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = getFocusable(dialogRef.current);
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === closeRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={`investigation-detail__backdrop${closing ? ' investigation-detail__backdrop--closing' : ''}`} role="presentation" onClick={(event) => { if (event.target === event.currentTarget) beginExit(); }}>
      <section
        ref={dialogRef}
        className={`investigation-detail${closing ? ' investigation-detail--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="investigation-detail-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header className="investigation-detail__header">
          <h2 id="investigation-detail-title">{title}</h2>
          <button ref={closeRef} type="button" aria-disabled={closing} onClick={() => beginExit()}>{closeLabel}</button>
        </header>
        <div className="investigation-detail__content">{children}</div>
      </section>
    </div>
  );
}

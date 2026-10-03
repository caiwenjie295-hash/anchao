import { useEffect, useRef, type KeyboardEvent } from 'react';

export function Act4Ending({ onReview, onReturnToDesktop }: { onReview: () => void; onReturnToDesktop: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onReview();
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.a4-reader')?.focus({ preventScroll: true }));
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (first && last && event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (first && last && !event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const returnToDesktop = () => {
    onReturnToDesktop();
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#taskbar')?.focus({ preventScroll: true }));
  };

  return <div ref={dialogRef} className="act4-ending" role="dialog" aria-modal="true" aria-labelledby="act4-ending-title" onKeyDown={keepFocusInside}>
    <div className="act4-ending__card">
      <h1 id="act4-ending-title">故事已结束</h1>
      <p>小说原文撰写 VeinJay_C</p>
      <p>项目策划 VeinJay_C</p>
      <p>游戏制作 VeinJay_C</p>
      <div className="act4-ending__actions">
        <button type="button" onClick={() => {
          onReview();
          window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.a4-reader')?.focus({ preventScroll: true }));
        }}>回顾故事</button>
        <button type="button" onClick={returnToDesktop}>返回桌面</button>
      </div>
    </div>
  </div>;
}

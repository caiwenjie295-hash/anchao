import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { runAct4EndingTransition } from '../../components/transition/sceneTransition';
import { useAct4EndingReveal } from './reader/useAct4EndingReveal';

export function Act4Ending({ onReview, onReturnToDesktop }: { onReview: () => void; onReturnToDesktop: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const { revealStage, showAll } = useAct4EndingReveal();

  useLayoutEffect(() => {
    if (revealStage === 0) skipRef.current?.focus();
    else if (revealStage === 3 && (document.activeElement === document.body || document.activeElement === skipRef.current)) actionRef.current?.focus();
  }, [revealStage]);

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      runAct4EndingTransition(() => {
        onReview();
        window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.a4-reader')?.focus({ preventScroll: true }));
      });
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
    runAct4EndingTransition(() => {
      onReturnToDesktop();
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#taskbar')?.focus({ preventScroll: true }));
    });
  };

  const reviewStory = () => {
    runAct4EndingTransition(() => {
      onReview();
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.a4-reader')?.focus({ preventScroll: true }));
    });
  };

  return <div ref={dialogRef} className="act4-ending" role="dialog" aria-modal="true" aria-label="第四幕落幕" onKeyDown={keepFocusInside} aria-busy={revealStage < 3}>
    <button ref={skipRef} type="button" className="act4-ending__skip" onClick={revealStage < 3 ? showAll : () => actionRef.current?.focus()}>
      {revealStage < 3 ? '立即显示全部' : '前往入口'}
    </button>
    <div className="act4-ending__card" aria-live="polite" aria-atomic="false">
      {revealStage >= 1 && <h1 id="act4-ending-title">故事已结束</h1>}
      {revealStage >= 2 && <div className="act4-ending__credits">
        <p>小说原文撰写 VeinJay_C</p>
        <p>项目策划 VeinJay_C</p>
        <p>游戏制作 VeinJay_C</p>
      </div>}
      {revealStage >= 3 && <div className="act4-ending__actions act4-ending__actions--revealed">
        <button ref={actionRef} type="button" onClick={reviewStory}>回顾故事</button>
        <button type="button" onClick={returnToDesktop}>返回桌面</button>
      </div>}
    </div>
  </div>;
}

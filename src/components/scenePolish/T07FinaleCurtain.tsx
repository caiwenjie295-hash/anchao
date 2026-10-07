import { useEffect, useRef } from 'react';
import { useCurtainExit } from './useCurtainExit';

export function T07FinaleCurtain({
  lines,
  cueIndex,
  onContinue,
  onReview,
}: {
  lines: readonly string[];
  cueIndex: number;
  onContinue: () => void;
  onReview: () => void;
}) {
  const curtainRef = useRef<HTMLDivElement>(null);
  const { closing, beginExit } = useCurtainExit(() => {});

  useEffect(() => { curtainRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, []);

  return <div className={`t07-finale__ending scene-polish-curtain${closing ? ' t07-finale__ending--closing scene-polish-curtain--closing' : ''}`} role="dialog" aria-modal="true" aria-label="第二幕收束" ref={curtainRef}>
    {lines.map((line, index) => (
      <p key={line} className={`t07-finale__narration${index <= cueIndex ? ' is-shown' : ''}`}>{index <= cueIndex ? line : ''}</p>
    ))}
    <button type="button" className="t07-finale__ending-continue" disabled={closing} onClick={() => beginExit(onContinue)}>再次进山，调查启明旧址</button>
    <button type="button" className="t07-finale__ending-replay" disabled={closing} onClick={() => beginExit(onReview)}>回看资料</button>
  </div>;
}

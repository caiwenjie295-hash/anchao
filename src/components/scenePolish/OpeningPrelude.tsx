import { useEffect, useRef } from 'react';
import { OPENING_PRELUDE } from './openingPreludeData';
import { useCurtainExit } from './useCurtainExit';

export function OpeningPrelude({ onBegin }: { onBegin: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { closing, beginExit } = useCurtainExit(onBegin);
  useEffect(() => { buttonRef.current?.focus(); }, []);

  return <section
    className={`story-transition scene-polish-curtain scene-polish-opening-prelude${closing ? ' story-transition--closing scene-polish-curtain--closing' : ''}`}
    data-opening-prelude={OPENING_PRELUDE.id}
    data-story-transition={OPENING_PRELUDE.id}
    role="dialog"
    aria-modal="true"
    aria-labelledby="opening-prelude-title"
    aria-describedby="opening-prelude-copy opening-prelude-time"
    onKeyDown={(event) => { if (event.key === 'Tab') event.preventDefault(); }}
  >
    <div className="story-transition__content">
      <p className="story-transition__eyebrow">失踪前言</p>
      <h1 id="opening-prelude-title">暗潮</h1>
      <div id="opening-prelude-copy" className="story-transition__copy">
        {OPENING_PRELUDE.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <p id="opening-prelude-time" className="scene-polish-opening-prelude__time">{OPENING_PRELUDE.playTime}</p>
    <button ref={buttonRef} type="button" disabled={closing} onClick={() => beginExit()}>{OPENING_PRELUDE.actionLabel}</button>
    </div>
  </section>;
}

import { useEffect, useRef } from 'react';
import type { StoryTransitionRecord } from '../data/storyTransitionData';

export function StoryTransition({ transition, onContinue }: { transition: StoryTransitionRecord; onContinue: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { buttonRef.current?.focus(); }, [transition.id]);
  return (
    <section
      className="story-transition"
      data-story-transition={transition.id}
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-transition-title"
      aria-describedby="story-transition-copy"
      onKeyDown={(event) => {
        if (event.key === 'Tab') event.preventDefault();
        if (event.key === 'Escape') onContinue();
      }}
    >
      <div className="story-transition__content">
        <p className="story-transition__eyebrow">{transition.eyebrow}</p>
        <h1 id="story-transition-title">{transition.title}</h1>
        <div id="story-transition-copy" className="story-transition__copy">
          {transition.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <button ref={buttonRef} type="button" onClick={onContinue}>{transition.actionLabel}</button>
      </div>
    </section>
  );
}

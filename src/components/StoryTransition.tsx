import { useEffect, useRef } from 'react';
import type { StoryTransitionRecord } from '../data/storyTransitionData';

export function StoryTransitionLaunch({ transition, onOpen }: { transition: StoryTransitionRecord; onOpen: () => void }) {
  return <aside className="story-transition-launch" aria-label="下一步调查已就绪">
    <span>{transition.eyebrow}</span>
    <p>这一步已有新的线索。准备好后，再继续往下调查。</p>
    <button type="button" onClick={onOpen}>进行下一步调查</button>
  </aside>;
}

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

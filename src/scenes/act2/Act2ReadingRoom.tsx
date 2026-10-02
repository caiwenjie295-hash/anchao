import type { ReactNode } from 'react';

export interface Act2ReadingRoomProps {
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  archive: ReactNode;
  reader: ReactNode;
  after?: ReactNode;
  className?: string;
}

/** Shared library layout for the gazette pages and the old records at the end of the same volume. */
export function Act2ReadingRoom({ ariaLabel, eyebrow, title, description, archive, reader, after, className = '' }: Act2ReadingRoomProps) {
  return <section className={`act2-reading-room${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
    <header className="act2-reading-room__heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{description}</span>
    </header>
    <div className="act2-reading-room__workspace">
      <aside className="act2-reading-room__archive" aria-label="书架、目录与索引">{archive}</aside>
      <div className="act2-reading-room__reader" role="region" aria-label="当前阅读内容">{reader}</div>
    </div>
    {after && <div className="act2-reading-room__after">{after}</div>}
  </section>;
}

export default Act2ReadingRoom;

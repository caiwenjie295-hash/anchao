import type { CSSProperties } from 'react';

export function DoubleSSymbol({ className = '', label = '双 S 十字', style }: { className?: string; label?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} viewBox="0 0 60 60" role="img" aria-label={label} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M30 7C8 7 8 29 30 30S52 53 30 53M30 7C52 7 52 29 30 30S8 53 30 53M7 30H53M30 7V53" fill="none" /></svg>;
}

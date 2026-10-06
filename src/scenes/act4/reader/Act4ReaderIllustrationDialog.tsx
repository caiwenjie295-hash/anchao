import { createPortal } from 'react-dom';
import type { KeyboardEventHandler, Ref } from 'react';

export function Act4ReaderIllustrationDialog({
  source,
  alt,
  dialogRef,
  onKeyDown,
  onClose,
}: {
  source: string;
  alt: string;
  dialogRef: Ref<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onClose: () => void;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(<div ref={dialogRef} className="a4-reader__zoom" role="dialog" aria-modal="true" aria-label="放大配图" onKeyDown={onKeyDown}>
    <button type="button" onClick={onClose}>关闭配图，回到正文</button>
    <img src={source} alt={alt} />
  </div>, document.body);
}

import { createPortal } from 'react-dom';
import { useState, type KeyboardEventHandler, type Ref } from 'react';

export function Act4ReaderIllustrationDialog({
  source,
  alt,
  fallback,
  dialogRef,
  onKeyDown,
  onClose,
}: {
  source?: string;
  alt: string;
  fallback: string;
  dialogRef: Ref<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onClose: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  if (typeof document === 'undefined') return null;
  return createPortal(<div ref={dialogRef} className="a4-reader__zoom" role="dialog" aria-modal="true" aria-label="放大配图" onKeyDown={onKeyDown}>
    <button type="button" onClick={onClose}>关闭配图，回到正文</button>
    {source && !imageFailed
      ? <img src={source} alt={alt} onError={() => setImageFailed(true)} />
      : <p className="a4-reader__zoom-fallback" role="status">{fallback}</p>}
  </div>, document.body);
}

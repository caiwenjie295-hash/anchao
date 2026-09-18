import { useRef } from 'react';
import { assetLoader } from '../core/assetLoader';

export function EvidenceImage({ assetId, caption }: { assetId: string; caption: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const source = assetLoader.get(assetId)!.src;
  return <>
    <button type="button" className="evidence-thumbnail" aria-label={`放大查看：${caption}`} onClick={() => dialog.current!.showModal()}>
      <img src={source} alt={caption} data-asset-id={assetId} />
    </button>
    <dialog ref={dialog} className="evidence-lightbox" aria-label={caption} onClick={(event) => { if (event.target === dialog.current) dialog.current!.close(); }}>
      <header><span>{caption}</span><button type="button" aria-label="关闭图片" onClick={() => dialog.current!.close()}>关闭 ×</button></header>
      <img src={source} alt={caption} />
    </dialog>
  </>;
}

import type { Ref } from 'react';

export function Act4ReaderCover({
  blockId,
  assetId,
  source,
  alt,
  period,
  title,
  wangaoMemory,
  zoomButtonRef,
  onImageError,
  onZoom,
}: {
  blockId: string;
  assetId?: string;
  source?: string;
  alt: string;
  period: string;
  title: string;
  wangaoMemory: boolean;
  zoomButtonRef: Ref<HTMLButtonElement>;
  onImageError: () => void;
  onZoom: () => void;
}) {
  return <section className="a4-reader__cover" data-cover-for={blockId} data-reader-active="true" aria-label={`${title}封面`} tabIndex={-1}>
    <div className="a4-reader__cover-art" data-illustration-id={assetId}>
      {source ? <img src={source} alt={alt} onError={onImageError} /> : <div className="a4-reader__art-placeholder">{alt}</div>}
      {source && <button ref={zoomButtonRef} type="button" onClick={onZoom}>放大配图</button>}
    </div>
    <div className="a4-reader__cover-copy">
      <p>{period}{wangaoMemory ? ' · 王澳当时的亲历' : ''}</p>
      <h3>{title}</h3>
      <span>按下方按钮，翻开这一段。</span>
    </div>
  </section>;
}

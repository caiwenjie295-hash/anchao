import { useState, type CSSProperties } from 'react';
import { assetLoader } from '../../../core/assetLoader';
import { act4ParagraphKind } from '../../../data/narrative/act4Presentation';
import './Act4LastConsciousness.css';

type BroadcastFrame = { assetId: string; alt: string; blur: number; scale: number };

function frameForParagraph(paragraphs: readonly string[], paragraphIndex: number): BroadcastFrame {
  const fallenIndex = paragraphs.findIndex((paragraph) => paragraph.startsWith('我倒在地上，慢慢闭上眼睛'));
  const wordIndexes = paragraphs.flatMap((paragraph, index) =>
    act4ParagraphKind('T09', 'T09_BROADCAST', index, paragraph) === 'broadcast-word' ? [index] : []);
  const nearDoorIndex = wordIndexes[3] ?? Math.max(1, Math.floor(paragraphs.length / 2));

  if (fallenIndex >= 0 && paragraphIndex >= fallenIndex) {
    return {
      assetId: 'IMG_A4_FINALE_SURROUND_001',
      alt: '倒地后的第一人称视角，几名戴防毒面具的人影围拢，面孔无法辨认',
      blur: 0,
      scale: 1,
    };
  }

  if (paragraphIndex < 2) {
    return {
      assetId: 'IMG_A4_T09_004',
      alt: '王澳从旧址走廊远处望向出口门，门外透进晨光',
      blur: 0,
      scale: 1,
    };
  }

  if (paragraphIndex >= nearDoorIndex) {
    const approachRange = Math.max(1, (fallenIndex >= 0 ? fallenIndex - 1 : paragraphs.length - 1) - nearDoorIndex);
    const approach = Math.max(0, Math.min(1, (paragraphIndex - nearDoorIndex) / approachRange));
    return {
      assetId: 'IMG_A4_FINALE_DOOR_002',
      alt: '王澳接近出口门槛的第一人称视角，门外春光逐渐失焦',
      blur: Number((1 + approach * 2.5).toFixed(1)),
      scale: Number((1.02 + approach * 0.045).toFixed(3)),
    };
  }

  const approach = nearDoorIndex > 0 ? paragraphIndex / nearDoorIndex : 0;
  return {
    assetId: 'IMG_A4_FINALE_DOOR_001',
    alt: '王澳从走廊数米外望向出口门，门外有清晨的春光',
    blur: Number((approach * 0.7).toFixed(1)),
    scale: Number((1 + approach * 0.02).toFixed(3)),
  };
}

export function Act4LastConsciousness({
  paragraphs,
  onCompleteChange,
}: {
  paragraphs: readonly string[];
  onCompleteChange?: (complete: boolean) => void;
}) {
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [failedAssets, setFailedAssets] = useState<ReadonlySet<string>>(() => new Set());
  const lastParagraphIndex = Math.max(0, paragraphs.length - 1);
  const complete = paragraphIndex >= lastParagraphIndex && paragraphs.length > 0;
  const currentParagraph = paragraphs[paragraphIndex] ?? '';
  const frame = frameForParagraph(paragraphs, paragraphIndex);
  const imageSource = assetLoader.get(frame.assetId)?.src;
  const imageAvailable = Boolean(imageSource) && !failedAssets.has(frame.assetId);
  const currentKind = act4ParagraphKind('T09', 'T09_BROADCAST', paragraphIndex, currentParagraph);
  const currentClass = currentKind ? `a4-last-consciousness__live-text a4-last-consciousness__live-text--${currentKind}` : 'a4-last-consciousness__live-text';

  const revealNextParagraph = () => {
    if (complete || paragraphs.length === 0) return;
    const nextIndex = paragraphIndex + 1;
    setParagraphIndex(nextIndex);
    if (nextIndex >= lastParagraphIndex) onCompleteChange?.(true);
  };

  const returnToPreviousParagraph = () => {
    if (paragraphIndex === 0) return;
    setParagraphIndex((index) => Math.max(0, index - 1));
    setTranscriptOpen(false);
    onCompleteChange?.(false);
  };

  const replay = () => {
    setParagraphIndex(0);
    setTranscriptOpen(false);
    onCompleteChange?.(false);
  };

  const finishAfterReadingTranscript = () => {
    setParagraphIndex(lastParagraphIndex);
    setTranscriptOpen(false);
    onCompleteChange?.(true);
  };

  return <section
    className="a4-last-consciousness"
    aria-label="门外广播逐句回忆"
    data-last-consciousness-index={paragraphIndex}
    data-last-consciousness-complete={complete}
  >
    <figure className="a4-last-consciousness__frame">
      {imageAvailable
        ? <img
          key={frame.assetId}
          src={imageSource}
          alt={frame.alt}
          data-asset-id={frame.assetId}
          style={{ '--consciousness-blur': `${frame.blur}px`, '--consciousness-scale': frame.scale } as CSSProperties}
          onError={() => setFailedAssets((assets) => new Set([...assets, frame.assetId]))}
        />
        : <div className="a4-last-consciousness__image-fallback" role="img" aria-label={frame.alt}>
          <span>画面暂未载入；可以继续听，也可以阅读完整原文。</span>
        </div>}
    </figure>

    <p className={currentClass} data-current-paragraph-index={paragraphIndex} aria-live="polite" aria-atomic="true">
      {currentParagraph || '广播文本暂不可用。'}
    </p>

    <div className="a4-last-consciousness__controls" role="group" aria-label="广播阅读控制">
      <button type="button" onClick={returnToPreviousParagraph} disabled={paragraphIndex === 0}>上一步</button>
      <button type="button" onClick={replay} disabled={paragraphIndex === 0 && !transcriptOpen}>从头重看</button>
      <button type="button" onClick={revealNextParagraph} disabled={complete || paragraphs.length === 0}>
        {complete ? '这一段已读完' : `继续听（${paragraphIndex}/${lastParagraphIndex}）`}
      </button>
    </div>

    <details className="a4-last-consciousness__transcript" open={transcriptOpen} onToggle={(event) => setTranscriptOpen(event.currentTarget.open)}>
      <summary>阅读全文（查看六词与全部回应）</summary>
      <div className="a4-reader__paragraphs" aria-label="广播完整原文">
        {paragraphs.map((paragraph, index) => {
          const kind = act4ParagraphKind('T09', 'T09_BROADCAST', index, paragraph);
          const className = kind ? `a4-reader__paragraph a4-reader__paragraph--${kind}` : 'a4-reader__paragraph';
          return <p className={className} key={`broadcast-original-${index}`}>{paragraph}</p>;
        })}
      </div>
      <button type="button" onClick={finishAfterReadingTranscript} disabled={paragraphs.length === 0}>
        我已读完全文，继续
      </button>
    </details>
  </section>;
}

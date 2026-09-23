import { useMemo, useState, useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { act2Tales, taleById, taleCards, taleColumns, type TaleColumn, tales } from '../../data/act2TalesData';
import '../../act2/t04Tales.css';

export interface TalesInvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void; }

/** T04：原文阅读、收集与资料整理。正文和辅助说明均只读取独立数据文件。 */
export function TalesInvestigation({ manager = stateManager, onReturnToDesktop }: TalesInvestigationProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const progress = state.modules.act2Research.tales;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const selected = selectedId ? taleById.get(selectedId) ?? null : null;
  const allCollected = progress.collectedTaleIds.length === tales.length;
  const lockedCardId = mistakes >= 2 ? taleCards.find((card) => !progress.placedCardIds.includes(card.id))?.id ?? null : null;
  const unplacedCards = useMemo(() => taleCards.filter((card) => !progress.placedCardIds.includes(card.id)), [progress.placedCardIds]);

  if (state.modules.act2Research.stage !== 'tales') return null;
  const openRecord = (id: string) => { setSelectedId(id); setExplanationOpen(false); };
  const markRead = () => selected && manager.readAct2Tale(selected.id);
  const collect = () => selected && manager.collectAct2Tale(selected.id);
  const tryPlace = (column: TaleColumn, cardId = selectedCardId) => {
    if (!cardId) return;
    const card = taleCards.find((item) => item.id === cardId);
    if (!card || progress.placedCardIds.includes(cardId)) return;
    if (card.column !== column) { setMistakes((value) => value + 1); return; }
    manager.placeAct2TaleCard(cardId);
    setSelectedCardId(null);
  };

  return <section className="act2-tales" aria-label="三篇志异调查">
    <header className="act2-tales__header"><p>{act2Tales.scene.eyebrow}</p><h1>{act2Tales.scene.title}</h1><p>{act2Tales.scene.intro}</p></header>
    <div className="act2-tales__layout">
      <aside className="act2-tales__index" aria-label="卷末索引"><h2>卷末索引</h2><ul>{act2Tales.records.map((record) => {
        const isTale = record.id.startsWith('TALE_'); const read = progress.readTaleIds.includes(record.id);
        return <li key={record.id}><button type="button" className={`${isTale ? 'act2-tales__record act2-tales__record--tale' : 'act2-tales__record'}`} aria-current={selectedId === record.id ? 'true' : undefined} onClick={() => openRecord(record.id)}>
          <span>{record.title}</span><small>{record.era} · {record.page}</small><em>{record.summary}</em>{isTale && <i aria-label={read ? '已读' : '待读'}>{read ? '已读' : '·'}</i>}
        </button></li>;
      })}</ul></aside>
      <main className="act2-tales__reader">
        {!selected ? <p className="act2-tales__idle">从索引里取一页。三篇有书签痕迹的旧录，夹在普通杂记之间。</p> : selected.paragraphs ? <article className="act2-tales__paper" data-tale-id={selected.id}>
          <header><p>{selected.era} · {selected.page}</p><h2>{selected.title}</h2></header>
          <div className="act2-tales__original" aria-label="原文">{selected.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          <details className="act2-tales__explanation" open={explanationOpen} onToggle={(event) => setExplanationOpen((event.target as HTMLDetailsElement).open)}><summary>现代文说明</summary><p>{selected.modernExplanation}</p></details>
          {!progress.readTaleIds.includes(selected.id) ? <button className="act2-tales__read" type="button" onClick={markRead}>读完此篇</button> : <button className="act2-tales__collect" type="button" onClick={collect} disabled={progress.collectedTaleIds.includes(selected.id)}>{progress.collectedTaleIds.includes(selected.id) ? '已加入调查笔记' : act2Tales.scene.collectLabel}</button>}
        </article> : <article className="act2-tales__noise"><h2>{selected.title}</h2><p>{selected.era} · {selected.page}</p><p>{selected.summary}</p></article>}
      </main>
      <aside className="act2-tales__collection"><h2>{act2Tales.scene.collectionTitle}</h2>{tales.map((tale) => <div key={tale.id} className={progress.collectedTaleIds.includes(tale.id) ? 'act2-tales__material act2-tales__material--done' : 'act2-tales__material'}><span>{progress.collectedTaleIds.includes(tale.id) ? '✓' : '○'}</span>{tale.title}</div>)}</aside>
    </div>
    {allCollected && <section className="act2-tales__sorting" aria-labelledby="tale-sorting-title"><h2 id="tale-sorting-title">{act2Tales.scene.sortTitle}</h2><p>{act2Tales.scene.sortHint}</p>{mistakes > 0 && <p className="act2-tales__mistake" role="status">这张材料不在这里。再对照原文。</p>}
      <div className="act2-tales__cards" aria-label="待整理材料">{unplacedCards.map((card) => <button key={card.id} type="button" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} className={`act2-tales__card${selectedCardId === card.id ? ' is-selected' : ''}${lockedCardId === card.id ? ' is-hinted' : ''}`} aria-pressed={selectedCardId === card.id} onClick={() => setSelectedCardId(card.id)}>{card.text}</button>)}</div>
      <div className="act2-tales__columns">{taleColumns.map((column) => <section key={column} className="act2-tales__column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => tryPlace(column, event.dataTransfer.getData('text/plain'))}><h3>{column}</h3><button type="button" className="act2-tales__drop" onClick={() => tryPlace(column)}>{selectedCardId ? `放入「${column}」` : '选择一张材料后放入'}</button><ul>{taleCards.filter((card) => card.column === column && progress.placedCardIds.includes(card.id)).map((card) => <li key={card.id}>{card.text}</li>)}</ul></section>)}</div>
      {progress.placedCardIds.length === taleCards.length && !progress.sorted && <button type="button" className="act2-tales__finish-sort" onClick={() => manager.finishAct2TaleSorting()}>整理好这些材料</button>}
      {progress.sorted && <div className="act2-tales__inference"><p>{act2Tales.scene.inference[0]}</p><p>{act2Tales.scene.inference[1]}</p>{!progress.inferenceAcknowledged && <button type="button" onClick={() => manager.acknowledgeAct2TransferInference()}>{act2Tales.scene.acknowledgeLabel}</button>}{progress.inferenceAcknowledged && <p className="act2-tales__recorded">问题已记入桌面记事本。</p>}</div>}
    </section>}
    <footer><button type="button" className="act2-tales__return" onClick={onReturnToDesktop}>{act2Tales.scene.returnLabel}</button></footer>
  </section>;
}

export default TalesInvestigation;

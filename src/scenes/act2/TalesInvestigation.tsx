import { useEffect, useMemo, useRef, useState } from 'react';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import { assetLoader } from '../../core/assetLoader';
import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalAct2TalesSnapshot, selectAct2TalesSnapshot } from '../../core/store/selectors';
import { ACT2_SHELF_ROW_RECTS } from '../../data/act2Presentation';
import { librarySceneCopy } from '../../data/act2LibraryData';
import { act2Tales, taleById, taleEvidenceById, tales } from '../../data/act2TalesData';
import { Act2ReadingRoom } from './Act2ReadingRoom';
import { Act2ShelfMap } from './Act2ShelfMap';
import '../../act2/act2ReadingRoom.css';
import '../../act2/t04Tales.css';

export function countDistinctTaleSources(evidenceIds: readonly string[], evidenceById: ReadonlyMap<string, { taleId: string }>): number {
  return new Set(evidenceIds.map((id) => evidenceById.get(id)?.taleId).filter((id): id is string => Boolean(id))).size;
}

export interface TalesInvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void; shelfImageSrc?: string; }
type InferenceId = 'accompanied-change' | 'recovery-or-imitation' | 'complete-transfer';

/** T04: the three marked old records stay in the same reading room and volume as the gazette pages. */
export function TalesInvestigation({ manager = stateManager, onReturnToDesktop, shelfImageSrc }: TalesInvestigationProps) {
  const state = useAppSelector(manager, selectAct2TalesSnapshot, equalAct2TalesSnapshot);
  const progress = state.tales;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [pendingEvidenceFocusTaleId, setPendingEvidenceFocusTaleId] = useState<string | null>(null);
  const readerRef = useRef<HTMLElement>(null);
  const selected = selectedId ? act2Tales.records.find((record) => record.id === selectedId) ?? null : null;
  const readTales = useMemo(() => tales.filter((tale) => progress.readTaleIds.includes(tale.id)), [progress.readTaleIds]);
  const selectedSourceCount = countDistinctTaleSources(progress.supportingEvidenceIds, taleEvidenceById);
  const selectedTaleIds = new Set(progress.supportingEvidenceIds.map((id) => taleEvidenceById.get(id)?.taleId).filter((id): id is string => Boolean(id)));
  const readUnselectedTales = tales.filter((tale) => progress.readTaleIds.includes(tale.id) && !selectedTaleIds.has(tale.id));
  const unreadTales = tales.filter((tale) => !progress.readTaleIds.includes(tale.id));
  const hasJudgment = progress.inferenceAcknowledged;
  const inferenceReady = selectedSourceCount >= 2 && progress.selectedInferenceId !== null;

  if (state.stage !== 'tales') return null;

  const sceneImage = shelfImageSrc ?? assetLoader.get(librarySceneCopy.placeholderAssetId)?.src;
  const shelfEntries = tales.map((tale, index) => ({ id: tale.id, label: tale.title, rect: ACT2_SHELF_ROW_RECTS[index] }));
  const openRecord = (id: string) => {
    setSelectedId(id);
    setStatus('');
    if (taleById.has(id)) manager.readAct2Tale(id);
  };
  useEffect(() => {
    if (!pendingEvidenceFocusTaleId || selectedId !== pendingEvidenceFocusTaleId) return;
    const tale = taleById.get(pendingEvidenceFocusTaleId);
    const evidenceId = tale?.evidence?.find((evidence) => !progress.supportingEvidenceIds.includes(evidence.id))?.id;
    if (!evidenceId) { setPendingEvidenceFocusTaleId(null); return; }
    const button = readerRef.current?.querySelector<HTMLButtonElement>(`[data-evidence-id="${evidenceId}"] button`);
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    button?.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    button?.focus({ preventScroll: true });
    setPendingEvidenceFocusTaleId(null);
  }, [pendingEvidenceFocusTaleId, selectedId, progress.supportingEvidenceIds]);
  const chooseInference = (id: InferenceId) => {
    setStatus('');
    // StateManager persists the chosen interpretation only when the player confirms it.
    manager.selectAct2TaleInference(id);
  };
  const confirmInference = () => {
    if (!progress.selectedInferenceId) return;
    const result = manager.inferAct2TransferPattern(progress.selectedInferenceId);
    const messages = {
      blocked: '至少要从两篇不同的旧录中各选一条支持性片段，再确认暂定判断。',
      insufficient: '恢复或模仿能解释部分变化，但解释不了六儿留下的陌生姓名，或哑女出现的鸟鸣。这个说法还不够。',
      overclaim: '现有旧录只能显示获得之外伴随了陌生习惯或记忆，无法证明完整人格转移。',
      accepted: '暂时可以确认：获得之外，还伴随了原本不属于当事人的习惯或记忆。来源和机制仍不清楚。',
    };
    setStatus(messages[result]);
  };
  const openMaterial = (materialId: string) => {
    openRecord(materialId);
    if (taleById.has(materialId)) setPendingEvidenceFocusTaleId(materialId);
  };
  const missingEvidenceReason = selectedSourceCount >= 2
    ? '先选一种暂定判断。'
    : readUnselectedTales.length
      ? selectedSourceCount
        ? `目前已有 ${selectedSourceCount} 篇来源选入支持片段；再从已读旧录中选一条，凑足两篇不同来源。`
        : '旧录已经读过，但还没有片段选入支持范围；从已读原文中选取片段。'
      : selectedSourceCount
        ? '还需要从另一篇旧录中选择支持片段；阅读后可在原文下方直接选取。'
        : '先读旧录，再从原文下方选取支持片段。至少选自两篇不同旧录即可。';
  const evidenceCandidates = readUnselectedTales.length ? readUnselectedTales : unreadTales;
  const actions: InvestigationAction[] = [
    {
      actionId: 'A2_T04_CONFIRM_PATTERN', kind: 'story', target: 'transfer-pattern', label: hasJudgment ? '暂定结论已记下' : '确认暂定判断',
      state: hasJudgment ? 'completed' : inferenceReady ? 'ready' : 'blocked',
      reason: missingEvidenceReason,
      relatedMaterials: selectedSourceCount < 2 ? evidenceCandidates.map((tale) => ({ id: tale.id, label: readUnselectedTales.length ? `${tale.title} · 选取支持片段` : tale.title })) : undefined,
      onActivate: confirmInference,
    },
    {
      actionId: 'A2_T04_TO_SCHOOL', kind: 'move', target: 'school', label: '前往高中调查',
      state: hasJudgment ? 'ready' : 'blocked',
      reason: '先把两篇旧录共同支持的暂定判断记下来。',
      relatedMaterials: hasJudgment ? undefined : [{ id: 'RECORD_A2_T04_000', label: '卷末散页索引' }],
      onActivate: () => manager.enterAct2School(),
    },
  ];

  return <InvestigationShell
    ariaLabel="三篇志异调查"
    className="investigation-shell--reading"
    actLabel="第二幕 · 民俗疑问"
    locationLabel="县图书馆阅览室"
    contextLabel="地方志目录 · 卷册 · 卷末旧录"
    objective="对照旧录里获得的能力与随之出现的变化，判断这些记载能支持到哪一步。"
    helpText="点开照片上的三处旧录入口，或使用卷末索引。阅读会自动登记来源；选自至少两篇的支持片段后，再记录有边界的暂定判断。"
    exitLabel="退出调查，返回桌面"
    actions={actions}
    statusMessage={status}
    onExit={() => onReturnToDesktop?.()}
    onOpenMaterial={(_actionId, materialId) => openMaterial(materialId)}
  >
    <Act2ReadingRoom
      ariaLabel="县图书馆地方志卷末阅读空间"
      eyebrow={act2Tales.scene.eyebrow}
      title="地方志 · 卷末旧录"
      description="卷末三篇旧录留有书签痕迹。可从书架标记入手，也可翻开散页索引，逐篇读下去。"
      archive={<>
        <section className="act2-tales__shelf" aria-label="地方志书架">
          <h3>书架与旧录入口</h3>
          <Act2ShelfMap
            assetId={librarySceneCopy.placeholderAssetId}
            source={sceneImage}
            imageAlt="县图书馆阅览区，左侧书架上有多层地方志和县志"
            label="县图书馆书架照片"
            entries={shelfEntries}
            selectedId={selectedId}
            onSelect={openRecord}
          />
        </section>
        <details className="act2-tales__index">
          <summary>卷末散页索引 · {act2Tales.records.length} 条</summary>
          <ul>{act2Tales.records.map((record) => {
            const isTale = taleById.has(record.id);
            const read = progress.readTaleIds.includes(record.id);
            return <li key={record.id}><button type="button" className={`act2-tales__record${isTale ? ' act2-tales__record--tale' : ''}`} aria-current={selectedId === record.id ? 'true' : undefined} onClick={() => openRecord(record.id)}>
              <span>{record.title}</span><small>{record.era} · {record.page}</small><em>{record.summary}</em>{isTale && <i>{read ? '来源已登记' : '旧录'}</i>}
            </button></li>;
          })}</ul>
        </details>
        <details className="act2-tales__evidence-list">
          <summary>已选支持片段 · {selectedSourceCount}/2 篇来源</summary>
          {progress.supportingEvidenceIds.length === 0 ? <p>读过旧录后，可在原文下方选取片段。</p> : <ul>{progress.supportingEvidenceIds.map((id) => {
            const evidence = taleEvidenceById.get(id);
            const source = evidence ? taleById.get(evidence.taleId) : null;
            return evidence && source ? <li key={id}><strong>{source.title} · {evidence.label}</strong><p>{evidence.excerpt}</p><button type="button" onClick={() => openRecord(source.id)}>回看原文</button></li> : null;
          })}</ul>}
        </details>
      </>}
      reader={<>
        <section ref={readerRef} className="act2-tales__reader" aria-label="旧录原文">
          {!selected ? <div className="act2-tales__paper act2-tales__idle"><p>书架上有三处带书签痕迹的卷末旧录。选择一处，打开完整原文。</p></div> : taleById.has(selected.id) ? <article className="act2-tales__paper" data-tale-id={selected.id}>
            <header><p>{selected.era} · {selected.page}</p><h3>{selected.title}</h3></header>
            <div className="act2-tales__original" aria-label="原文">{(selected.paragraphs ?? []).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
            <details className="act2-tales__explanation"><summary>现代文说明（辅助阅读）</summary><p>{selected.modernExplanation}</p></details>
            {selected.evidence?.map((evidence) => <section className="act2-tales__evidence" key={evidence.id} data-evidence-id={evidence.id}>
              <h4>{evidence.label} · 可支持的原文片段</h4>
              <blockquote>{evidence.excerpt}</blockquote>
              <button type="button" aria-pressed={progress.supportingEvidenceIds.includes(evidence.id)} onClick={() => manager.toggleAct2TaleEvidence(evidence.id)}>{progress.supportingEvidenceIds.includes(evidence.id) ? '移出支持片段' : '选作支持片段'}</button>
            </section>)}
          </article> : <article className="act2-tales__paper act2-tales__noise"><h3>{selected.title}</h3><p>{selected.era} · {selected.page}</p><p>{selected.summary}</p></article>}
        </section>
        <details className="act2-tales__comparison" aria-labelledby="tale-comparison-title">
          <summary id="tale-comparison-title">跨篇对照 · {readTales.length}/3 篇已读</summary>
          <p>这里只列出已经读过的来源；第三篇可作补充核验。</p>
          <div className="act2-tales__table-wrap"><table><thead><tr><th>人物</th><th>原先缺少</th><th>获得或恢复</th><th>同时出现的变化</th></tr></thead><tbody>
            {readTales.map((tale) => <tr key={tale.id}><th scope="row"><button type="button" onClick={() => openRecord(tale.id)}>{tale.comparison.person}</button></th><td>{tale.comparison.missing}</td><td>{tale.comparison.gain}</td><td>{tale.comparison.accompaniedChange}</td></tr>)}
            {readTales.length === 0 && <tr><td colSpan={4}>阅读任一旧录后，这里会出现可核对的对照项。</td></tr>}
          </tbody></table></div>
        </details>
        <details className="act2-tales__hypotheses" aria-label="暂定判断选项">
          <summary>比较支持片段后，选择暂定判断</summary>
          <div className="act2-tales__hypothesis-options">
            <button type="button" data-inference-id="accompanied-change" aria-pressed={progress.selectedInferenceId === 'accompanied-change'} disabled={hasJudgment} onClick={() => chooseInference('accompanied-change')}>获得之外，同时出现原本不属于当事人的习惯或记忆</button>
            <button type="button" data-inference-id="recovery-or-imitation" aria-pressed={progress.selectedInferenceId === 'recovery-or-imitation'} disabled={hasJudgment} onClick={() => chooseInference('recovery-or-imitation')}>能力恢复后，当事人只是模仿了供物的习性</button>
            <button type="button" data-inference-id="complete-transfer" aria-pressed={progress.selectedInferenceId === 'complete-transfer'} disabled={hasJudgment} onClick={() => chooseInference('complete-transfer')}>供物原主的完整人格已经转移给当事人</button>
          </div>
        </details>
        {hasJudgment && <p className="act2-tales__recorded" aria-live="polite">暂定判断已记入调查笔记；旧录尚不能说明来源或机制。</p>}
      </>}
    />
  </InvestigationShell>;
}

export default TalesInvestigation;

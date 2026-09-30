import { useMemo, useState, useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import { act2Tales, taleById, taleEvidenceById, tales } from '../../data/act2TalesData';
import '../../act2/t04Tales.css';

export interface TalesInvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void; }
type InferenceId = 'accompanied-change' | 'recovery-or-imitation' | 'complete-transfer';

/** T04：读原文即登记来源，跨篇选证据，比较后形成有边界的暂定判断。 */
export function TalesInvestigation({ manager = stateManager, onReturnToDesktop }: TalesInvestigationProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const progress = state.modules.act2Research.tales;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const selected = selectedId ? act2Tales.records.find((record) => record.id === selectedId) ?? null : null;
  const readTales = useMemo(() => tales.filter((tale) => progress.readTaleIds.includes(tale.id)), [progress.readTaleIds]);
  const selectedSourceCount = new Set(progress.supportingEvidenceIds.map((id) => taleEvidenceById.get(id)?.taleId).filter(Boolean)).size;
  const hasJudgment = progress.inferenceAcknowledged;
  const inferenceReady = selectedSourceCount >= 2 && progress.selectedInferenceId !== null;

  if (state.modules.act2Research.stage !== 'tales') return null;

  const openRecord = (id: string) => {
    setSelectedId(id);
    setStatus('');
    if (taleById.has(id)) manager.readAct2Tale(id);
  };
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
  const openMaterial = (materialId: string) => openRecord(materialId);
  const actions: InvestigationAction[] = [
    {
      actionId: 'A2_T04_CONFIRM_PATTERN', kind: 'story', target: 'transfer-pattern', label: hasJudgment ? '暂定结论已记下' : '确认暂定判断',
      state: hasJudgment ? 'completed' : inferenceReady ? 'ready' : 'blocked',
      reason: selectedSourceCount < 2 ? '还需要核对至少两篇旧录中的支持片段。' : '先选一种暂定判断。',
      relatedMaterials: selectedSourceCount < 2 ? tales.filter((tale) => !progress.readTaleIds.includes(tale.id)).map((tale) => ({ id: tale.id, label: tale.title })) : undefined,
      onActivate: confirmInference,
    },
    {
      actionId: 'A2_T04_TO_SCHOOL', kind: 'move', target: 'school', label: '前往高中调查',
      state: hasJudgment ? 'ready' : 'blocked',
      reason: '先把两篇旧录共同支持的暂定判断记下来。',
      relatedMaterials: hasJudgment ? undefined : [{ id: 'RECORD_A2_T04_000', label: '三篇志异索引' }],
      onActivate: () => manager.enterAct2School(),
    },
  ];

  return <InvestigationShell
    ariaLabel="三篇志异调查"
    actLabel="第二幕 · 民俗与人物调查"
    locationLabel="县志阅览室"
    contextLabel="卷末散页 · 当前调查"
    objective="对照旧录里获得的能力与随之出现的变化，判断这些记载能支持到哪一步。"
    helpText="点开任一条志异会自动登记阅读来源。读过至少两篇后，可选择支持性片段并比较；白话说明只作辅助。"
    exitLabel="退出调查，返回桌面"
    actions={actions}
    statusMessage={status}
    onExit={() => onReturnToDesktop?.()}
    onOpenMaterial={(_actionId, materialId) => openMaterial(materialId)}
  >
    <section className="act2-tales" aria-label="三篇志异材料">
      <div className="act2-tales__intro"><p>{act2Tales.scene.eyebrow}</p><h2>{act2Tales.scene.title}</h2><p>{act2Tales.scene.intro}</p></div>
      <div className="act2-tales__layout">
        <aside className="act2-tales__index" aria-label="卷末索引"><h3>卷末索引</h3><ul>{act2Tales.records.map((record) => {
          const isTale = taleById.has(record.id); const read = progress.readTaleIds.includes(record.id);
          return <li key={record.id}><button type="button" className={`act2-tales__record${isTale ? ' act2-tales__record--tale' : ''}`} aria-current={selectedId === record.id ? 'true' : undefined} onClick={() => openRecord(record.id)}>
            <span>{record.title}</span><small>{record.era} · {record.page}</small><em>{record.summary}</em>{isTale && <i>{read ? '来源已登记' : '旧录'}</i>}
          </button></li>;
        })}</ul></aside>
        <main className="act2-tales__reader">
          {!selected ? <p className="act2-tales__idle">从索引中选择一页。三篇有书签痕迹的旧录夹在普通杂记之间。</p> : taleById.has(selected.id) ? <article className="act2-tales__paper" data-tale-id={selected.id}>
            <header><p>{selected.era} · {selected.page}</p><h3>{selected.title}</h3></header>
            <div className="act2-tales__original" aria-label="原文">{(selected.paragraphs ?? []).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
            <details className="act2-tales__explanation"><summary>现代文说明（辅助阅读）</summary><p>{selected.modernExplanation}</p></details>
            {selected.evidence?.map((evidence) => <div className="act2-tales__evidence" key={evidence.id}>
              <strong>{evidence.label}</strong><blockquote>{evidence.excerpt}</blockquote>
              <button type="button" aria-pressed={progress.supportingEvidenceIds.includes(evidence.id)} onClick={() => manager.toggleAct2TaleEvidence(evidence.id)}>{progress.supportingEvidenceIds.includes(evidence.id) ? '移出支持片段' : '选作支持片段'}</button>
            </div>)}
          </article> : <article className="act2-tales__noise"><h3>{selected.title}</h3><p>{selected.era} · {selected.page}</p><p>{selected.summary}</p></article>}
        </main>
        <aside className="act2-tales__evidence-list" aria-label="已选支持片段"><h3>已选支持片段 <span>{selectedSourceCount}/2 篇来源</span></h3>
          {progress.supportingEvidenceIds.length === 0 ? <p>读过旧录后，可在原文下方选取片段。</p> : <ul>{progress.supportingEvidenceIds.map((id) => { const evidence = taleEvidenceById.get(id); const source = evidence ? taleById.get(evidence.taleId) : null; return evidence && source ? <li key={id}><strong>{source.title} · {evidence.label}</strong><p>{evidence.excerpt}</p><button type="button" onClick={() => openRecord(source.id)}>回看原文</button></li> : null; })}</ul>}
        </aside>
      </div>
      <section className="act2-tales__comparison" aria-labelledby="tale-comparison-title">
        <h3 id="tale-comparison-title">跨篇对照</h3><p>这里只列出已经读过的来源；第三篇可作补充核验。</p>
        <div className="act2-tales__table-wrap"><table><thead><tr><th>人物</th><th>原先缺少</th><th>获得或恢复</th><th>同时出现的变化</th></tr></thead><tbody>
          {readTales.map((tale) => <tr key={tale.id}><th scope="row"><button type="button" onClick={() => openRecord(tale.id)}>{tale.comparison.person}</button></th><td>{tale.comparison.missing}</td><td>{tale.comparison.gain}</td><td>{tale.comparison.accompaniedChange}</td></tr>)}
          {readTales.length === 0 && <tr><td colSpan={4}>阅读任一旧录后，这里会出现可核对的对照项。</td></tr>}
        </tbody></table></div>
      </section>
      <section className="act2-tales__hypotheses" aria-label="暂定判断选项">
        <h3>你认为这些记载目前支持哪种说法？</h3>
        <button type="button" data-inference-id="accompanied-change" aria-pressed={progress.selectedInferenceId === 'accompanied-change'} disabled={hasJudgment} onClick={() => chooseInference('accompanied-change')}>获得之外，同时出现原本不属于当事人的习惯或记忆</button>
        <button type="button" data-inference-id="recovery-or-imitation" aria-pressed={progress.selectedInferenceId === 'recovery-or-imitation'} disabled={hasJudgment} onClick={() => chooseInference('recovery-or-imitation')}>能力恢复后，当事人只是模仿了供物的习性</button>
        <button type="button" data-inference-id="complete-transfer" aria-pressed={progress.selectedInferenceId === 'complete-transfer'} disabled={hasJudgment} onClick={() => chooseInference('complete-transfer')}>供物原主的完整人格已经转移给当事人</button>
      </section>
      {hasJudgment && <p className="act2-tales__recorded">暂定判断已记入调查笔记；旧录尚不能说明来源或机制。</p>}
    </section>
  </InvestigationShell>;
}

export default TalesInvestigation;

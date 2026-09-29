import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import { assetLoader } from '../../core/assetLoader';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import type { Act2SchoolEvidenceId } from '../../core/types';
import { act2School, schoolAreaById } from '../../data/act2SchoolData';
import { SchoolSymbolComparison } from './SchoolSymbolComparison';
import '../../act2/t05School.css';

export interface SchoolInvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void }

export function SchoolInvestigation({ manager = defaultManager, onReturnToDesktop }: SchoolInvestigationProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const [areaId, setAreaId] = useState('AREA_A2_T05_GATE');
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [timelineFeedback, setTimelineFeedback] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const previousTriggerRef = useRef<HTMLElement | null>(null);
  const area = schoolAreaById.get(areaId)!;
  const availableHotspots = act2School.hotspots.filter((hotspot) => hotspot.areaId === areaId);
  const hotspot = hotspotId ? act2School.hotspots.find((item) => item.id === hotspotId) : undefined;
  const flags = state.game.flags;
  const schoolProgress = state.modules.act2Research.school;
  const isComplete = flags.FLAG_A2_SS_MATCH_CONFIRMED === true;
  const timelineEvidence: { id: Act2SchoolEvidenceId; flag: string; label: string; detail: string }[] = [
    { id: 'teacher-account', flag: 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', label: '班主任的回忆', detail: '休学两个月，回来后更安静、疏远同学，并把时间放在学习上。' },
    { id: 'rank-record', flag: 'FLAG_A2_SCORE_CHANGE_KNOWN', label: '历次成绩记录', detail: '王澳的名次在多次记录中逐步提高。' },
    { id: 'qiming-thankyou', flag: 'FLAG_A2_QIMING_NAME_FOUND', label: '成绩表下方的感谢文字', detail: '落款提到启明在两个月里的教育和培养。' },
  ];
  const selectedSourceCount = schoolProgress.selectedEvidenceIds.length;
  const timelineReady = schoolProgress.symbolMatchConfirmed && selectedSourceCount >= 2 && schoolProgress.selectedInferenceId === 'bounded-timeline';
  const actions: InvestigationAction[] = [
    { actionId: 'A2_T05_CONFIRM_TIMELINE', kind: 'story', target: 'school-timeline', label: isComplete ? '暂定时间线已记下' : '记录暂定时间线判断', state: isComplete ? 'completed' : timelineReady ? 'ready' : 'blocked', reason: !schoolProgress.symbolMatchConfirmed ? '先把旧笔记页边的记号与第一幕照片并排核对。' : selectedSourceCount < 2 ? '至少选取两种不同来源，比较休学前后的变化。' : '请选择不超出材料的暂定判断。', onActivate: () => manager.confirmAct2SchoolTimeline() },
    { actionId: 'A2_T05_TO_QIMING', kind: 'move', target: 'qiming-research', label: '前往浏览器核查启明', state: isComplete ? 'ready' : 'blocked', reason: '先核对照片上的共同记号，再用至少两种来源记录休学前后的变化。', onActivate: () => { manager.enterAct2QimingResearch(); onReturnToDesktop?.(); manager.openApp('browser'); } },
  ];
  const areaImage = assetLoader.get(area.imageId)?.src;
  const notebookImage = assetLoader.get('IMG_A2_T05_006')?.src;

  useEffect(() => { manager.visitAct2SchoolArea(areaId); }, [areaId, manager]);
  useEffect(() => {
    if (hotspotId && !comparisonOpen) dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    else if (!hotspotId && !comparisonOpen) previousTriggerRef.current?.focus();
  }, [hotspotId, comparisonOpen]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (comparisonOpen) setComparisonOpen(false);
      else if (hotspotId) setHotspotId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [comparisonOpen, hotspotId]);

  const openHotspot = (id: string, trigger?: HTMLElement) => {
    if (trigger) previousTriggerRef.current = trigger;
    manager.inspectAct2SchoolHotspot(id);
    setHotspotId(id);
  };

  return <InvestigationShell
    ariaLabel="高中调查"
    actLabel="第二幕 · 人物调查"
    locationLabel={area.title}
    contextLabel="回到高中 · 沿记忆中的路线核对"
    objective="确认休学前后的变化，并把学校记录与双 S 记号放在一起判断。"
    helpText="可以在学校地点间往返。班主任回忆、成绩记录、感谢文字是不同来源；读过后再选择它们能支持的判断。照片入口与地点列表使用相同路线。"
    actions={actions}
    statusMessage={timelineFeedback}
    onExit={() => onReturnToDesktop?.()}
  >
  <section className="t05-school" aria-label="高中调查" data-asset-id={area.imageId}>
    <div className="t05-school__intro">{act2School.intro}</div>
    <div className="t05-school__layout">
      <aside className="t05-school__map" aria-label="学校地点">
        <h2>学校</h2>
        <p>当前位置：{area.title}</p>
        <nav>{act2School.areas.map((item) => <button type="button" key={item.id} aria-current={areaId === item.id ? 'location' : undefined} onClick={() => { setAreaId(item.id); setHotspotId(null); }}>{item.title}</button>)}</nav>
      </aside>
      <main className="t05-school__room">
        <div className={`t05-school__backdrop t05-school__backdrop--${area.id.toLowerCase().replaceAll('_', '-')}${areaImage ? ' t05-school__backdrop--image' : ''}`} data-asset-id={area.imageId}>
          {areaImage && <img src={areaImage} alt="" />}
          <p>{area.title}</p>
          {availableHotspots.map((item) => <button type="button" key={item.id} className="t05-school__image-hotspot" style={{ left: `${item.focus.x}%`, top: `${item.focus.y}%` }} onClick={(event) => openHotspot(item.id, event.currentTarget)}>{item.actionLabel}</button>)}
          <nav className="t05-school__image-routes" aria-label="从照片前往相邻地点">{area.links.map((id) => { const target = schoolAreaById.get(id)!; return <button type="button" key={id} onClick={() => { setAreaId(id); setHotspotId(null); }}>{target.title} →</button>; })}</nav>
        </div>
        <h2>{area.title}</h2>
        <p className="t05-school__description">{area.description}</p>
        {area.id === 'AREA_A2_T05_TEACHER_OFFICE' && flags.FLAG_A2_SCHOOL_SS_FOUND !== true && <p className="t05-school__soft-hint">{act2School.softHint}</p>}
      </main>
    </div>
    <section className="t05-school__timeline" aria-label="休学前后对照">
      <h2>休学前后，哪些变化有材料支持？</h2>
      <p>选读过的来源，再判断它们能说明什么。至少选择两种来源；访问地点本身不计作证据。</p>
      <div className="t05-school__evidence-options">
        {timelineEvidence.map((item) => {
          const available = flags[item.flag] === true;
          const selected = schoolProgress.selectedEvidenceIds.includes(item.id);
          return <button type="button" key={item.id} disabled={!available || isComplete} aria-pressed={selected} onClick={() => manager.toggleAct2SchoolEvidence(item.id)}>
            <strong>{item.label}</strong><span>{available ? item.detail : '先在对应地点读到这份记录。'}</span><small>{selected ? '已选作支持来源' : available ? '选作支持来源' : '尚未读到'}</small>
          </button>;
        })}
      </div>
      <p className="t05-school__evidence-count">已选不同来源：{selectedSourceCount} / 2</p>
      <h3>目前能作出的判断</h3>
      <div className="t05-school__inferences">
        <button type="button" aria-pressed={schoolProgress.selectedInferenceId === 'bounded-timeline'} disabled={isComplete} onClick={() => { manager.selectAct2SchoolInference('bounded-timeline'); setTimelineFeedback('材料共同支持休学后的变化，以及同期成绩提升；它们没有证明变化的具体原因。'); }}>
          休学后他的表现和成绩都有明显变化；启明的培养与这段时间有关，但材料没有证明因果。
        </button>
        <button type="button" aria-pressed={schoolProgress.selectedInferenceId === 'qiming-caused-change'} disabled={isComplete} onClick={() => { manager.selectAct2SchoolInference('qiming-caused-change'); setTimelineFeedback('现有记录能说明时间上的关联，不能证明启明造成了性情或身份变化。'); }}>
          启明的培养已经证明造成了小 A 的性情或身份变化。
        </button>
      </div>
      {isComplete && <p className="t05-school__ending" aria-live="polite"><strong>{act2School.matchNote}</strong> · 双 S 比对与两种来源支持的暂定时间线已记入笔记。</p>}
    </section>
    {hotspot && <div className="t05-school__dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setHotspotId(null); }}>
      <section ref={dialogRef} className="t05-school__dialog" role="dialog" aria-modal="true" aria-labelledby="t05-school-dialog-title">
        <header><h2 id="t05-school-dialog-title">{hotspot.title}</h2><button type="button" aria-label="关闭" onClick={() => setHotspotId(null)}>关闭 ×</button></header>
        {hotspot.id === 'HOTSPOT_A2_T05_RANKS' ? <>
          <p>{hotspot.recordTitle} · {hotspot.studentName}</p><ol className="t05-school__ranks">{hotspot.ranks?.map((rank, index) => <li key={`${rank}-${index}`}>{hotspot.studentName} · 第 {index + 1} 次记录 <strong>{rank}</strong> 名</li>)}</ol>
          <button type="button" onClick={() => manager.readAct2SchoolRanks()}>{flags.FLAG_A2_SCORE_CHANGE_KNOWN === true ? '已记下名次' : '记下这组名次'}</button>
          {flags.FLAG_A2_SCORE_CHANGE_KNOWN === true && <button type="button" onClick={(event) => openHotspot('HOTSPOT_A2_T05_QIMING_TEXT', event.currentTarget)}>查看成绩表下方的感谢文字</button>}
        </> : hotspot.id === 'HOTSPOT_A2_T05_QIMING_TEXT' ? <><p>{hotspot.content}</p><button type="button" onClick={() => manager.readAct2QimingTestimonial()}>{flags.FLAG_A2_QIMING_NAME_FOUND === true ? '已记入笔记' : '记下这段文字'}</button></>
          : hotspot.id === 'HOTSPOT_A2_T05_TEACHER' ? <><p>{hotspot.content}</p><button type="button" onClick={() => manager.acknowledgeAct2TeacherAccount()}>{flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN === true ? '已记入笔记' : '记下老师的回忆'}</button></>
            : <><div className={`t05-school__notebook-page${notebookImage ? ' t05-school__notebook-page--image' : ''}`} data-asset-id="IMG_A2_T05_006"><div className="t05-school__notebook-visual">{notebookImage && <img src={notebookImage} alt="学霸笔记原页" />}<DoubleSSymbol className="t05-school__notebook-symbol" label="学霸笔记页边的双 S 符号" /></div><div className="t05-school__notebook-copy"><strong>{act2School.notebookPage.heading}</strong>{act2School.notebookPage.lines.map((line) => <div key={line}>{line}</div>)}<small>{act2School.notebookPage.replacementNote}</small></div></div><p>{hotspot.content}</p><button type="button" onClick={() => { manager.inspectAct2SchoolNotebook(); setComparisonOpen(true); }}>打开双 S 比对</button></>}
      </section>
    </div>}
    {comparisonOpen && <div className="t05-school__dialog-backdrop" role="presentation"><SchoolSymbolComparison manager={manager} onClose={() => setComparisonOpen(false)} /></div>}
  </section>
  </InvestigationShell>;
}

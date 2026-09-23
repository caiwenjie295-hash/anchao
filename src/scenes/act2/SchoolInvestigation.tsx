import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import { act2School, schoolAreaById } from '../../data/act2SchoolData';
import { SchoolSymbolComparison } from './SchoolSymbolComparison';
import '../../act2/t05School.css';

export interface SchoolInvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void }

export function SchoolInvestigation({ manager = defaultManager, onReturnToDesktop }: SchoolInvestigationProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const [areaId, setAreaId] = useState('AREA_A2_T05_GATE');
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousTriggerRef = useRef<HTMLElement | null>(null);
  const area = schoolAreaById.get(areaId)!;
  const availableHotspots = act2School.hotspots.filter((hotspot) => hotspot.areaId === areaId);
  const hotspot = hotspotId ? act2School.hotspots.find((item) => item.id === hotspotId) : undefined;
  const flags = state.game.flags;
  const isComplete = flags.FLAG_A2_SS_MATCH_CONFIRMED === true;

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

  return <section className="t05-school" aria-label="高中调查" data-asset-id={area.imageId}>
    <header className="t05-school__header">
      <div><p>第二幕 · T05</p><h1>回到高中</h1><span>沿着记忆里的路线看看</span></div>
      <button type="button" className="t05-school__return" onClick={onReturnToDesktop}>返回桌面</button>
    </header>
    <div className="t05-school__intro">{act2School.intro}</div>
    <div className="t05-school__layout">
      <aside className="t05-school__map" aria-label="学校地点">
        <h2>学校</h2>
        <p>当前位置：{area.title}</p>
        <nav>{act2School.areas.map((item) => <button type="button" key={item.id} aria-current={areaId === item.id ? 'location' : undefined} onClick={() => { setAreaId(item.id); setHotspotId(null); }}>{item.title}</button>)}</nav>
      </aside>
      <main className="t05-school__room">
        <div className={`t05-school__backdrop t05-school__backdrop--${area.id.toLowerCase().replaceAll('_', '-')}`} data-asset-id={area.imageId}>
          <p>{area.title}</p>
          {area.id === 'AREA_A2_T05_CORRIDOR' && <span className="t05-school__hydrant" aria-label="墙边的消防栓">消防栓</span>}
        </div>
        <h2>{area.title}</h2>
        <p className="t05-school__description">{area.description}</p>
        {availableHotspots.length > 0 && <div className="t05-school__hotspots" aria-label="可以查看的内容">
          {availableHotspots.map((item) => <button type="button" key={item.id} onClick={(event) => openHotspot(item.id, event.currentTarget)}>{item.actionLabel}</button>)}
        </div>}
        {area.id === 'AREA_A2_T05_TEACHER_OFFICE' && flags.FLAG_A2_SCHOOL_SS_FOUND !== true && <p className="t05-school__soft-hint">{act2School.softHint}</p>}
        <nav className="t05-school__routes" aria-label="相邻地点">
          <span>前往：</span>{area.links.map((id) => { const target = schoolAreaById.get(id)!; return <button type="button" key={id} onClick={() => { setAreaId(id); setHotspotId(null); }}>{target.title}</button>; })}
        </nav>
      </main>
    </div>
    {isComplete && <aside className="t05-school__ending" aria-live="polite"><h2>这两处记号可以放在一起看</h2><p>{act2School.matchNote}</p><button type="button" onClick={() => { onReturnToDesktop?.(); manager.openApp('notepad'); }}>查看调查笔记</button></aside>}
    {hotspot && <div className="t05-school__dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setHotspotId(null); }}>
      <section ref={dialogRef} className="t05-school__dialog" role="dialog" aria-modal="true" aria-labelledby="t05-school-dialog-title">
        <header><h2 id="t05-school-dialog-title">{hotspot.title}</h2><button type="button" aria-label="关闭" onClick={() => setHotspotId(null)}>关闭 ×</button></header>
        {hotspot.id === 'HOTSPOT_A2_T05_RANKS' ? <>
          <p>{hotspot.recordTitle} · {hotspot.studentName}</p><ol className="t05-school__ranks">{hotspot.ranks?.map((rank, index) => <li key={`${rank}-${index}`}>{hotspot.studentName} · 第 {index + 1} 次记录 <strong>{rank}</strong> 名</li>)}</ol>
          <button type="button" onClick={() => manager.readAct2SchoolRanks()}>{flags.FLAG_A2_SCORE_CHANGE_KNOWN === true ? '已记下名次' : '记下这组名次'}</button>
          {flags.FLAG_A2_SCORE_CHANGE_KNOWN === true && <button type="button" onClick={(event) => openHotspot('HOTSPOT_A2_T05_QIMING_TEXT', event.currentTarget)}>查看成绩表下方的感谢文字</button>}
        </> : hotspot.id === 'HOTSPOT_A2_T05_QIMING_TEXT' ? <><p>{hotspot.content}</p><button type="button" onClick={() => manager.readAct2QimingTestimonial()}>{flags.FLAG_A2_QIMING_NAME_FOUND === true ? '已记入笔记' : '记下这段文字'}</button></>
          : hotspot.id === 'HOTSPOT_A2_T05_TEACHER' ? <><p>{hotspot.content}</p><button type="button" onClick={() => manager.acknowledgeAct2TeacherAccount()}>{flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN === true ? '已记入笔记' : '记下老师的回忆'}</button></>
            : <><div className="t05-school__notebook-page" data-asset-id="IMG_A2_T05_006"><div>{act2School.notebookPage.heading}{act2School.notebookPage.lines.map((line) => <div key={line}>{line}</div>)}</div><DoubleSSymbol className="t05-school__notebook-symbol" label="学霸笔记页边的双 S 符号" /><small>{act2School.notebookPage.replacementNote}</small></div><p>{hotspot.content}</p><button type="button" onClick={() => { manager.inspectAct2SchoolNotebook(); setComparisonOpen(true); }}>打开双 S 比对</button></>}
      </section>
    </div>}
    {comparisonOpen && <div className="t05-school__dialog-backdrop" role="presentation"><SchoolSymbolComparison manager={manager} onClose={() => setComparisonOpen(false)} /></div>}
  </section>;
}

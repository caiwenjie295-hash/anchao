import { useEffect, useRef, useState } from 'react';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import { assetLoader } from '../../core/assetLoader';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalAct2SchoolSnapshot, selectAct2SchoolSnapshot } from '../../core/store/selectors';
import { messageById, type WechatMessage } from '../../data/wechatData';
import type { Act2SchoolEvidenceId } from '../../core/types';
import { act2School, schoolAreaById, schoolAreaRoute, schoolCampusLocationById, schoolCampusLocations, schoolCampusRoute, schoolCampusRoutePolylines } from '../../data/act2SchoolData';
import { SchoolSymbolComparison } from './SchoolSymbolComparison';
import '../../act2/t05School.css';

export interface SchoolInvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void }

const schoolMemoryMessages = [messageById.get('CHAT_A2_T05_001'), messageById.get('CHAT_A2_T05_011')].filter((message): message is WechatMessage => Boolean(message));
const schoolMemoryPhotos = [messageById.get('CHAT_A2_T05_004'), messageById.get('CHAT_A2_T05_007')].filter((message): message is WechatMessage => Boolean(message && message.kind === 'image' && message.assetId));

function SchoolMemoryPhoto({ message }: { message: WechatMessage }) {
  const source = message.assetId ? assetLoader.get(message.assetId)?.src : undefined;
  const [failed, setFailed] = useState(false);
  return <figure className="t05-school__memory-photo" data-message-id={message.id}>
    {source && !failed ? <img src={source} alt={message.title} onError={() => setFailed(true)} /> : <div role="img" aria-label={message.title}>{message.content}</div>}
    <figcaption><strong>{message.title}</strong><span>{message.content}</span></figcaption>
  </figure>;
}

function SchoolRankChart({ ranks, paperImage }: { ranks: readonly number[]; paperImage?: string }) {
  const points = ranks.map((rank, index) => ({
    rank,
    x: 62 + index * (576 / Math.max(1, ranks.length - 1)),
    y: 44 + ((rank - Math.min(...ranks)) / Math.max(1, Math.max(...ranks) - Math.min(...ranks))) * 205,
  }));
  return <figure className="t05-school__rank-chart" data-asset-id="IMG_A2_SCHOOL_RANK_PAPER_001" aria-label={`七次名次记录折线图：${ranks.join('、')}；名次数字越小越好`}>
    {paperImage && <img src={paperImage} alt="" aria-hidden="true" />}
    <svg viewBox="0 0 700 300" aria-hidden="true" focusable="false">
      <line className="t05-school__rank-axis" x1="55" y1="32" x2="55" y2="258" />
      <line className="t05-school__rank-axis" x1="55" y1="258" x2="664" y2="258" />
      <polyline className="t05-school__rank-line" points={points.map(({ x, y }) => `${x},${y}`).join(' ')} />
      {points.map(({ rank, x, y }, index) => <g key={`${rank}-${index}`}>
        <circle className="t05-school__rank-point" cx={x} cy={y} r="6" />
        <text className="t05-school__rank-value" x={x} y={y - 12} textAnchor="middle">{rank}</text>
        <text className="t05-school__rank-step" x={x} y="282" textAnchor="middle">{index + 1}</text>
      </g>)}
    </svg>
    <figcaption>第 1 至第 {ranks.length} 次记录 · 数字越小，名次越好</figcaption>
  </figure>;
}

const schoolIndoorMapPoints: Record<string, { x: number; y: number; label: string }> = {
  AREA_A2_T05_CORRIDOR: { x: 50, y: 64, label: '走廊' },
  AREA_A2_T05_XIAOA_CLASSROOM: { x: 25, y: 35, label: '小A旧教室' },
  AREA_A2_T05_XIAOYUE_CLASSROOM: { x: 25, y: 12, label: '小月旧教室' },
  AREA_A2_T05_RESTROOM_APPROACH: { x: 75, y: 35, label: '厕所方向' },
  AREA_A2_T05_TEACHER_OFFICE: { x: 75, y: 64, label: '老师办公室' },
};
const schoolIndoorMapIds = new Set(Object.keys(schoolIndoorMapPoints));
const routeEdgeKey = (from: string, to: string) => [from, to].sort().join('::');
const uniqueRouteEdges = <T extends { id: string; links: string[] }>(locations: readonly T[]) => locations.flatMap((location) => location.links
  .filter((target) => location.id < target)
  .map((target) => ({ from: location.id, to: target })));

export function SchoolInvestigation({ manager = defaultManager, onReturnToDesktop }: SchoolInvestigationProps) {
  const state = useAppSelector(manager, selectAct2SchoolSnapshot, equalAct2SchoolSnapshot);
  const [areaId, setAreaId] = useState('AREA_A2_T05_GATE');
  const [mapLevel, setMapLevel] = useState<'campus' | 'building'>('campus');
  const [campusLocationId, setCampusLocationId] = useState('CAMPUS_SOUTH_GATE');
  const [campusRouteFromId, setCampusRouteFromId] = useState('CAMPUS_SOUTH_GATE');
  const [indoorRouteFromId, setIndoorRouteFromId] = useState('AREA_A2_T05_CORRIDOR');
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const [pendingHotspotId, setPendingHotspotId] = useState<string | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [timelineFeedback, setTimelineFeedback] = useState('');
  const [pendingEvidenceFocusId, setPendingEvidenceFocusId] = useState<Act2SchoolEvidenceId | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousTriggerRef = useRef<HTMLElement | null>(null);
  const evidenceButtonRefs = useRef(new Map<Act2SchoolEvidenceId, HTMLButtonElement>());
  const campusLocation = schoolCampusLocationById.get(campusLocationId)!;
  const activeAreaId = mapLevel === 'building' ? areaId : campusLocation.areaId;
  const area = activeAreaId ? schoolAreaById.get(activeAreaId) : undefined;
  const availableHotspots = activeAreaId ? act2School.hotspots.filter((hotspot) => hotspot.areaId === activeAreaId) : [];
  const hotspot = hotspotId ? act2School.hotspots.find((item) => item.id === hotspotId) : undefined;
  const campusRoute = schoolCampusRoute(campusRouteFromId, campusLocationId);
  const campusRouteEdges = new Set(campusRoute.slice(1).map((id, index) => routeEdgeKey(campusRoute[index], id)));
  const indoorAreaGraph = act2School.areas.filter((item) => schoolIndoorMapIds.has(item.id));
  const indoorRoute = area ? schoolAreaRoute(indoorRouteFromId, area.id) : [];
  const indoorRouteEdges = new Set(indoorRoute.slice(1).map((id, index) => routeEdgeKey(indoorRoute[index], id)));
  const selectedImageId = mapLevel === 'building' ? area?.imageId ?? campusLocation.imageId : campusLocation.imageId;
  const selectedImage = assetLoader.get(selectedImageId)?.src;
  const rankPaperImage = assetLoader.get('IMG_A2_SCHOOL_RANK_PAPER_001')?.src;
  const flags = state.game.flags;
  const schoolProgress = state.modules.act2Research.school;
  const isComplete = flags.FLAG_A2_SS_MATCH_CONFIRMED === true;
  const timelineEvidence: { id: Act2SchoolEvidenceId; flag: string; label: string; detail: string }[] = [
    { id: 'teacher-account', flag: 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', label: '班主任的回忆', detail: '休学两个月，回来后更安静、疏远同学，并把时间放在学习上。' },
    { id: 'rank-record', flag: 'FLAG_A2_SCORE_CHANGE_KNOWN', label: '历次成绩记录', detail: '王澳的名次在多次记录中逐步提高。' },
    { id: 'qiming-thankyou', flag: 'FLAG_A2_QIMING_NAME_FOUND', label: '成绩表下方的感谢文字', detail: '落款提到启明在两个月里的教育和培养。' },
  ];
  const readEvidenceCount = timelineEvidence.filter((item) => flags[item.flag] === true).length;
  const selectedSourceCount = schoolProgress.selectedEvidenceIds.length;
  const readUnselectedEvidence = timelineEvidence.filter((item) => flags[item.flag] === true && !schoolProgress.selectedEvidenceIds.includes(item.id));
  const timelineReady = schoolProgress.symbolMatchConfirmed && selectedSourceCount >= 2 && schoolProgress.selectedInferenceId === 'bounded-timeline';
  const symbolMatchMaterials = flags.FLAG_A2_SCHOOL_SS_FOUND === true ? [] : [{ id: 'HOTSPOT_A2_T05_SCHOLAR_NOTE', label: '小 A 旧教室里的学霸笔记' }];
  const unreadTimelineMaterials = [
    ...(flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN === true ? [] : [{ id: 'HOTSPOT_A2_T05_TEACHER', label: '班主任的回忆' }]),
    ...(flags.FLAG_A2_SCORE_CHANGE_KNOWN === true ? [] : [{ id: 'HOTSPOT_A2_T05_RANKS', label: '历次成绩记录' }]),
    ...(flags.FLAG_A2_SCORE_CHANGE_KNOWN !== true || flags.FLAG_A2_QIMING_NAME_FOUND === true ? [] : [{ id: 'HOTSPOT_A2_T05_QIMING_TEXT', label: '成绩表下方的感谢文字' }]),
  ];
  const sourceSelectionMaterials = selectedSourceCount >= 2 ? [] : readUnselectedEvidence.length
    ? readUnselectedEvidence.map((item) => ({ id: `SCHOOL_EVIDENCE:${item.id}`, label: `${item.label} · 选作支持来源` }))
    : unreadTimelineMaterials;
  const sourceSelectionReason = selectedSourceCount >= 2
    ? '两种不同来源已选好；现在选择最能贴近材料的判断。'
    : readUnselectedEvidence.length
      ? `已有 ${readEvidenceCount} 份记录读过，其中 ${readUnselectedEvidence.length} 份还没有选作支持来源；继续选择已读记录。`
      : '先到学校地点读到记录，再选出两种不同来源作为支持材料。';
  const actions: InvestigationAction[] = [
    { actionId: 'A2_T05_CONFIRM_TIMELINE', kind: 'story', target: 'school-timeline', label: isComplete ? '暂定时间线已记下' : '记录暂定时间线判断', state: isComplete ? 'completed' : timelineReady ? 'ready' : 'blocked', reason: !schoolProgress.symbolMatchConfirmed ? '先把旧笔记页边的记号与第一幕照片并排核对。' : selectedSourceCount < 2 ? sourceSelectionReason : !schoolProgress.selectedInferenceId ? '选出目前最能贴近材料的一种判断。' : '请回看所选判断，再记录这条暂定时间线。', relatedMaterials: [...symbolMatchMaterials, ...(!schoolProgress.symbolMatchConfirmed ? [] : sourceSelectionMaterials)], onActivate: () => manager.confirmAct2SchoolTimeline() },
    { actionId: 'A2_T05_TO_QIMING', kind: 'move', target: 'qiming-research', label: '前往浏览器核查启明', state: isComplete ? 'ready' : 'blocked', reason: '先核对照片上的共同记号，再用至少两种来源记录休学前后的变化。', onActivate: () => { manager.enterAct2QimingResearch(); onReturnToDesktop?.(); manager.openApp('browser'); } },
  ];
  const notebookCloseupImage = assetLoader.get('IMG_A2_SCHOOL_NOTE_DETAIL_001')?.src;
  const notebookCloseupAssetId = 'IMG_A2_SCHOOL_NOTE_DETAIL_001';

  useEffect(() => {
    if (activeAreaId) manager.visitAct2SchoolArea(activeAreaId);
    if (!pendingHotspotId) return;
    manager.inspectAct2SchoolHotspot(pendingHotspotId);
    setHotspotId(pendingHotspotId);
    setPendingHotspotId(null);
  }, [activeAreaId, manager, pendingHotspotId]);
  useEffect(() => {
    if (hotspotId && !comparisonOpen) dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    else if (!hotspotId && !comparisonOpen) previousTriggerRef.current?.focus();
  }, [hotspotId, comparisonOpen]);
  useEffect(() => {
    if (!pendingEvidenceFocusId) return;
    const button = evidenceButtonRefs.current.get(pendingEvidenceFocusId);
    if (!button) return;
    button.scrollIntoView?.({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    button.focus({ preventScroll: true });
    setPendingEvidenceFocusId(null);
  }, [pendingEvidenceFocusId]);
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
  const selectCampusLocation = (id: string, trigger?: HTMLElement) => {
    if (trigger) previousTriggerRef.current = trigger;
    const target = schoolCampusLocationById.get(id);
    if (!target) return;
    setCampusRouteFromId(campusLocationId);
    setCampusLocationId(id);
    setHotspotId(null);
    setMapLevel('campus');
    if (target.areaId) setAreaId(target.areaId);
  };
  const enterSchoolBuilding = () => {
    setMapLevel('building');
    setAreaId('AREA_A2_T05_CORRIDOR');
    setIndoorRouteFromId('AREA_A2_T05_CORRIDOR');
    setHotspotId(null);
  };
  const selectSchoolArea = (nextAreaId: string, trigger?: HTMLElement) => {
    if (trigger) previousTriggerRef.current = trigger;
    if (nextAreaId === 'AREA_A2_T05_GATE') {
      selectCampusLocation('CAMPUS_SOUTH_GATE');
      return;
    }
    setIndoorRouteFromId(area?.id && schoolIndoorMapIds.has(area.id) ? area.id : 'AREA_A2_T05_CORRIDOR');
    setMapLevel('building');
    setAreaId(nextAreaId);
    setHotspotId(null);
  };
  const campusDestinationArea = (targetAreaId: string) => {
    if (targetAreaId === 'AREA_A2_T05_HONOR_ROLL') selectCampusLocation('CAMPUS_HONOR');
    else if (targetAreaId === 'AREA_A2_T05_NOTICE_BOARD') selectCampusLocation('CAMPUS_NOTICE');
    else selectSchoolArea(targetAreaId);
  };
  const returnToCampusMap = () => { setMapLevel('campus'); setHotspotId(null); };

  return <InvestigationShell
    ariaLabel="高中调查"
    className="investigation-shell--memory investigation-shell--act2-spacious"
    actLabel="第二幕 · 小 A 的变化"
    locationLabel={mapLevel === 'building' ? area?.title ?? '教学楼' : campusLocation.title}
    contextLabel="回到高中 · 沿记忆中的路线核对"
    objective="先看看小月记得的日常，再对照学校留下的记录；你可以保留自己的判断。"
    helpText="先在地点读记录，再在下方把读过的来源选作支持材料；“已读”和“已选”分别统计。照片入口与地点列表都能前往同一地点。"
    actions={actions}
    statusMessage={timelineFeedback}
    onOpenMaterial={(_actionId, materialId) => {
      if (materialId.startsWith('SCHOOL_EVIDENCE:')) {
        const evidenceId = materialId.slice('SCHOOL_EVIDENCE:'.length) as Act2SchoolEvidenceId;
        setPendingEvidenceFocusId(evidenceId);
        return;
      }
      const target = act2School.hotspots.find((item) => item.id === materialId);
      if (!target) return;
      campusDestinationArea(target.areaId);
      setAreaId(target.areaId);
      setPendingHotspotId(target.id);
      setHotspotId(null);
    }}
    onExit={() => onReturnToDesktop?.()}
  >
  <section className="t05-school" aria-label="高中调查" data-asset-id={selectedImageId}>
    <div className="t05-school__layout">
      <aside className="t05-school__map" aria-label={mapLevel === 'campus' ? '校园北朝上俯视地图' : '教学楼室内路线图'}>
        {mapLevel === 'campus' ? <>
          <h2>校园总图 <small>北朝上</small></h2>
          <p>选择校园地点查看从当前位置沿道路前往的路线；教学楼内另有走廊与房间路线。操场和宿舍可浏览。</p>
          <div className="t05-school__campus-plan" data-asset-id="IMG_A2_SCHOOL_MAP_001">
            {assetLoader.get('IMG_A2_SCHOOL_MAP_001')?.src && <img src={assetLoader.get('IMG_A2_SCHOOL_MAP_001')!.src} alt="学校校园北朝上俯视总图" />}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              {schoolCampusRoutePolylines.map(({ from, to, points }) => {
                const active = campusRouteEdges.has(routeEdgeKey(from, to));
                return <polyline key={routeEdgeKey(from, to)} className={active ? 't05-school__route-line t05-school__route-line--active' : 't05-school__route-line'} points={points.map(({ x, y }) => `${x},${y}`).join(' ')} />;
              })}
              {schoolCampusLocations.map((location) => <line key={`${location.id}-leader`} className="t05-school__map-leader" x1={location.x} y1={location.y} x2={location.labelX} y2={location.labelY} />)}
              {schoolCampusLocations.map((location) => <ellipse key={`${location.id}-anchor`} className={`t05-school__map-anchor${location.id === campusLocationId ? ' is-current' : ''}${campusRoute.includes(location.id) ? ' is-on-route' : ''}`} cx={location.x} cy={location.y} rx="1.8" ry="2.4" />)}
            </svg>
            {schoolCampusLocations.map((location) => <button
              key={location.id}
              type="button"
              className={`t05-school__map-point${location.id === campusLocationId ? ' is-current' : ''}${campusRoute.includes(location.id) ? ' is-on-route' : ''}`}
              style={{ left: `${location.labelX}%`, top: `${location.labelY}%` }}
              data-location-id={location.id}
              aria-current={location.id === campusLocationId ? 'location' : undefined}
              aria-label={`${location.title}${location.id === campusLocationId ? '，当前位置' : campusRoute.includes(location.id) ? '，刚才路线经过此处' : ''}`}
              onClick={(event) => selectCampusLocation(location.id, event.currentTarget)}
            >{location.title}</button>)}
          </div>
          <p className="t05-school__route-status" aria-live="polite">当前位置：{campusLocation.title} · {campusRouteFromId === campusLocationId ? '选择地点后显示步行路线。' : `刚才走过的路线：${campusRoute.map((id) => schoolCampusLocationById.get(id)?.title).filter(Boolean).join(' → ')}`}</p>
        </> : <>
          <div className="t05-school__map-heading"><div><h2>教学楼室内路线</h2><p>从走廊沿实际可通行路线前往四个室内地点。</p></div><button type="button" onClick={returnToCampusMap}>返回校园总图</button></div>
          <div className="t05-school__indoor-plan" aria-label="教学楼走廊与房间路线示意图">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              {uniqueRouteEdges(indoorAreaGraph).filter(({ from, to }) => schoolIndoorMapIds.has(from) && schoolIndoorMapIds.has(to)).map(({ from, to }) => {
                const start = schoolIndoorMapPoints[from];
                const end = schoolIndoorMapPoints[to];
                const active = indoorRouteEdges.has(routeEdgeKey(from, to));
                return <line key={routeEdgeKey(from, to)} className={active ? 't05-school__route-line t05-school__route-line--active' : 't05-school__route-line'} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
              })}
            </svg>
            {indoorAreaGraph.map((item) => {
              const point = schoolIndoorMapPoints[item.id];
              return <button key={item.id} type="button" className={`t05-school__map-point${area?.id === item.id ? ' is-current' : ''}${indoorRoute.includes(item.id) ? ' is-on-route' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} data-location-id={item.id} aria-current={area?.id === item.id ? 'location' : undefined} onClick={(event) => selectSchoolArea(item.id, event.currentTarget)}>{point.label}</button>;
            })}
          </div>
          <p className="t05-school__route-status" aria-live="polite">当前位置：{area?.title} · {indoorRouteFromId === area?.id ? '选择室内地点后显示路线。' : `刚才走过的路线：${indoorRoute.map((id) => schoolIndoorMapPoints[id]?.label).filter(Boolean).join(' → ')}`}</p>
        </>}
      </aside>
      <main className="t05-school__room">
        <h2>{mapLevel === 'building' ? area?.title ?? '教学楼' : campusLocation.title}</h2>
        <div className={`t05-school__backdrop${selectedImage ? ' t05-school__backdrop--image' : ''}`} data-asset-id={selectedImageId}>
          {selectedImage
            ? <img src={selectedImage} alt={mapLevel === 'building' ? area?.title ?? '教学楼内景' : campusLocation.id === 'CAMPUS_BUILDING' ? '校园教学楼整体外景' : campusLocation.title} />
            : <div className="t05-school__photo-fallback" role="img" aria-label={`${mapLevel === 'building' ? area?.title : campusLocation.title}照片暂不可用`}>{mapLevel === 'building' ? area?.description : campusLocation.description}</div>}
          {availableHotspots.map((item) => <button type="button" key={item.id} className="t05-school__image-hotspot" style={{ left: `${item.focus.x}%`, top: `${item.focus.y}%` }} onClick={(event) => openHotspot(item.id, event.currentTarget)}>{item.actionLabel}</button>)}
          {mapLevel === 'building' && area && <nav className="t05-school__image-routes" aria-label="沿室内可通行路线前往相邻地点">{area.links.map((id) => { const target = schoolAreaById.get(id)!; return <button type="button" key={id} onClick={() => selectSchoolArea(id)}>{id === 'AREA_A2_T05_GATE' ? '校园入口' : target.title} →</button>; })}</nav>}
        </div>
        {mapLevel === 'campus' && campusLocation.id === 'CAMPUS_BUILDING' && <button type="button" className="t05-school__building-entry" onClick={enterSchoolBuilding}>进入教学楼走廊</button>}
        <p className="t05-school__description">{mapLevel === 'building' ? area?.description : area?.description ?? campusLocation.description}</p>
        {area?.id === 'AREA_A2_T05_TEACHER_OFFICE' && flags.FLAG_A2_SCHOOL_SS_FOUND !== true && <p className="t05-school__soft-hint">{act2School.softHint}</p>}
      </main>
    </div>
    <div className="t05-school__intro">
      <section className="t05-school__memory" aria-label="小月的日常回忆与高中旧照片">
        <strong className="t05-school__memory-heading">小月记得的日常与两张旧照片</strong>
        <div className="t05-school__memory-content">
          <div className="t05-school__memory-chat">
            {schoolMemoryMessages.map((message) => <blockquote key={message.id} data-message-id={message.id}>{message.content}</blockquote>)}
          </div>
          <div className="t05-school__memory-photos">
            {schoolMemoryPhotos.map((message) => <SchoolMemoryPhoto key={message.id} message={message} />)}
          </div>
        </div>
      </section>
      <p className="t05-school__route-intro">{act2School.intro}</p>
    </div>
    <section className="t05-school__timeline" aria-label="休学前后对照">
      <h2>学校记录 · 已读 {readEvidenceCount} / 3 · 已选不同来源 {selectedSourceCount} / 2</h2>
      <p>读过记录后，选择至少两种不同来源，再判断它们能说明什么。访问地点本身不计作证据。</p>
      <div className="t05-school__evidence-options">
        {timelineEvidence.map((item) => {
          const available = flags[item.flag] === true;
          const selected = schoolProgress.selectedEvidenceIds.includes(item.id);
          return <button type="button" key={item.id} ref={(node) => { if (node) evidenceButtonRefs.current.set(item.id, node); else evidenceButtonRefs.current.delete(item.id); }} data-evidence-id={item.id} disabled={!available || isComplete} aria-pressed={selected} onClick={() => manager.toggleAct2SchoolEvidence(item.id)}>
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
          <p>{hotspot.recordTitle} · {hotspot.studentName}</p><SchoolRankChart ranks={hotspot.ranks ?? []} paperImage={rankPaperImage} /><ol className="t05-school__ranks">{hotspot.ranks?.map((rank, index) => <li key={`${rank}-${index}`}>{hotspot.studentName} · 第 {index + 1} 次记录 <strong>{rank}</strong> 名</li>)}</ol>
          <button type="button" onClick={() => manager.readAct2SchoolRanks()}>{flags.FLAG_A2_SCORE_CHANGE_KNOWN === true ? '已记下名次' : '记下这组名次'}</button>
          {flags.FLAG_A2_SCORE_CHANGE_KNOWN === true && <button type="button" onClick={(event) => openHotspot('HOTSPOT_A2_T05_QIMING_TEXT', event.currentTarget)}>查看成绩表下方的感谢文字</button>}
        </> : hotspot.id === 'HOTSPOT_A2_T05_QIMING_TEXT' ? <><p>{hotspot.content}</p><button type="button" onClick={() => manager.readAct2QimingTestimonial()}>{flags.FLAG_A2_QIMING_NAME_FOUND === true ? '已记入笔记' : '记下这段文字'}</button></>
          : hotspot.id === 'HOTSPOT_A2_T05_TEACHER' ? <><p>{hotspot.content}</p><button type="button" onClick={() => manager.acknowledgeAct2TeacherAccount()}>{flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN === true ? '已记入笔记' : '记下老师的回忆'}</button></>
            : <><div className={`t05-school__notebook-page${notebookCloseupImage ? ' t05-school__notebook-page--image' : ''}`} data-asset-id={notebookCloseupAssetId}><div className="t05-school__notebook-visual">{notebookCloseupImage && <img src={notebookCloseupImage} alt="学霸笔记页边的双 S 记号" />}<DoubleSSymbol className="t05-school__notebook-symbol" label="学霸笔记页边的双 S 符号" /></div><div className="t05-school__notebook-copy"><strong>{act2School.notebookPage.heading}</strong>{act2School.notebookPage.lines.map((line) => <div key={line}>{line}</div>)}</div></div><p>{hotspot.content}</p><button type="button" onClick={() => { manager.inspectAct2SchoolNotebook(); setComparisonOpen(true); }}>打开双 S 比对</button></>}
      </section>
    </div>}
    {comparisonOpen && <div className="t05-school__dialog-backdrop" role="presentation"><SchoolSymbolComparison manager={manager} onClose={() => setComparisonOpen(false)} /></div>}
  </section>
  </InvestigationShell>;
}

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { installFixtureMemoryStorage } from '../../ux-narr-20261002/a34/fixtureStorage';
import type { Act3ActiveStage, Act4NarrativeActionId, AppState } from '../../../src/core/types';

// QA only. Replace storage before any production singleton imports; the player's
// http://127.0.0.1:5339 save is never read or written by this fixture.
async function boot() {
  installFixtureMemoryStorage(window);
  const [defaults, bus, state, school, t07, a3, a4, browser, a3Data] = await Promise.all([
    import('../../../src/core/defaultState'), import('../../../src/core/eventBus'),
    import('../../../src/core/stateManager'), import('../../../src/scenes/act2/SchoolInvestigation'),
    import('../../../src/scenes/act2/T07Investigation'), import('../../../src/scenes/act3/Act3Investigation'),
    import('../../../src/scenes/act4/Act4Experience'), import('../../../src/modules/browser/BrowserApp'),
    import('../../../src/data/act3Data'),
  ]);
  type Mode = 'browser' | 'school' | 't07' | 'act3' | 'act4';
  type ReadingStage = 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06' | 'T07' | 'T08' | 'T09' | 'T10';
  const readingStages: { id: ReadingStage; label: string }[] = [
    { id: 'T01', label: '旧笔记' }, { id: 'T02', label: '账户与记录' },
    { id: 'T03', label: '阅读第三节' }, { id: 'T04', label: '醒来与邮件' },
    { id: 'T05', label: '生日回忆' }, { id: 'T06', label: '宿舍回忆' },
    { id: 'T07', label: '离开与店铺' }, { id: 'T08', label: '清醒后返山' },
    { id: 'T09', label: '藏笔记与广播' }, { id: 'T10', label: '终章' },
  ];
  const lensOptions = (['T00','T01','T02','T03','T04','T05','T06','T07'] as Act3ActiveStage[])
    .flatMap(stage => a3Data.act3StageDoc(stage).lenses);
  const makeState = (mode: Mode, lensId: string, readingStage: ReadingStage): AppState => {
    const value = defaults.createDefaultState();
    if (mode === 'browser') {
      value.game.phase = 'D';
      value.game.flags.FLAG_A1_XIAOA_MISSING_KNOWN = true;
      value.game.flags.FLAG_A1_MAIL_XIAOA_OPENED = true;
    } else if (mode === 'school') {
      value.game.act = 2; value.game.phase = 'A2_T05';
      value.game.flags.FLAG_A2_TRANSFER_RULE_INFERRED = true;
      value.game.flags.FLAG_A2_SCHOOL_ENTERED = true;
      value.modules.act2Research.stage = 'school';
    } else if (mode === 't07') {
      value.game.act = 2; value.game.phase = 'A2_T07';
      for (const id of ['FLAG_A1_COMPLETE','FLAG_A1_SS_FOUND','FLAG_A2_TRANSFER_RULE_INFERRED','FLAG_A2_SCHOOL_ENTERED','FLAG_A2_SS_MATCH_CONFIRMED','FLAG_A2_QIMING_OFFICIAL_FOUND','FLAG_A2_QIMING_TESTIMONIALS_READ','FLAG_A2_QIMING_FORUM_FOUND','FLAG_A2_HUANG_MATCH_INFERRED','FLAG_A2_ZHONG_MATCH_INFERRED','FLAG_A2_OTHER_CASES_ABNORMAL']) value.game.flags[id] = true;
      value.modules.act2Research.stage = 'finale';
    } else if (mode === 'act3') {
      const stage = lensId.match(/LENS_A3_(T\d\d)_/)?.[1] as Act3ActiveStage;
      value.game.act = 3; value.game.phase = `A3_${stage}`;
      value.modules.act3.stage = stage;
      value.modules.act3.currentLensId = lensId;
      value.modules.act3.visitedLensIds = [lensId];
      // Stage/lens fixtures represent a reached location, never an inferred clue.
    } else {
      const n = Number(readingStage.slice(1));
      value.game.act = 4; value.game.phase = `A4_${readingStage}`;
      value.modules.act4.stage = readingStage;
      value.modules.act4.unlockedAccountIds = ['weibo','mail'];
      value.modules.act4.completedNarrativeSectionIds = Array.from({length:n-1},(_,i)=>`A4_READ_T${String(i+1).padStart(2,'0')}`);
      const actions: Act4NarrativeActionId[] = ['A4_T02_LOGIN_SUCCEEDED','A4_T04_WAKE_MAIL_OPENED'];
      if (n > 8) actions.push('A4_T08_ARCHIVE_OPENED');
      value.modules.act4.completedNarrativeActionIds = actions;
    }
    return value;
  };
  function Fixture() {
    const [mode,setMode] = useState<Mode>('school');
    const [lensId,setLensId] = useState('LENS_A3_T00_004');
    const [readingStage,setReadingStage] = useState<ReadingStage>('T05');
    const [manager,setManager] = useState(()=>new state.StateManager(new bus.EventBus(),makeState('school',lensId,readingStage)));
    const [height,setHeight] = useState(54);
    const toolbar = useRef<HTMLElement>(null);
    useLayoutEffect(()=>{
      if (!toolbar.current) return;
      const update=()=>setHeight(Math.ceil(toolbar.current!.getBoundingClientRect().height));
      update(); const observer=new ResizeObserver(update); observer.observe(toolbar.current); return ()=>observer.disconnect();
    },[]);
    const select=(next:Mode,nextLens=lensId,nextStage=readingStage)=>{
      setMode(next); setLensId(nextLens); setReadingStage(nextStage);
      setManager(new state.StateManager(new bus.EventBus(),makeState(next,nextLens,nextStage)));
    };
    return <div style={{'--qa-toolbar-height':`${height}px`} as CSSProperties} data-storage-isolation="memory">
      <header className="qa-toolbar" ref={toolbar}>
        <label>验收场景<select aria-label="验收场景" value={mode} onChange={e=>select(e.target.value as Mode)}>
          <option value="browser">第一幕搜索</option><option value="school">高中校园</option><option value="t07">旧资料对照</option><option value="act3">第三幕观察</option><option value="act4">第四幕阅读</option>
        </select></label>
        {mode==='act3'&&<label>镜头<select aria-label="第三幕镜头" value={lensId} onChange={e=>select(mode,e.target.value)}>{lensOptions.map(l=><option key={l.id} value={l.id}>{l.id} · {l.title}</option>)}</select></label>}
        {mode==='act4'&&<label>章节<select aria-label="第四幕章节" value={readingStage} onChange={e=>select(mode,lensId,e.target.value as ReadingStage)}>{readingStages.map(stage=><option key={stage.id} value={stage.id}>{stage.id} · {stage.label}</option>)}</select></label>}
        <span className="qa-status">隔离内存状态 · QA</span>
      </header>
      <div className="qa-stage" key={`${mode}:${lensId}:${readingStage}`}>
        {mode==='school'?<school.SchoolInvestigation manager={manager}/>:mode==='t07'?<t07.T07Investigation manager={manager}/>:mode==='act3'?<a3.Act3Investigation manager={manager}/>:mode==='act4'?<a4.Act4Experience manager={manager} onExit={()=>{}}/>:<div className="qa-browser"><browser.BrowserApp manager={manager}/></div>}
      </div>
    </div>;
  }
  createRoot(document.getElementById('root')!).render(<Fixture/>);
}
void boot().catch(error=>{document.getElementById('root')!.textContent=String(error);});

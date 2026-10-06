import { useState } from 'react';
import { useInvestigationProgress } from '../../components/InvestigationProgressContext';
import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalNotepadSnapshot, selectNotepadSnapshot } from '../../core/store/selectors';
import { getAutoEntries } from '../../data/noteData';
import { SettingsPanel } from '../settings/SettingsPanel';
import './notepad.css';

type HubView = 'current' | 'records' | 'notes' | 'settings';

export function NotepadApp({ manager = stateManager }: { manager?: StateManager }) {
  const state = useAppSelector(manager, selectNotepadSnapshot, equalNotepadSnapshot);
  const entries = getAutoEntries(state.modules.notepad);
  const progressContext = useInvestigationProgress();
  const [view, setView] = useState<HubView>('current');
  const tabs: { id: HubView; label: string }[] = [
    { id: 'current', label: '当前调查' },
    { id: 'records', label: `线索记录（${entries.length}）` },
    { id: 'notes', label: '我的笔记' },
    { id: 'settings', label: '设置与存档' },
  ];

  return <section className="notepad-app investigation-hub" aria-label="调查">
    <header className="investigation-hub__titlebar">
      <div><span aria-hidden="true">▤</span><h2>调查</h2></div>
      <p>把一路的线索收在一起，也留住自己的想法。</p>
    </header>
    <nav className="investigation-hub__tabs" aria-label="调查内容">
      {tabs.map((tab) => <button key={tab.id} type="button" aria-pressed={view === tab.id} onClick={() => setView(tab.id)}>{tab.label}</button>)}
    </nav>

    {view === 'current' && <main className="investigation-hub__current">
      <p className="investigation-hub__eyebrow">{progressContext?.progress.actLabel ?? '当前调查'}</p>
      <h3>{progressContext?.progress.location ?? '一路留下的记录，都在这里。'}</h3>
      <p className="investigation-hub__recap">{progressContext?.progress.currentObjective ?? '翻翻线索和笔记，再决定接下来往哪里走。'}</p>
      <p className="investigation-hub__next"><strong>接下来</strong><span>{progressContext?.progress.nextAction ?? '可以回看已有记录，也可以继续调查。'}</span></p>
      <button type="button" className="investigation-hub__continue" disabled={!progressContext?.onContinueInvestigation} onClick={() => progressContext?.onContinueInvestigation?.()}>继续调查</button>
      {state.game.flags.FLAG_A3_COMPLETE === true && state.modules.act3.stage === 'T07' && progressContext?.onReviewAct3 && <button type="button" className="investigation-hub__review-act3" onClick={() => progressContext.onReviewAct3?.()}>回看启明旧址</button>}
    </main>}

    {view === 'records' && <section className="notepad-auto investigation-hub__records" aria-label="线索记录">
      {entries.length ? entries.map((entry) => <article key={entry.id} className={`notepad-entry notepad-entry--${entry.entryType}`}>
        <h3>{entry.title}</h3><small>{entry.source}</small><p>{entry.content}</p>
      </article>) : <p className="investigation-hub__empty">已读材料和观察会记录在这里。</p>}
    </section>}

    {view === 'notes' && <div className="investigation-hub__notes">
      <label htmlFor="notepad-user-text">我的笔记</label>
      <textarea id="notepad-user-text" value={state.modules.notepad.userText} onChange={(event) => manager.setNotepadUserText(event.target.value)} placeholder="记下自己的想法…" spellCheck={false} />
    </div>}

    {view === 'settings' && <SettingsPanel manager={manager} />}

    <footer>调查记录与个人笔记</footer>
  </section>;
}

import { useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { getAutoEntries } from '../../data/noteData';

export function NotepadApp({ manager = stateManager }: { manager?: StateManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const entries = getAutoEntries(state.modules.notepad);
  return <section className="notepad-app" aria-label="记事本"><header><div><span aria-hidden="true">▤</span><h2>无标题 - 记事本</h2></div><p>文件　编辑　查看</p></header><div className="notepad-body"><section className="notepad-auto" aria-label="自动记录">{entries.map((entry) => <p key={entry.id} className={`notepad-entry notepad-entry--${entry.entryType}`}>{entry.content}</p>)}</section><label className="sr-only" htmlFor="notepad-user-text">自由记录</label><textarea id="notepad-user-text" value={state.modules.notepad.userText} onChange={(event) => manager.setNotepadUserText(event.target.value)} placeholder="在这里记下自己的想法…" spellCheck={false} /></div><footer>UTF-8　　{state.game.phase === 'F' ? '已整理' : '草稿'}</footer></section>;
}

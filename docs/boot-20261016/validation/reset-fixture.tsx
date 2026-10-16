import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { installFixtureMemoryStorage } from '../../ux-narr-20261002/a34/fixtureStorage';
import '../../../src/styles.css';
async function boot() {
 installFixtureMemoryStorage(window);
 const [{ createDefaultState },{ StateManager },{ EventBus },{ Taskbar },{ ChapterNavigation }]=await Promise.all([
  import('../../../src/core/defaultState'),import('../../../src/core/stateManager'),import('../../../src/core/eventBus'),
  import('../../../src/components/Taskbar'),import('../../../src/components/chapterNavigation/ChapterNavigation')]);
 const seed=createDefaultState();seed.game.phase='D';
 const manager=new StateManager(new EventBus(),seed);
 function Fixture(){
  const state=useSyncExternalStore(manager.subscribe,manager.getState,manager.getState);
  return <main className="desktop" aria-label="隔离测试桌面" data-storage-isolation="memory">
   <p style={{position:'absolute',top:12,left:12,color:'#fff',pointerEvents:'none'}}>仅内存验收 · 当前阶段 <output>{state.game.phase}</output></p>
   <Taskbar desktop={state.desktop} onAppClick={()=>{}} time={new Date('2026-10-16T08:00:00+08:00')} chapterNavigation={<ChapterNavigation manager={manager} placement="taskbar"/>}/>
  </main>;
 }
 createRoot(document.getElementById('root')!).render(<Fixture/>);
}
void boot();

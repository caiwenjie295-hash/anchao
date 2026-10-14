import { createRoot } from 'react-dom/client';
import { installFixtureMemoryStorage } from '../../ux-narr-20261002/a34/fixtureStorage';

// QA-only entry point for the real App shell. Seed a disposable memory save
// before importing any production singleton. Never reads the player origin.
async function boot() {
  const memory = installFixtureMemoryStorage(window);
  const { createDefaultState } = await import('../../../src/core/defaultState');
  const value = createDefaultState();
  value.game.phase = 'D';
  for (const flag of ['FLAG_A1_MOM_MSG_TRIGGERED', 'FLAG_A1_XIAOA_MISSING_KNOWN', 'FLAG_A1_MAIL_XIAOA_FOUND', 'FLAG_A1_MAIL_XIAOA_OPENED']) value.game.flags[flag] = true;
  value.modules.storyTransitions.seenIds = ['TRANSITION_A1_INTRO'];
  if (new URLSearchParams(location.search).get('scene') === 'school') {
    value.game.act = 2; value.game.phase = 'A2_T05';
    for (const flag of ['FLAG_A1_COMPLETE', 'FLAG_A1_SS_FOUND', 'FLAG_A2_TRANSFER_RULE_INFERRED', 'FLAG_A2_SCHOOL_ENTERED']) value.game.flags[flag] = true;
    value.modules.act2Research.stage = 'school';
  }
  memory.storage.setItem('anchao.save.v1', JSON.stringify(value));
  const { default: App } = await import('../../../src/App');
  createRoot(document.getElementById('root')!).render(<App />);
}
void boot().catch(error => { document.getElementById('root')!.textContent = String(error); });

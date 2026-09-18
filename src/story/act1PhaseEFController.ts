import { eventBus, type EventBus } from '../core/eventBus';
import { stateManager, type StateManager } from '../core/stateManager';
import { browserPageById } from '../data/browserData';

const newsFlag = 'FLAG_A1_NEWS_FOUND';
const routeFlag = 'FLAG_A1_ROUTE_INFO_FOUND';
const suspiciousFlag = 'FLAG_A1_MISSING_CASE_SUSPICIOUS';
const phaseFRequirements = ['FLAG_A1_XIAOA_MISSING_KNOWN', 'FLAG_A1_MAIL_XIAOA_OPENED', newsFlag, routeFlag];

export class Act1PhaseEFController {
  private unsubscribe: (() => void)[] = [];
  constructor(private readonly manager: StateManager = stateManager, private readonly bus: EventBus = eventBus) {}
  start(): void {
    this.unsubscribe.push(this.bus.on('browser:page-opened', ({ pageId }) => this.recordPage(pageId)), this.bus.on('flag:changed', () => this.sync()));
    this.sync();
  }
  dispose(): void { this.unsubscribe.splice(0).forEach((unsubscribe) => unsubscribe()); }
  private recordPage(pageId: string): void {
    const page = browserPageById.get(pageId);
    if (!page) return;
    for (const flagId of page.triggerFlags) if (this.manager.getState().game.flags[flagId] !== true) this.manager.setFlag(flagId, true);
    this.sync();
  }
  private sync(): void {
    const game = this.manager.getState().game;
    if (game.flags[newsFlag] === true && game.flags[routeFlag] === true) {
      if (game.flags[suspiciousFlag] !== true) this.manager.setFlag(suspiciousFlag, true);
      this.manager.addNotepadAutoEntry('NOTE_A1_E_001');
      if (['A', 'B', 'C', 'D'].includes(game.phase)) this.manager.setPhase('E');
    }
    const current = this.manager.getState().game;
    if (phaseFRequirements.every((flagId) => current.flags[flagId] === true) && ['A', 'B', 'C', 'D', 'E'].includes(current.phase)) {
      this.manager.addNotepadAutoEntry('NOTE_A1_F_001');
      if (current.phase !== 'F') this.manager.setPhase('F');
    }
  }
}

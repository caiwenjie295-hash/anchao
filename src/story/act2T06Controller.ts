import { eventBus, type EventBus } from '../core/eventBus';
import { stateManager, type StateManager } from '../core/stateManager';
import { browserPageById, isAct2T06Record } from '../data/browserData';

const allowedReadFlags = new Set([
  'FLAG_A2_QIMING_OFFICIAL_FOUND',
  'FLAG_A2_QIMING_TESTIMONIALS_READ',
  'FLAG_A2_QIMING_FORUM_FOUND',
]);

/** T06 页面阅读效果由离线浏览器事件驱动，并再次验证当前阶段。 */
export class Act2T06Controller {
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly manager: StateManager = stateManager, private readonly bus: EventBus = eventBus) {}

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.bus.on('browser:page-opened', ({ pageId }) => this.onPageOpened(pageId));
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private onPageOpened(pageId: string): void {
    const state = this.manager.getState();
    const page = browserPageById.get(pageId);
    if (state.modules.act2Research.stage !== 'qiming' || !page || !isAct2T06Record(page)) return;
    for (const flagId of page.triggerFlags) {
      if (allowedReadFlags.has(flagId) && state.game.flags[flagId] !== true) this.manager.setFlag(flagId, true);
    }
    const flags = this.manager.getState().game.flags;
    if (flags.FLAG_A2_QIMING_OFFICIAL_FOUND === true) this.manager.addNotepadAutoEntry('NOTE_A2_T06_001');
    if (flags.FLAG_A2_QIMING_FORUM_FOUND === true) this.manager.addNotepadAutoEntry('NOTE_A2_T06_002');
  }
}

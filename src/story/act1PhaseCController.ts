import { eventBus, type EventBus } from '../core/eventBus';
import { stateManager, type StateManager } from '../core/stateManager';
import { XIAOA_MAIL_FLAGS, XIAOA_MAIL_ID } from '../data/mailData';
import { XIAOA_MISSING_KNOWN_FLAG } from '../data/wechatData';

export class Act1PhaseCController {
  private unsubscribe: (() => void)[] = [];

  constructor(
    private readonly manager: StateManager = stateManager,
    private readonly bus: EventBus = eventBus,
  ) {}

  start(): void {
    this.unsubscribe.push(
      this.bus.on('mail:opened', ({ mailId }) => {
        if (mailId !== XIAOA_MAIL_ID) return;
        this.markXiaoaMailFound();
      }),
      this.bus.on('flag:changed', () => this.syncPhase()),
    );
    this.syncPhase();
  }

  dispose(): void {
    this.unsubscribe.splice(0).forEach((unsubscribe) => unsubscribe());
  }

  private markXiaoaMailFound(): void {
    const flags = this.manager.getState().game.flags;
    for (const flagId of XIAOA_MAIL_FLAGS) {
      if (flags[flagId] !== true) this.manager.setFlag(flagId, true);
    }
    this.syncPhase();
  }

  private syncPhase(): void {
    const game = this.manager.getState().game;
    if (game.flags[XIAOA_MISSING_KNOWN_FLAG] !== true || game.flags.FLAG_A1_MAIL_XIAOA_OPENED !== true) return;
    if (game.phase === 'A' || game.phase === 'B') this.manager.setPhase('C');
  }
}

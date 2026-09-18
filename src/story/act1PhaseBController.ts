import { eventBus, type EventBus } from '../core/eventBus';
import { stateManager, type StateManager } from '../core/stateManager';
import {
  MOM_CONTACT_ID,
  MOM_READ_FLAG,
  MOM_TRIGGERED_FLAG,
  XIAOA_MISSING_KNOWN_FLAG,
  momMessageEvent,
} from '../data/wechatData';

export class Act1PhaseBController {
  private triggerTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void)[] = [];

  constructor(
    private readonly manager: StateManager = stateManager,
    private readonly bus: EventBus = eventBus,
  ) {}

  start(): void {
    this.unsubscribe.push(
      this.bus.on('app:opened', ({ appId }) => {
        if (appId === 'wechat') this.scheduleMotherMessage();
      }),
      this.bus.on('chat:opened', ({ contactId }) => {
        if (contactId === MOM_CONTACT_ID) this.markMotherMessageRead();
      }),
      this.bus.on('progress:reset', () => {
        if (this.triggerTimer !== null) clearTimeout(this.triggerTimer);
        this.triggerTimer = null;
      }),
    );
    const state = this.manager.getState();
    if (state.desktop.windows.wechat.status !== 'closed' && state.desktop.windows.wechat.status !== 'minimized') this.scheduleMotherMessage();
    if (state.game.flags[MOM_TRIGGERED_FLAG] === true && state.game.phase === 'A') this.manager.setPhase('B');
  }

  dispose(): void {
    if (this.triggerTimer !== null) clearTimeout(this.triggerTimer);
    this.triggerTimer = null;
    this.unsubscribe.splice(0).forEach((unsubscribe) => unsubscribe());
  }

  private scheduleMotherMessage(): void {
    if (this.triggerTimer !== null || this.manager.getState().game.flags[MOM_TRIGGERED_FLAG] === true) return;
    this.triggerTimer = setTimeout(() => {
      this.triggerTimer = null;
      if (this.manager.getState().game.flags[MOM_TRIGGERED_FLAG] === true) return;
      this.manager.setFlag(MOM_TRIGGERED_FLAG, true);
      this.manager.setPhase('B');
    }, momMessageEvent.delayMs);
  }

  private markMotherMessageRead(): void {
    const flags = this.manager.getState().game.flags;
    if (flags[MOM_TRIGGERED_FLAG] !== true || flags[MOM_READ_FLAG] === true) return;
    this.manager.setFlag(MOM_READ_FLAG, true);
    this.manager.setFlag(XIAOA_MISSING_KNOWN_FLAG, true);
  }
}

import { eventBus, type EventBus } from '../core/eventBus';
import { stateManager, type StateManager } from '../core/stateManager';
import { classifyAct2T01Search } from '../data/browserData';

const buSearchFlag = 'FLAG_A2_SEARCH_BU_ATTEMPTED';
const ssSearchFlag = 'FLAG_A2_SEARCH_SS_ATTEMPTED';
const webFailedFlag = 'FLAG_A2_WEB_SEARCH_FAILED';
const offlineFlag = 'FLAG_A2_OFFLINE_RESEARCH_NEEDED';
const conclusionNoteId = 'NOTE_A2_T01_001';
const weakNoteId = 'NOTE_A2_T01_002';
/** 长时间没有进展时的弱提示延迟。 */
const weakPromptDelayMs = 15000;

/**
 * 第二幕 T01：互联网搜索失效。
 * 只在 game.act===2、phase==='A2_T01'、stage==='search' 时响应；
 * 两类模糊搜索都完成后判定互联网无解，记笔记并转入 bridge。
 */
export class Act2T01Controller {
  private unsubscribe: (() => void)[] = [];
  private weakPromptTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly manager: StateManager = stateManager, private readonly bus: EventBus = eventBus) {}

  start(): void {
    this.unsubscribe.push(
      this.bus.on('browser:searched', ({ query }) => this.onSearch(query)),
      this.bus.on('flag:changed', () => this.sync()),
      this.bus.on('act2:started', () => this.sync()),
      this.bus.on('act2:stage-changed', () => this.sync()),
      this.bus.on('phase:changed', () => this.sync()),
    );
    this.sync();
  }

  dispose(): void {
    this.unsubscribe.splice(0).forEach((unsubscribe) => unsubscribe());
    this.clearWeakPromptTimer();
  }

  private isSearchWindowOpen(): boolean {
    const { game, modules } = this.manager.getState();
    return game.act === 2 && game.phase === 'A2_T01' && modules.act2Research.stage === 'search';
  }

  private onSearch(query: string): void {
    if (!this.isSearchWindowOpen()) return;
    const topic = classifyAct2T01Search(query);
    if (!topic) return;
    const flagId = topic === 'bu' ? buSearchFlag : ssSearchFlag;
    if (this.manager.getState().game.flags[flagId] !== true) this.manager.setFlag(flagId, true);
    this.sync();
  }

  private sync(): void {
    if (!this.isSearchWindowOpen()) return;
    this.armWeakPromptTimer();
    const { flags } = this.manager.getState().game;
    if (flags[buSearchFlag] !== true || flags[ssSearchFlag] !== true) return;
    if (this.manager.getState().game.flags[webFailedFlag] !== true) this.manager.setFlag(webFailedFlag, true);
    if (this.manager.getState().game.flags[offlineFlag] !== true) this.manager.setFlag(offlineFlag, true);
    this.manager.addNotepadAutoEntry(conclusionNoteId);
    this.clearWeakPromptTimer();
    this.manager.setAct2Stage('bridge');
  }

  private armWeakPromptTimer(): void {
    if (this.weakPromptTimer !== null) return;
    this.weakPromptTimer = setTimeout(() => {
      this.weakPromptTimer = null;
      if (!this.isSearchWindowOpen()) return;
      if (this.manager.getState().game.flags[webFailedFlag] === true) return;
      this.manager.addNotepadAutoEntry(weakNoteId);
    }, weakPromptDelayMs);
  }

  private clearWeakPromptTimer(): void {
    if (this.weakPromptTimer === null) return;
    clearTimeout(this.weakPromptTimer);
    this.weakPromptTimer = null;
  }
}

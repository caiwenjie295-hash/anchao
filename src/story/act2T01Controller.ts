import { eventBus, type EventBus } from '../core/eventBus';
import { stateManager, type StateManager } from '../core/stateManager';
import { classifyAct2T01Search } from '../data/browserData';

const buSearchFlag = 'FLAG_A2_SEARCH_BU_ATTEMPTED';
const ssSearchFlag = 'FLAG_A2_SEARCH_SS_ATTEMPTED';
const webFailedFlag = 'FLAG_A2_WEB_SEARCH_FAILED';
const offlineFlag = 'FLAG_A2_OFFLINE_RESEARCH_NEEDED';
const conclusionNoteId = 'NOTE_A2_T01_001';

/**
 * 第二幕 T01：记录真实的主题搜索，并允许玩家主动转向线下求证。
 * 只在 game.act===2、phase==='A2_T01'、stage==='search' 时响应；
 * 任一相关搜索即可开放 bridge；两类搜索齐备只留下兼容性的历史记录。
 */
export class Act2T01Controller {
  private unsubscribe: (() => void)[] = [];

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
    const { flags } = this.manager.getState().game;
    const relatedSearchSeen = flags[buSearchFlag] === true || flags[ssSearchFlag] === true;
    if (relatedSearchSeen) {
      if (flags[offlineFlag] !== true) this.manager.setFlag(offlineFlag, true);
      this.manager.addNotepadAutoEntry(conclusionNoteId);
    }
    // Retain this historical fact only when both real topic searches happened.
    if (flags[buSearchFlag] === true && flags[ssSearchFlag] === true && flags[webFailedFlag] !== true) {
      this.manager.setFlag(webFailedFlag, true);
    }
  }
}

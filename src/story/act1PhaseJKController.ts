import { eventBus, type EventBus } from '../core/eventBus';
import { stateManager, type StateManager } from '../core/stateManager';

const cavePhoto = 'IMG_A1_H_003';

export class Act1PhaseJKController {
  private unsubscribe: (() => void)[] = [];
  constructor(private readonly manager: StateManager = stateManager, private readonly bus: EventBus = eventBus) {}
  start(): void {
    this.unsubscribe.push(
      this.bus.on('photo:editor-opened', ({ photoId }) => this.onEditorOpened(photoId)),
      this.bus.on('photo:symbol-inspected', ({ photoId }) => this.onSymbolInspected(photoId)),
    );
    this.sync();
  }
  dispose(): void { this.unsubscribe.splice(0).forEach((unsubscribe) => unsubscribe()); }
  private onEditorOpened(photoId: string): void {
    if (photoId !== cavePhoto || this.manager.getState().game.phase !== 'I') return;
    this.manager.setFlag('FLAG_A1_PHOTO_EDIT_OPENED', true);
    this.manager.setPhase('J');
  }
  private onSymbolInspected(photoId: string): void {
    if (photoId !== cavePhoto || !['I', 'J'].includes(this.manager.getState().game.phase)) return;
    this.manager.setFlag('FLAG_A1_SS_FOUND', true);
    this.manager.setFlag('FLAG_A1_SS_CLUE_RECORDED', true);
    this.manager.addNotepadAutoEntry('NOTE_A1_K_001');
    this.manager.setPhase('K');
  }
  private sync(): void {
    const { game, modules } = this.manager.getState();
    if (modules.photos.openedPhotoIds.includes(cavePhoto) && game.phase === 'I') this.onEditorOpened(cavePhoto);
    if (modules.photos.inspectedSymbolPhotoIds.includes(cavePhoto) && ['I', 'J'].includes(game.phase)) this.onSymbolInspected(cavePhoto);
  }
}

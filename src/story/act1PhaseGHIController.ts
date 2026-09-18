import { eventBus, type EventBus } from '../core/eventBus';
import { stateManager, type StateManager } from '../core/stateManager';
import { hotspotById } from '../data/sceneData';

const ids = {
  trailhead: 'SCENE_A1_G_001',
  cave: 'SCENE_A1_H_001',
  temple: 'SCENE_A1_I_001',
  aw: 'HOTSPOT_A1_H_014',
  bu: 'HOTSPOT_A1_I_005',
  cavePhoto: 'IMG_A1_H_003',
  templePhoto: 'IMG_A1_I_004',
} as const;
const flags = {
  awFound: 'FLAG_A1_AW_FOUND',
  awPhoto: 'FLAG_A1_AW_PHOTO_TAKEN',
  templeFound: 'FLAG_A1_TEMPLE_FOUND',
  buFound: 'FLAG_A1_BU_FOUND',
  templePhoto: 'FLAG_A1_TEMPLE_PHOTO_TAKEN',
} as const;

export class Act1PhaseGHIController {
  private unsubscribe: (() => void)[] = [];
  constructor(private readonly manager: StateManager = stateManager, private readonly bus: EventBus = eventBus) {}
  start(): void {
    this.unsubscribe.push(
      this.bus.on('journey:started', ({ sceneId }) => this.onJourneyStarted(sceneId)),
      this.bus.on('scene:entered', ({ sceneId }) => this.onSceneEntered(sceneId)),
      this.bus.on('scene:hotspot-inspected', ({ hotspotId }) => this.onHotspotInspected(hotspotId)),
      this.bus.on('scene:photo-captured', ({ sceneId, photoId }) => this.onPhotoCaptured(sceneId, photoId)),
    );
    this.restorePhase();
  }
  dispose(): void { this.unsubscribe.splice(0).forEach((unsubscribe) => unsubscribe()); }
  private setFlag(flagId: string): void { if (this.manager.getState().game.flags[flagId] !== true) this.manager.setFlag(flagId, true); }
  private onJourneyStarted(sceneId: string): void {
    if (sceneId === ids.trailhead && this.manager.getState().game.phase === 'F') this.manager.setPhase('G');
  }
  private onSceneEntered(sceneId: string): void {
    if (sceneId === ids.temple && this.manager.getState().game.flags[flags.awPhoto] === true) {
      this.setFlag(flags.templeFound);
      if (this.manager.getState().game.phase !== 'I') this.manager.setPhase('I');
    } else if (sceneId === ids.cave && this.manager.getState().game.phase === 'G') this.manager.setPhase('H');
  }
  private onHotspotInspected(hotspotId: string): void {
    const hotspot = hotspotById.get(hotspotId);
    const current = this.manager.getState().modules.scene.currentSceneId;
    if (!hotspot || hotspot.sceneId !== current) return;
    if (hotspotId === ids.aw && current === ids.cave) this.setFlag(flags.awFound);
    if (hotspotId === ids.bu && current === ids.temple && this.manager.getState().game.flags[flags.templeFound] === true) this.setFlag(flags.buFound);
  }
  private onPhotoCaptured(sceneId: string, photoId: string): void {
    const current = this.manager.getState().modules.scene.currentSceneId;
    if (sceneId !== current) return;
    if (sceneId === ids.cave && photoId === ids.cavePhoto && this.manager.getState().game.flags[flags.awFound] === true) this.setFlag(flags.awPhoto);
    if (sceneId === ids.temple && photoId === ids.templePhoto && this.manager.getState().game.flags[flags.templeFound] === true && this.manager.getState().game.flags[flags.buFound] === true) this.setFlag(flags.templePhoto);
  }
  private restorePhase(): void {
    const { game, modules } = this.manager.getState();
    if (!modules.scene.journeyStarted) return;
    if (modules.scene.currentSceneId === ids.trailhead && game.phase === 'F') this.manager.setPhase('G');
    if (modules.scene.currentSceneId === ids.cave && game.phase === 'G') this.manager.setPhase('H');
    if (modules.scene.currentSceneId === ids.temple && game.phase !== 'I' && game.flags[flags.awPhoto] === true) {
      this.setFlag(flags.templeFound);
      this.manager.setPhase('I');
    }
  }
}

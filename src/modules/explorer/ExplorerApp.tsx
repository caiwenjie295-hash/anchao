import { useSyncExternalStore } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { stateManager, type StateManager } from '../../core/stateManager';
import { photoById, type PhotoRecord } from '../../data/photoData';

export function ExplorerApp({ manager = stateManager }: { manager?: StateManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const photos = state.modules.scene.capturedPhotoIds.map((id) => photoById.get(id)).filter((photo): photo is PhotoRecord => Boolean(photo));
  return <section className="explorer-app" aria-label="资源管理器">
    <aside><strong>资源管理器</strong><span>快速访问</span><span>此电脑</span><span className="explorer-active">图片</span></aside>
    <main><header><p>此电脑　›　图片　›　鸡公岭</p><h2>鸡公岭</h2></header>{photos.length === 0 ? <p className="explorer-empty">这里还没有照片。</p> : <div className="photo-files">{photos.map((photo) => <button key={photo.id} type="button" className="photo-file" onClick={() => { manager.openPhotoEditor(photo.id); manager.openApp('photos'); }}><img className="photo-thumb" src={assetLoader.get(photo.id)!.src} alt="" data-asset-id={photo.id} /><strong>{photo.filename}</strong><small>{photo.caption}</small></button>)}</div>}</main>
  </section>;
}

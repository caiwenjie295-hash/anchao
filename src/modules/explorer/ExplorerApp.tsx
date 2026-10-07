import { useRef, useState } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { selectScene } from '../../core/store/selectors';
import { photoById, type PhotoRecord } from '../../data/photoData';

export function ExplorerApp({ manager = stateManager }: { manager?: StateManager }) {
  const sceneState = useAppSelector(manager, selectScene);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const pointerTypeRef = useRef('');
  const photos = sceneState.capturedPhotoIds.map((id) => photoById.get(id)).filter((photo): photo is PhotoRecord => Boolean(photo));
  const openPhoto = (photoId: string) => {
    manager.openPhotoEditor(photoId);
    manager.openApp('photos');
  };
  return <section className="explorer-app" aria-label="资源管理器">
    <aside aria-label="文件夹层级">
      <h2>快速访问</h2>
      <div className="explorer-tree__branch"><span aria-hidden="true">▾</span><strong>此电脑</strong></div>
      <span className="explorer-active" aria-current="page"><span aria-hidden="true">▣</span>图片</span>
    </aside>
    <main>
      <header>
        <nav className="explorer-breadcrumb" aria-label="当前位置"><ol><li>此电脑</li><li>图片</li><li aria-current="page">鸡公岭</li></ol></nav>
        <div className="explorer-folder-heading"><h2>鸡公岭</h2><span>{photos.length} 张照片</span></div>
      </header>
      {photos.length === 0 ? <p className="explorer-empty" role="status">这里还没有已保存的照片。</p> : <div className="photo-files" aria-label="已保存照片">{photos.map((photo) => {
        const imageSrc = assetLoader.get(photo.id)?.src;
        const selected = selectedPhotoId === photo.id;
        return <button
          key={photo.id}
          type="button"
          className={`photo-file${selected ? ' photo-file--selected' : ''}`}
          aria-pressed={selected}
          aria-label={`${selected ? '已选中，' : ''}${photo.title}，已拍摄`}
          title="单击选择，双击打开照片"
          onPointerDown={(event) => { pointerTypeRef.current = event.pointerType; }}
          onClick={(event) => {
            if (event.detail === 0 || pointerTypeRef.current === 'touch') openPhoto(photo.id);
            else setSelectedPhotoId(photo.id);
            pointerTypeRef.current = '';
          }}
          onDoubleClick={() => openPhoto(photo.id)}
        >
          {imageSrc ? <img className="photo-thumb" src={imageSrc} alt="" data-asset-id={photo.id} /> : <span className="photo-thumb photo-thumb--missing" aria-hidden="true">照片暂不可用</span>}
          <span className="photo-file__meta"><strong>{photo.title}</strong><span>{photo.filename}</span></span>
          <span className="photo-file__status">{selected ? '已选中' : '已拍摄'}</span>
          <small>{photo.caption}</small>
        </button>;
      })}</div>}
    </main>
  </section>;
}

import { useEffect, useRef, useState } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalAct2LibrarySnapshot, selectAct2LibrarySnapshot } from '../../core/store/selectors';
import { ACT2_SHELF_ROW_RECTS } from '../../data/act2Presentation';
import {
  libraryCompletion,
  libraryCorrectSectionId,
  libraryExcerpt,
  libraryFlagIds,
  libraryKeywordsByPageId,
  libraryPageById,
  libraryPagesByVolumeId,
  librarySceneCopy,
  librarySections,
  libraryTargetPageId,
  libraryTargetVolumeId,
  libraryVolumes,
} from '../../data/act2LibraryData';
import { Act2ReadingRoom } from './Act2ReadingRoom';
import { Act2ShelfMap } from './Act2ShelfMap';
import '../../act2/act2ReadingRoom.css';
import '../../act2/t03Library.css';

/** 放大倍率：组件瞬时状态，明确上下界与步进。 */
export const LIBRARY_MIN_ZOOM = 1;
export const LIBRARY_MAX_ZOOM = 2;
export const LIBRARY_ZOOM_STEP = 0.25;

const clampZoom = (value: number): number =>
  Math.min(LIBRARY_MAX_ZOOM, Math.max(LIBRARY_MIN_ZOOM, Math.round(value * 100) / 100));

export interface LibraryResearchProps {
  /** 允许测试注入隔离的 StateManager；缺省使用全局单例。 */
  manager?: StateManager;
  /** 明确的返回桌面出口。 */
  onReturnToDesktop?: () => void;
  /** Optional local-preview image source; the regular game always uses the registered asset. */
  shelfImageSrc?: string;
}

/**
 * 第二幕 T03：县图书馆地方志检索。
 * 只通过冻结的 StateManager 方法推进状态；故事 Flag 由本内容控制器在对应节点写入。
 */
export function LibraryResearch({ manager = stateManager, onReturnToDesktop, shelfImageSrc }: LibraryResearchProps) {
  const state = useAppSelector(manager, selectAct2LibrarySnapshot, equalAct2LibrarySnapshot);
  const stage = state.modules.act2Research.stage;
  const library = state.modules.act2Research.library;
  const flags = state.game.flags;
  const [zoom, setZoom] = useState(LIBRARY_MIN_ZOOM);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(() => library.visitedSectionIds.includes(libraryCorrectSectionId) ? libraryCorrectSectionId : null);
  /** P09：页角翻页短动效方向；底部分页器仍可用，页缘为主热区。 */
  const [pageTurnDir, setPageTurnDir] = useState<'prev' | 'next' | null>(null);
  const pageTurnTimerRef = useRef<number | null>(null);

  const enteredFlag = flags[libraryFlagIds.entered] === true;
  const gazetteFlag = flags[libraryFlagIds.gazetteFound] === true;
  const bumuzhiFlag = flags[libraryFlagIds.bumuzhiFound] === true;
  const ruleKnown = flags[libraryFlagIds.ruleKnown] === true;

  // 进入场景即幂等写 FLAG_A2_LIBRARY_ENTERED。
  useEffect(() => {
    if (stage !== 'library' || enteredFlag) return;
    manager.setFlag(libraryFlagIds.entered, true);
  }, [manager, stage, enteredFlag]);

  // 到达目标页即幂等写 FLAG_A2_BUMUZHI_FOUND；此时尚未完成 T03。
  const targetPageActive = stage === 'library' && library.currentPageId === libraryTargetPageId;
  useEffect(() => {
    if (!targetPageActive || bumuzhiFlag) return;
    manager.readAct2GazetteTargetPage();
  }, [manager, targetPageActive, bumuzhiFlag]);

  useEffect(() => () => {
    if (pageTurnTimerRef.current !== null) window.clearTimeout(pageTurnTimerRef.current);
  }, []);

  if (stage !== 'library') return null;
  const sceneImage = shelfImageSrc ?? assetLoader.get(librarySceneCopy.placeholderAssetId)?.src;

  const correctSectionVisited = library.visitedSectionIds.includes(libraryCorrectSectionId);
  const gazetteFound = gazetteFlag || correctSectionVisited;
  const activeSection = activeSectionId ? librarySections.find((section) => section.id === activeSectionId) ?? null : null;

  const currentPage = library.currentPageId ? libraryPageById.get(library.currentPageId) ?? null : null;
  const currentVolume = currentPage ? libraryVolumes.find((volume) => volume.id === currentPage.volumeId) ?? null : null;
  const isTargetVolumeOpen = currentVolume?.id === libraryTargetVolumeId;
  const targetVolumeCover = assetLoader.get('IMG_A2_T03_002');
  const volumeCoverSource = isTargetVolumeOpen ? targetVolumeCover?.src ?? sceneImage : undefined;
  const volumeCoverAssetId = targetVolumeCover ? 'IMG_A2_T03_002' : librarySceneCopy.placeholderAssetId;
  const pagePaperSource = isTargetVolumeOpen ? assetLoader.get('IMG_A2_T03_003')?.src : undefined;
  const volumePages = currentPage ? libraryPagesByVolumeId.get(currentPage.volumeId) ?? [] : [];
  const shelfEntries = libraryVolumes.map((volume, index) => ({ id: volume.id, label: volume.title, rect: ACT2_SHELF_ROW_RECTS[index] }));
  const currentIndex = currentPage ? volumePages.findIndex((page) => page.id === currentPage.id) : -1;
  const prevPage = currentIndex > 0 ? volumePages[currentIndex - 1] : null;
  const nextPage = currentIndex >= 0 && currentIndex < volumePages.length - 1 ? volumePages[currentIndex + 1] : null;

  const keywords = currentPage ? libraryKeywordsByPageId.get(currentPage.id) ?? [] : [];
  const markedKeywordIds = library.markedKeywordIds;
  const bookmarked = currentPage ? library.bookmarkedPageIds.includes(currentPage.id) : false;
  const excerpted = library.excerptedEntryIds.includes(libraryExcerpt.entryId);

  const playPageTurnMotion = (dir: 'prev' | 'next') => {
    if (pageTurnTimerRef.current !== null) window.clearTimeout(pageTurnTimerRef.current);
    setPageTurnDir(dir);
    pageTurnTimerRef.current = window.setTimeout(() => {
      setPageTurnDir(null);
      pageTurnTimerRef.current = null;
    }, 300);
  };

  const goPrevPage = () => {
    if (!prevPage) return;
    playPageTurnMotion('prev');
    manager.openGazettePage(prevPage.id);
  };

  const goNextPage = () => {
    if (!nextPage) return;
    playPageTurnMotion('next');
    manager.openGazettePage(nextPage.id);
  };

  const visitSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    manager.visitGazetteSection(sectionId);
    if (sectionId === libraryCorrectSectionId && manager.getState().game.flags[libraryFlagIds.gazetteFound] !== true) {
      manager.setFlag(libraryFlagIds.gazetteFound, true);
    }
  };

  const openVolume = (volumeId: string) => {
    manager.openGazetteVolume(volumeId);
    const firstPage = libraryPagesByVolumeId.get(volumeId)?.[0];
    if (firstPage) manager.openGazettePage(firstPage.id);
  };


  const actions: InvestigationAction[] = [{
    actionId: 'A2_T03_TO_TALES', kind: 'story', target: 'tales', label: '继续对照三篇志异',
    state: ruleKnown ? 'ready' : 'blocked',
    reason: '先在《补母志》目标页读完这段记载；阅读会自动登记来源。',
    relatedMaterials: ruleKnown ? undefined : [{ id: 'catalog', label: '目录、卷册与书页' }],
    onActivate: () => manager.setAct2Stage('tales'),
  }];
  const focusCatalog = () => {
    const catalog = document.querySelector<HTMLDetailsElement>('.act2-library__catalog');
    if (catalog) catalog.open = true;
    catalog?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <InvestigationShell
      ariaLabel="县图书馆地方志调查"
      className="investigation-shell--reading"
      actLabel="第二幕 · 民俗疑问"
      locationLabel="县图书馆阅览室"
      contextLabel="地方志目录 · 卷册 · 书页"
      objective="从县志里找到鸡公岭附近的旧俗记录，读清楚它描述了什么。"
      helpText="先缩小目录范围，再打开书架上的卷册并逐页翻阅。读到《补母志》后，来源会自动记入笔记；关键词和书签可用于回看，不是额外通关清单。"
      actions={actions}
      onExit={() => onReturnToDesktop?.()}
      onOpenMaterial={() => focusCatalog()}
    >
    <section className="act2-library" aria-label={`${librarySceneCopy.title} · 地方志检索`}>
      <Act2ReadingRoom
        ariaLabel="县图书馆地方志阅读空间"
        className="act2-reading-room--library"
        eyebrow={librarySceneCopy.eyebrow}
        title={librarySceneCopy.title}
        description={librarySceneCopy.intro}
        archive={<>
        <details className="act2-library__catalog">
          <summary id="act2-library-catalog-title"><span>{librarySceneCopy.catalogTitle}</span><small>九类目录 · 按需查阅</small></summary>
          <div className="act2-library__catalog-body">
          <p className="act2-library__hint">{librarySceneCopy.catalogHint}</p>
          <ul className="act2-library__sections">
            {librarySections.map((section) => {
              const active = section.id === activeSectionId;
              const correct = section.isCorrect;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    className={`act2-library__section${correct && correctSectionVisited ? ' act2-library__section--narrowed' : ''}`}
                    data-section-id={section.id}
                    aria-current={active ? 'true' : undefined}
                    aria-pressed={active}
                    onClick={() => visitSection(section.id)}
                  >
                    {section.name}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="act2-library__noise-note">{librarySceneCopy.catalogNoiseNote}</p>
          <div className="act2-library__section-note" aria-live="polite">
            {activeSection ? (
              <>
                <h3>{activeSection.name}</h3>
                <p>{activeSection.summary}</p>
              </>
            ) : correctSectionVisited ? (
              <><h3>地方传说</h3><p>{librarySections.find((section) => section.id === libraryCorrectSectionId)?.summary}</p></>
            ) : (
              <p>选一门类，先看目录怎么说。</p>
            )}
          </div>
          </div>
        </details>

        <section className="act2-library__shelf" aria-labelledby="act2-library-shelf-title">
          <h2 id="act2-library-shelf-title" className="act2-library__subtitle">{librarySceneCopy.shelfTitle}</h2>
          <Act2ShelfMap
            assetId={librarySceneCopy.placeholderAssetId}
            source={sceneImage}
            imageAlt="县图书馆阅览区，左侧书架上有多层地方志和县志"
            label="县图书馆书架照片"
            entries={shelfEntries}
            selectedId={currentVolume?.id}
            disabled={!gazetteFound}
            lockedHint="先在目录里选择地方传说，再辨认书架上的现有卷册。"
            onSelect={openVolume}
          />
          {currentVolume && <div className="act2-library__volume-context">
            {volumeCoverSource && <figure className="act2-library__volume-cover" data-asset-id={volumeCoverAssetId}><img src={volumeCoverSource} alt={`从书架取下的${currentVolume.title}`} /><figcaption>取下的卷册</figcaption></figure>}
            <p><span>{currentVolume.spine}</span> · {currentVolume.title} — {currentVolume.summary}</p>
          </div>}
        </section>
        </>}
        reader={<>

        <section className="act2-library__reader" aria-labelledby="act2-library-reader-title">
          <h3 id="act2-library-reader-title" className="act2-library__reader-title">{currentVolume?.title ?? '卷内阅读'}</h3>
          {!currentPage ? (
            <div className="act2-library__paper-empty"><p className="act2-library__reader-idle">{gazetteFound ? '从书架选择一册，逐页翻阅。' : '先从目录找到地方传说，再查看书架上的卷册。'}</p></div>
          ) : (
            <>
              <p className="act2-library__reader-instruction">{librarySceneCopy.readerInstruction}</p>
              {/* 静态页序：仅作进度展示，未到达的页不得是可激活控件，翻页只能经上一页/下一页。 */}
              <ol className="act2-library__leaves" aria-label="卷内页序" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {volumePages.map((page) => {
                  const current = page.id === currentPage.id;
                  return (
                    <li
                      key={page.id}
                      className="act2-library__leaf"
                      data-page-id={page.id}
                      data-leaf-state={current ? 'current' : 'pending'}
                      aria-current={current ? 'page' : undefined}
                      style={{ cursor: 'default' }}
                    >
                      {page.leafLabel}
                    </li>
                  );
                })}
              </ol>

              <article
                className={`act2-library__page${pageTurnDir === 'next' ? ' act2-library__page--turning-next' : ''}${pageTurnDir === 'prev' ? ' act2-library__page--turning-prev' : ''}`}
                data-page-id={currentPage.id}
                data-volume-id={currentPage.volumeId}
              >
                <header className="act2-library__page-head">
                  <h3>{currentPage.heading}</h3>
                  <p className="act2-library__page-leaf">{currentVolume?.title} · {currentPage.leafLabel}</p>
                </header>
                {pagePaperSource && <figure className="act2-library__paper-illustration" data-asset-id="IMG_A2_T03_003"><img src={pagePaperSource} alt="地方志旧卷的纸张配图" /><figcaption>旧卷纸张 · 阅读正文见下方</figcaption></figure>}
                <div className="act2-library__page-text" style={{ fontSize: `${16 * zoom}px` }}>
                  {currentPage.paragraphs.map((paragraph, index) => (
                    <p key={`${currentPage.id}-p${index + 1}`}>{paragraph}</p>
                  ))}
                </div>
                <button
                  type="button"
                  className="act2-library__page-turn act2-library__page-turn--prev"
                  aria-label="翻到上一页（页缘）"
                  disabled={!prevPage}
                  onClick={goPrevPage}
                >
                  <span className="act2-library__page-turn-corner" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="act2-library__page-turn act2-library__page-turn--next"
                  aria-label="翻到下一页（页缘）"
                  disabled={!nextPage}
                  onClick={goNextPage}
                >
                  <span className="act2-library__page-turn-corner" aria-hidden="true" />
                </button>
              </article>

              {currentPage.id === libraryTargetPageId && <aside className="act2-library__excerpt" aria-label="地方志摘录" data-excerpt-state={excerpted ? 'saved' : undefined}>
                <div><h3>{libraryExcerpt.title}</h3><p>读完这一页后，可以把这段现有摘录收入调查笔记。</p></div>
                <blockquote>{libraryExcerpt.content}</blockquote>
                {excerpted ? <p className="act2-library__excerpt-confirm" role="status">摘录已收入调查笔记。</p> : null}
                <button type="button" className="act2-library__excerpt-button" aria-pressed={excerpted} disabled={excerpted} onClick={() => manager.excerptGazetteEntry(libraryExcerpt.entryId)}>{excerpted ? '已收入调查笔记' : '摘录到调查笔记'}</button>
              </aside>}

              <div className="act2-library__controls">
                <div className="act2-library__pager">
                  <button
                    type="button"
                    className="act2-library__prev"
                    disabled={!prevPage}
                    onClick={goPrevPage}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    className="act2-library__next"
                    disabled={!nextPage}
                    onClick={goNextPage}
                  >
                    下一页
                  </button>
                </div>
                <div className="act2-library__tools">
                  <button
                    type="button"
                    className="act2-library__zoom-out"
                    disabled={zoom <= LIBRARY_MIN_ZOOM}
                    onClick={() => setZoom((value) => clampZoom(value - LIBRARY_ZOOM_STEP))}
                  >
                    缩小
                  </button>
                  <span className="act2-library__zoom-value" aria-live="polite">×{zoom.toFixed(2)}</span>
                  <button
                    type="button"
                    className="act2-library__zoom-in"
                    disabled={zoom >= LIBRARY_MAX_ZOOM}
                    onClick={() => setZoom((value) => clampZoom(value + LIBRARY_ZOOM_STEP))}
                  >
                    放大
                  </button>
                  <button
                    type="button"
                    className="act2-library__bookmark"
                    aria-pressed={bookmarked}
                    onClick={() => manager.toggleGazetteBookmark(currentPage.id)}
                  >
                    {bookmarked ? '已加书签' : '加书签'}
                  </button>
                </div>
              </div>

              <details className="act2-library__keywords">
                <summary className="act2-library__keywords-title">可选标记关键词</summary>
                <ul className="act2-library__keyword-list">
                  {keywords.map((keyword) => {
                    const marked = markedKeywordIds.includes(keyword.id);
                    return (
                      <li key={keyword.id}>
                        <button
                          type="button"
                          className={`act2-library__keyword${keyword.core ? ' act2-library__keyword--core' : ''}`}
                          data-keyword-id={keyword.id}
                          aria-pressed={marked}
                          onClick={() => manager.markGazetteKeyword(keyword.id)}
                        >
                          <span className="act2-library__keyword-label">{keyword.label}</span>
                          <span className="act2-library__keyword-gloss">{keyword.gloss}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>

            </>
          )}
        </section>
        <aside className="act2-library__result" aria-live="polite">
        {ruleKnown ? (
          <div className="act2-library__conclusion">
            <h2>{libraryCompletion.title}</h2>
            <p className="act2-library__conclusion-line">{libraryCompletion.conclusion}</p>
            <p className="act2-library__conclusion-detail">{libraryCompletion.detail}</p>
          </div>
        ) : (
          <p className="act2-library__ambience">{librarySceneCopy.ambience}</p>
        )}
        </aside>
        </>}
      />

    </section>
    </InvestigationShell>
  );
}

export default LibraryResearch;

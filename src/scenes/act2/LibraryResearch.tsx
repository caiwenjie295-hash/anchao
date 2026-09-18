import { useEffect, useState, useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import {
  countMarkedCoreKeywords,
  libraryCompletion,
  libraryCorrectSectionId,
  libraryEntryId,
  libraryFlagIds,
  libraryKeywordsByPageId,
  libraryNoteId,
  libraryPageById,
  libraryPagesByVolumeId,
  libraryRequiredCoreKeywordCount,
  librarySceneCopy,
  librarySections,
  libraryTargetPageId,
  libraryVolumes,
} from '../../data/act2LibraryData';
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
}

/**
 * 第二幕 T03：县图书馆地方志检索。
 * 只通过冻结的 StateManager 方法推进状态；故事 Flag 由本内容控制器在对应节点写入。
 */
export function LibraryResearch({ manager = stateManager, onReturnToDesktop }: LibraryResearchProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const stage = state.modules.act2Research.stage;
  const library = state.modules.act2Research.library;
  const flags = state.game.flags;
  const [zoom, setZoom] = useState(LIBRARY_MIN_ZOOM);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

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
    manager.setFlag(libraryFlagIds.bumuzhiFound, true);
  }, [manager, targetPageActive, bumuzhiFlag]);

  if (stage !== 'library') return null;

  const correctSectionVisited = library.visitedSectionIds.includes(libraryCorrectSectionId);
  const gazetteFound = gazetteFlag || correctSectionVisited;
  const activeSection = activeSectionId ? librarySections.find((section) => section.id === activeSectionId) ?? null : null;

  const currentPage = library.currentPageId ? libraryPageById.get(library.currentPageId) ?? null : null;
  const currentVolume = currentPage ? libraryVolumes.find((volume) => volume.id === currentPage.volumeId) ?? null : null;
  const volumePages = currentPage ? libraryPagesByVolumeId.get(currentPage.volumeId) ?? [] : [];
  const currentIndex = currentPage ? volumePages.findIndex((page) => page.id === currentPage.id) : -1;
  const prevPage = currentIndex > 0 ? volumePages[currentIndex - 1] : null;
  const nextPage = currentIndex >= 0 && currentIndex < volumePages.length - 1 ? volumePages[currentIndex + 1] : null;

  const keywords = currentPage ? libraryKeywordsByPageId.get(currentPage.id) ?? [] : [];
  const markedKeywordIds = library.markedKeywordIds;
  const markedCoreCount = countMarkedCoreKeywords(markedKeywordIds);
  const onTargetPage = currentPage?.id === libraryTargetPageId;
  const excerptUnlocked = onTargetPage && markedCoreCount >= libraryRequiredCoreKeywordCount;
  const excerpted = library.excerptedEntryIds.includes(libraryEntryId);
  const bookmarked = currentPage ? library.bookmarkedPageIds.includes(currentPage.id) : false;

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

  const excerpt = () => {
    if (!excerptUnlocked) return;
    manager.excerptGazetteEntry(libraryEntryId);
    manager.addNotepadAutoEntry(libraryNoteId);
    if (manager.getState().game.flags[libraryFlagIds.ruleKnown] !== true) {
      manager.setFlag(libraryFlagIds.ruleKnown, true);
    }
  };

  return (
    <section className="act2-library" aria-label={`${librarySceneCopy.title} · 地方志检索`}>
      <a className="act2-library__skip" href="#act2-library-return">跳到返回按钮</a>

      <header className="act2-library__header">
        <p className="act2-library__eyebrow">{librarySceneCopy.eyebrow}</p>
        <h1 className="act2-library__title">{librarySceneCopy.title}</h1>
        <p className="act2-library__intro">{librarySceneCopy.intro}</p>
      </header>

      <div className="act2-library__body">
        <section className="act2-library__catalog" aria-labelledby="act2-library-catalog-title">
          <h2 id="act2-library-catalog-title" className="act2-library__subtitle">{librarySceneCopy.catalogTitle}</h2>
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
            ) : (
              <p>选一门类，先看目录怎么说。</p>
            )}
          </div>
        </section>

        <section className="act2-library__shelf" aria-labelledby="act2-library-shelf-title">
          <div className="act2-library__shelf-art" data-asset-id={librarySceneCopy.placeholderAssetId} aria-hidden="true" />
          <h2 id="act2-library-shelf-title" className="act2-library__subtitle">{librarySceneCopy.shelfTitle}</h2>
          {gazetteFound ? (
            <ul className="act2-library__volumes">
              {libraryVolumes.map((volume) => (
                <li key={volume.id}>
                  <button
                    type="button"
                    className="act2-library__volume"
                    data-volume-id={volume.id}
                    aria-current={currentVolume?.id === volume.id ? 'true' : undefined}
                    onClick={() => openVolume(volume.id)}
                  >
                    <span className="act2-library__spine">{volume.spine}</span>
                    <span className="act2-library__volume-title">{volume.title}</span>
                    <span className="act2-library__volume-summary">{volume.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="act2-library__shelf-locked">范围还没收窄到册。先在上面选定一门类。</p>
          )}
        </section>

        <section className="act2-library__reader" aria-labelledby="act2-library-reader-title">
          <h2 id="act2-library-reader-title" className="act2-library__subtitle">卷册</h2>
          {!currentPage ? (
            <p className="act2-library__reader-idle">从架上取一册，逐叶翻。</p>
          ) : (
            <>
              <p className="act2-library__reader-instruction">{librarySceneCopy.readerInstruction}</p>
              {/* 静态页序：仅作进度展示，未到达的页不得是可激活控件，翻页只能经上一叶/下一叶。 */}
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

              <article className="act2-library__page" data-page-id={currentPage.id} data-volume-id={currentPage.volumeId}>
                <header className="act2-library__page-head">
                  <h3>{currentPage.heading}</h3>
                  <p className="act2-library__page-leaf">{currentVolume?.title} · {currentPage.leafLabel}</p>
                </header>
                <div className="act2-library__page-text" style={{ fontSize: `${14 * zoom}px` }}>
                  {currentPage.paragraphs.map((paragraph, index) => (
                    <p key={`${currentPage.id}-p${index + 1}`}>{paragraph}</p>
                  ))}
                </div>
              </article>

              <div className="act2-library__controls">
                <div className="act2-library__pager">
                  <button
                    type="button"
                    className="act2-library__prev"
                    disabled={!prevPage}
                    onClick={() => prevPage && manager.openGazettePage(prevPage.id)}
                  >
                    上一叶
                  </button>
                  <button
                    type="button"
                    className="act2-library__next"
                    disabled={!nextPage}
                    onClick={() => nextPage && manager.openGazettePage(nextPage.id)}
                  >
                    下一叶
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

              <div className="act2-library__keywords" aria-label="可标记关键词">
                <h4 className="act2-library__keywords-title">标记关键词</h4>
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
                <p className="act2-library__keyword-status" aria-live="polite">
                  已标记核心词 {markedCoreCount} / {libraryRequiredCoreKeywordCount}
                </p>
              </div>

              <div className="act2-library__excerpt">
                <button
                  type="button"
                  className="act2-library__excerpt-button"
                  disabled={!excerptUnlocked}
                  onClick={excerpt}
                >
                  {excerpted ? '已摘录到记事本' : '摘录到记事本'}
                </button>
                {!excerptUnlocked && (
                  <span className="act2-library__excerpt-hint">
                    翻到《补母志》正文，并至少标记 3 个核心词。
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      </div>

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

      <footer className="act2-library__footer">
        <button
          type="button"
          id="act2-library-return"
          className="act2-library__return"
          onClick={() => onReturnToDesktop?.()}
        >
          {librarySceneCopy.returnLabel}
        </button>
      </footer>
    </section>
  );
}

export default LibraryResearch;

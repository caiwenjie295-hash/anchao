import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { stateManager as defaultManager, type StateManager } from '../../core/stateManager';
import { getChapterChoices, type ChapterId } from '../../core/chapterNavigation';
import { useBackgroundMusic } from '../../media/useBackgroundMusic';
import './chapterNavigation.css';

type Confirmation = { kind: 'replay'; chapter: ChapterId } | { kind: 'reset' };

export function ChapterNavigation({
  manager = defaultManager,
  blocked = false,
  placement = 'floating',
  onReplay,
  onReset,
}: {
  manager?: StateManager;
  blocked?: boolean;
  placement?: 'floating' | 'taskbar' | 'header' | 'scene' | 'ending';
  onReplay?: (chapter: ChapterId) => void;
  onReset?: () => boolean;
}) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const music = useBackgroundMusic();
  const history = manager.getChapterHistory();
  const choices = getChapterChoices(state, history.history);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const closeMenuRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmation) cancelRef.current?.focus();
    else if (originRef.current?.isConnected) {
      originRef.current.focus();
      originRef.current = null;
    }
  }, [confirmation]);

  useEffect(() => {
    if (open) closeMenuRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open && !confirmation) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open, confirmation]);

  if (blocked) return null;

  const closeConfirmation = () => {
    setConfirmation(null);
    setError('');
  };

  const beginConfirmation = (next: Confirmation, origin: HTMLElement) => {
    originRef.current = origin;
    setError('');
    setConfirmation(next);
  };

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (confirmation) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const controls = [...(menuRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), summary, input:not(:disabled)') ?? [])]
      .filter((element) => !element.closest('details:not([open])') || element.tagName === 'SUMMARY');
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const confirm = () => {
    if (!confirmation) return;
    if (confirmation.kind === 'replay') {
      const result = manager.replayChapter(confirmation.chapter);
      if (!result.ok) {
        setError(result.reason === 'chapter-locked' ? '这一幕还没有解锁。' : '存档暂时无法写入，当前进度没有改变。');
        return;
      }
      setConfirmation(null);
      setOpen(false);
      onReplay?.(confirmation.chapter);
      return;
    }
    const resetSucceeded = onReset ? onReset() : manager.resetProgress();
    if (!resetSucceeded) {
      setError('清零未完成，当前进度没有改变。请检查存档可用状态后重试。');
      return;
    }
    setConfirmation(null);
    setOpen(false);
  };

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeConfirmation();
      return;
    }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const first = cancelRef.current;
    const last = confirmRef.current;
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <>
    <div className={`chapter-navigation chapter-navigation--${placement}`}>
      <button
        ref={triggerRef}
        type="button"
        className="chapter-navigation__trigger"
        aria-expanded={open}
        aria-controls="chapter-navigation-menu"
        onClick={() => setOpen((value) => !value)}
      >章节选择</button>
    </div>
    {open && createPortal(<div className="chapter-navigation__backdrop chapter-navigation__menu-backdrop" inert={confirmation ? true : undefined} aria-hidden={confirmation ? true : undefined} onMouseDown={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
      <section ref={menuRef} id="chapter-navigation-menu" className="chapter-navigation__menu chapter-navigation__menu--centered" role="dialog" aria-modal={confirmation ? undefined : true} aria-labelledby="chapter-navigation-menu-title" onKeyDown={onMenuKeyDown}>
        <div className="chapter-navigation__menu-heading"><h2 id="chapter-navigation-menu-title">从已到达的章节开头重玩</h2><button ref={closeMenuRef} type="button" className="chapter-navigation__close" aria-label="关闭章节选择" onClick={closeMenu}>关闭</button></div>
        <p>只列出实际进入过的章节。重玩不会收回已经解锁的后续章节。</p>
        <section className="chapter-navigation__music" aria-label="背景音乐" role="group">
          <div className="chapter-navigation__music-heading">
            <strong>{music.enabled ? '背景音乐已开启' : '背景音乐已关闭'}</strong>
            <button type="button" className="chapter-navigation__music-toggle" aria-pressed={music.enabled} onClick={() => { void music.setEnabled(!music.enabled); }}>
              {music.enabled ? '关闭' : '开启'}
            </button>
          </div>
          <label className="chapter-navigation__music-label" htmlFor="chapter-navigation-music-volume">
            <span>音量</span><span>{Math.round(music.volume * 100)}%</span>
          </label>
          <input
            id="chapter-navigation-music-volume"
            className="chapter-navigation__music-range"
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(music.volume * 100)}
            aria-label="背景音乐音量"
            aria-valuetext={`${Math.round(music.volume * 100)}%`}
            onChange={(event) => { void music.setVolume(Number(event.currentTarget.value) / 100); }}
          />
          <p className="chapter-navigation__music-status" role="status">
            {music.status === 'playing' ? '正在播放' : music.status === 'blocked' ? '浏览器暂未允许播放，请点击重试。' : music.status === 'error' ? '当前浏览器无法播放这段音乐。' : music.status === 'paused' ? (music.enabled ? '音乐已暂停。' : '音乐已关闭。') : '首次交互后开始播放。'}
          </p>
          {music.status === 'blocked' && <button type="button" className="chapter-navigation__music-retry" onClick={() => { void music.retry(); }}>重试播放</button>}
        </section>
        <div className="chapter-navigation__choices">
          {choices.map((choice) => <button
            key={choice.id}
            type="button"
            className="chapter-navigation__choice"
            disabled={!choice.unlocked || history.kind === 'unavailable'}
            onClick={(event) => beginConfirmation({ kind: 'replay', chapter: choice.id }, event.currentTarget)}
          >{choice.unlocked ? choice.title : `第${choice.id}幕 · 尚未到达`}</button>)}
        </div>
        {history.kind === 'unavailable' && <p className="chapter-navigation__warning" role="status">章节记录暂不可读取，当前存档仍可继续游玩。</p>}
        <details className="chapter-navigation__other">
          <summary>其他选项</summary>
          <button type="button" className="chapter-navigation__clear" onClick={(event) => beginConfirmation({ kind: 'reset' }, event.currentTarget)}>清零进度</button>
        </details>
      </section>
    </div>, document.body)}
    {confirmation && createPortal(<div className="chapter-navigation__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConfirmation(); }}>
      <div
        className="chapter-navigation__confirmation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-navigation-confirm-title"
        aria-describedby="chapter-navigation-confirm-copy"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
      >
        <h2 id="chapter-navigation-confirm-title">{confirmation.kind === 'reset' ? '确认清零进度？' : '确认重玩这一幕？'}</h2>
        <p id="chapter-navigation-confirm-copy">{confirmation.kind === 'reset'
          ? '这会清除全部剧情进度、章节解锁、阅读位置、照片编辑和手写笔记，并从失踪前言重新开始。'
          : '将替换当前游玩进度，从这一幕开头重玩。当前章节及后续的调查答案、已读状态和手写笔记会被入口记录替换；此前真实完成的章节材料会保留。'}</p>
        {error && <p className="chapter-navigation__error" role="alert">{error}</p>}
        <div className="chapter-navigation__confirmation-actions">
          <button ref={cancelRef} type="button" onClick={closeConfirmation}>取消</button>
          <button ref={confirmRef} type="button" className={confirmation.kind === 'reset' ? 'chapter-navigation__danger' : undefined} onClick={confirm}>{confirmation.kind === 'reset' ? '确认清零' : '确认重玩'}</button>
        </div>
      </div>
    </div>, document.body)}
  </>;
}

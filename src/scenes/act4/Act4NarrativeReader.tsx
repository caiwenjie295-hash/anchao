import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { stateManager, type StateManager } from '../../core/stateManager';
import { act4NarrativeSections, act4NarrativeExplanations, act4NarrativeEnding } from '../../data/narrative/act4Narrative';
import { act4OldMails } from '../../data/act4/mail';
import { assetLoader } from '../../core/assetLoader';
import { act4NarrativeActionsSatisfied, type ActiveAct4NarrativeStage } from '../../story/act4/narrativePolicy';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import '../../act4/act4.css';

const blockedReason: Partial<Record<ActiveAct4NarrativeStage, string>> = {
  T02: '先分别核对两封邮件的日期，再用这一天登录。',
  T04: '读完情境后打开 VVaKe 邮件，再继续后面的原文。',
  T08: '到达档案馆后，打开 2008 年的档案。',
  T09: '先把笔记藏好，再走到门外听完广播。',
  T10: '读完当下的故事后打开最后一封邮件。',
};

const perspectiveLabel = (perspective: 'investigator' | 'wangao') => perspective === 'wangao'
  ? '王澳当时的亲历'
  : '主角与小月的调查';

export function Act4NarrativeReader({ manager = stateManager, onExit }: { manager?: StateManager; onExit: () => void }) {
  const whole = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const state = whole.modules.act4;
  const currentStage = state.stage;
  const [reviewStage, setReviewStage] = useState<ActiveAct4NarrativeStage | null>(null);
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [passwordHintLevel, setPasswordHintLevel] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [failedIllustrationStage, setFailedIllustrationStage] = useState<ActiveAct4NarrativeStage | null>(null);
  const readerRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reviewTriggerRef = useRef<string | null>(null);
  const savedCurrentPositionRef = useRef<{ scrollTop: number } | null>(null);
  const returningToCurrentRef = useRef(false);
  const continueClickLockRef = useRef(false);
  const actions = state.completedNarrativeActionIds;
  const hasAction = (actionId: string | undefined) => actionId !== undefined && actions.includes(actionId as typeof actions[number]);

  const section = act4NarrativeSections.find((item) => item.stage === (reviewStage ?? currentStage));
  const reviewing = section !== undefined && section.stage !== currentStage;

  function openReview(targetStage: ActiveAct4NarrativeStage, triggerKey: string): void {
    if (targetStage === currentStage) {
      if (reviewStage !== null) returnToCurrent();
      return;
    }
    if (reviewStage === null) {
      const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
      savedCurrentPositionRef.current = { scrollTop: scene?.scrollTop ?? 0 };
      reviewTriggerRef.current = triggerKey;
    }
    setReviewStage(targetStage);
  }

  function returnToCurrent(): void {
    returningToCurrentRef.current = true;
    setReviewStage(null);
  }

  function continueCurrentSection(expectedStage: ActiveAct4NarrativeStage): void {
    if (continueClickLockRef.current) return;
    continueClickLockRef.current = true;
    window.setTimeout(() => { continueClickLockRef.current = false; }, 500);
    manager.advanceAct4NarrativeSection(expectedStage);
  }

  useLayoutEffect(() => {
    const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
    if (!scene) return;
    if (reviewing) {
      scene.scrollTop = 0;
      readerRef.current?.focus({ preventScroll: true });
      return;
    }
    if (returningToCurrentRef.current && savedCurrentPositionRef.current) {
      scene.scrollTop = savedCurrentPositionRef.current.scrollTop;
      returningToCurrentRef.current = false;
      savedCurrentPositionRef.current = null;
      const triggerKey = reviewTriggerRef.current;
      const trigger = triggerKey
        ? [...(readerRef.current?.querySelectorAll<HTMLElement>('[data-review-trigger]') ?? [])].find((item) => item.dataset.reviewTrigger === triggerKey)
        : undefined;
      reviewTriggerRef.current = null;
      (trigger ?? readerRef.current)?.focus({ preventScroll: true });
    } else {
      scene.scrollTop = 0;
      readerRef.current?.focus({ preventScroll: true });
    }
  }, [section?.stage, reviewing]);

  useEffect(() => {
    if (!zoomOpen) return;
    const shell = readerRef.current?.closest<HTMLElement>('.investigation-shell');
    returnFocusRef.current = zoomButtonRef.current;
    shell?.setAttribute('inert', '');
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      shell?.removeAttribute('inert');
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [zoomOpen]);
  if (!section) return null;
  const stage = section.stage;
  const actionCompleted = act4NarrativeActionsSatisfied(stage, actions);
  const sectionCompleted = state.completedNarrativeSectionIds.includes(section.id);
  const finalCompleted = stage === 'T10' && sectionCompleted && whole.game.flags.FLAG_A4_COMPLETE === true;
  const continueAction: InvestigationAction = reviewing
    ? {
      actionId: 'A4_RETURN_TO_CURRENT_PROGRESS', kind: 'return', label: '返回当前阅读进度', state: 'ready',
      onActivate: returnToCurrent,
    }
    : {
      actionId: `A4_${stage}_CONTINUE_READING`,
      kind: stage === 'T10' ? 'story' : 'memory',
      target: stage === 'T10' ? 'A4_COMPLETE' : `A4_READ_T${String(Number(stage.slice(1)) + 1).padStart(2, '0')}`,
      label: finalCompleted ? '第四幕已完成' : stage === 'T10' ? '完成第四幕' : '收好这一段，继续阅读',
      state: finalCompleted ? 'completed' : actionCompleted ? 'ready' : 'blocked',
      reason: actionCompleted ? undefined : blockedReason[stage] ?? '先读完这一段原文。',
      onActivate: () => continueCurrentSection(stage),
    };

  const visibleBlocks = section.blocks.filter((block) => !block.revealAfterActionId || hasAction(block.revealAfterActionId));
  const visibleExplanationIds = new Set(visibleBlocks.flatMap((block) => block.explanationId ? [block.explanationId] : []));
  if ((!section.explanationRevealAfterActionId || hasAction(section.explanationRevealAfterActionId)) && section.explanationId) visibleExplanationIds.add(section.explanationId);
  const illustration = section.illustrationAssetId ? assetLoader.get(section.illustrationAssetId)?.src : undefined;
  const illustrationAvailable = Boolean(illustration) && failedIllustrationStage !== stage;
  const completedSectionIds = state.completedNarrativeSectionIds;
  const availableSections = act4NarrativeSections.filter((item) => completedSectionIds.includes(item.id) || item.stage === currentStage);
  const textBySection = new Map(act4NarrativeSections.map((item) => [item.id, item.title]));

  const renderInteractionAfter = (blockId: string): ReactNode => {
    if (reviewing) return null;
    if (stage === 'T02' && blockId === 'T02_ORIGINAL') {
      const bothMailboxesChecked = ['protagonist', 'xiaoyue'].every((recipient) => state.checkedMailRecipients.includes(recipient));
      const loginSucceeded = hasAction('A4_T02_LOGIN_SUCCEEDED');
      const hints = [
        '先对照两封旧邮件的发送时间。',
        '两封邮件指向同一天；“那一天”就是邮件上的日期。',
        '可以尝试输入：20200419。',
      ];
      return <section className="a4-reader__interaction" aria-label="核对旧邮件并登录" key="T02_LOGIN_INTERACTION">
        <h3>{loginSucceeded ? '两个账号已登录' : '登录两个账号'}</h3>
        {loginSucceeded
          ? <p role="status">登录成功。微博和邮箱记录现已展开；读完这段后继续进入王澳的微博。</p>
          : <>
            <p>分别核对邮件日期后，输入八位数字并主动登录。提示按需逐级查看。</p>
            <button type="button" disabled={passwordHintLevel >= hints.length} onClick={() => setPasswordHintLevel((level) => Math.min(hints.length, level + 1))}>
              {passwordHintLevel >= hints.length ? '已显示最后一级提示' : `查看下一级提示（${passwordHintLevel}/${hints.length}）`}
            </button>
            {passwordHintLevel > 0 && <p role="status" data-password-hint-level={passwordHintLevel}>{hints[passwordHintLevel - 1]}</p>}
          </>}
        <div className="a4-reader__mail-list">
          {act4OldMails.map((mail) => <article className="a4-reader__mail" key={mail.id}>
            <h4>{mail.label}收到</h4>
            <p><strong>发件人：</strong>{mail.from}</p>
            <p><strong>主题：</strong>{mail.subject}</p>
            <p><strong>时间：</strong><time>{mail.sentAt.slice(0, 10)} {mail.sentAt.slice(11, 16)}</time></p>
            <button type="button" disabled={state.checkedMailRecipients.includes(mail.id)} onClick={() => manager.checkAct4OldMail(mail.id)}>
              {state.checkedMailRecipients.includes(mail.id) ? '已核对日期' : '核对这封邮件'}
            </button>
          </article>)}
        </div>
        {!loginSucceeded && <>
          <label className="a4-reader__password-label" htmlFor="a4-shared-date">输入两封邮件共同的日期</label>
          <div className="a4-reader__login">
            <input id="a4-shared-date" inputMode="numeric" autoComplete="off" maxLength={8} disabled={!bothMailboxesChecked} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" disabled={!bothMailboxesChecked} onClick={() => {
              const ok = manager.loginAct4Accounts(password);
              setLoginMessage(ok ? '登录成功。现在可以继续阅读账号里的记录。' : '日期不匹配；请核对两封邮件上的年月日，再输入八位数字。');
            }}>主动登录</button>
          </div>
          <p role="status" aria-live="polite">{loginMessage}</p>
        </>}
      </section>;
    }
    if (stage === 'T04' && blockId === 'T04_CONTEXT' && !hasAction('A4_T04_WAKE_MAIL_OPENED')) {
      return <section className="a4-reader__interaction" aria-label="打开 VVaKe 邮件" key="T04_WAKE_MAIL_INTERACTION">
        <p>邮箱里有一封发件人为启明、主题为 VVaKe 的邮件。</p>
        <button type="button" onClick={() => manager.viewAct4WakeMail()}>打开 VVaKe 邮件</button>
      </section>;
    }
    if (stage === 'T08' && blockId === 'T08_RETURN' && !hasAction('A4_T08_ARCHIVE_OPENED')) {
      return <section className="a4-reader__interaction" aria-label="打开档案" key="T08_ARCHIVE_INTERACTION">
        <p>王澳走进档案馆，找到 2008 年的书架。</p>
        <button type="button" onClick={() => manager.openAct4Archive()}>从档案架抽出 2008 年档案</button>
      </section>;
    }
    if (stage === 'T09' && blockId === 'T09_REPLY_AND_LAST_PAGE' && !hasAction('A4_T09_NOTE_HIDDEN')) {
      return <section className="a4-reader__interaction" aria-label="藏好最后一页笔记" key="T09_HIDE_NOTE_INTERACTION">
        <p>最后一页写完了。王澳把笔记放进塑料袋，用透明胶缠好。</p>
        <button type="button" onClick={() => manager.hideAct4NarrativeNote()}>把笔记藏到消防箱后</button>
      </section>;
    }
    if (stage === 'T09' && blockId === 'T09_WALK_TO_DOOR' && !hasAction('A4_T09_DOOR_EXITED')) {
      return <section className="a4-reader__interaction" aria-label="走向门外" key="T09_EXIT_DOOR_INTERACTION">
        <p>藏好笔记后，王澳挣扎着站起来，朝门外走去。</p>
        <button type="button" onClick={() => manager.exitAct4NarrativeDoor()}>走到门外，听完广播</button>
      </section>;
    }
    if (stage === 'T10' && blockId === 'T10_AFTERMATH' && !hasAction('A4_T10_FINAL_MAIL_OPENED')) {
      return <section className="a4-reader__interaction" aria-label="打开最后一封邮件" key="T10_FINAL_MAIL_INTERACTION">
        <p>几个月后，收件箱里出现一封关于王澳同学相关事项的邮件。</p>
        <button type="button" onClick={() => manager.openAct4FinalMail()}>打开启明的最后一封邮件</button>
      </section>;
    }
    return null;
  };

  const handleZoomKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setZoomOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first && last && event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (first && last && !event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <InvestigationShell
    ariaLabel="第四幕原文阅读器"
    actLabel="第四幕 · 暗潮"
    locationLabel={section.title}
    contextLabel={`${section.periodLabel} · ${perspectiveLabel(section.perspective)}${reviewing ? ' · 只读回看' : ''}`}
    objective={stage === 'T10' ? '读完结尾与最后一封邮件，保留仍未确定的去向。' : '直接阅读这一段原文；故事动作会在对应段落后出现。'}
    helpText="原文摘录、叙事衔接与故事回顾分开标明。配图只作阅读辅助，目录回看不会改变当前进度。"
    actions={[continueAction]}
    onExit={onExit}
  >
    <main className="a4-reader" data-act4-stage={currentStage} data-reading-stage={stage} ref={readerRef} tabIndex={-1}>
      <article className="a4-reader__story" aria-label={`${section.title}原文`}>
        <header className="a4-reader__heading">
          <p className="a4-reader__eyebrow">{section.periodLabel}</p>
          <h2>{section.title}</h2>
          <p>{perspectiveLabel(section.perspective)}{reviewing ? ' · 只读回看' : ''}</p>
        </header>

        <details className="a4-reader__index">
          <summary>已读目录与前文（{completedSectionIds.length}/10）</summary>
          <nav aria-label="已读章节目录">
            {availableSections.map((item) => <button type="button" key={item.id} data-review-trigger={`index-${item.stage}`} aria-current={stage === item.stage ? 'page' : undefined} onClick={() => openReview(item.stage, `index-${item.stage}`)}>
              {item.stage === currentStage ? '当前：' : ''}{item.title}
            </button>)}
          </nav>
        </details>

        <div className="a4-reader__blocks">
          {visibleBlocks.map((block) => <div className="a4-reader__block-stack" key={block.id}>
            <section className={`a4-reader__block a4-reader__block--${block.kind}`} data-block-id={block.id} data-source-ref-id={block.sourceRefId} data-content-kind={block.kind}>
              <h3>{block.kind === 'novel-excerpt' ? '原文摘录' : '叙事衔接'}</h3>
              <div className="a4-reader__paragraphs">{block.paragraphs.map((paragraph, index) => <p key={`${block.id}-${index}`}>{paragraph}</p>)}</div>
            </section>
            {renderInteractionAfter(block.id)}
          </div>)}
        </div>

        {visibleExplanationIds.size > 0 && <div className="a4-reader__explanations" aria-label="故事回顾">
          {[...visibleExplanationIds].map((id) => {
            const explanation = act4NarrativeExplanations[id as keyof typeof act4NarrativeExplanations];
            if (!explanation) return null;
            return <aside className="a4-reader__explanation" data-explanation-id={id} key={id}>
              <h3>{explanation.heading}</h3>
              <p>{explanation.text}</p>
              {explanation.connections.map((connection) => <p className="a4-reader__connection" key={connection}>{connection}</p>)}
              {explanation.replaySectionIds.some((id) => completedSectionIds.includes(id)) && <nav className="a4-reader__previous" aria-label="回看前文">
                {explanation.replaySectionIds.filter((id) => completedSectionIds.includes(id)).map((id) => {
                  const prior = act4NarrativeSections.find((item) => item.id === id);
                  return prior && <button type="button" key={id} data-review-trigger={`replay-${stage}-${id}`} onClick={() => openReview(prior.stage, `replay-${stage}-${id}`)}>回看前文：{textBySection.get(id)}</button>;
                })}
              </nav>}
            </aside>;
          })}
        </div>}

        {!reviewing && finalCompleted && <section className="a4-reader__ending" aria-label="第四幕完结回顾">
          <h3>第四幕阅读完成</h3>
          <p>这段故事留下了已知的经历，也留下没有答案的部分。</p>
          <h4>时间线</h4>
          <ol>
            {act4NarrativeEnding.timeline.map((item) => <li key={item.when}><strong>{item.when}：</strong>{item.text}</li>)}
          </ol>
          <h4>人物与资料</h4>
          {act4NarrativeEnding.people.map((person) => <p key={person.name}><strong>{person.name}：</strong>{person.text}</p>)}
        </section>}
      </article>

      <aside className="a4-reader__art" aria-label="配图">
        {illustrationAvailable ? <>
          <img src={illustration} alt={section.illustrationAlt ?? ''} onError={() => setFailedIllustrationStage(stage)} />
          <button ref={zoomButtonRef} type="button" onClick={() => setZoomOpen(true)}>放大配图</button>
        </> : <div className="a4-reader__art-placeholder" aria-hidden="true">本段没有配图</div>}
        <p>配图仅作阅读辅助，叙事内容以标明的原文摘录为准。</p>
      </aside>
      {zoomOpen && illustrationAvailable && illustration && createPortal(<div ref={dialogRef} className="a4-reader__zoom" role="dialog" aria-modal="true" aria-label="放大配图" onKeyDown={handleZoomKeyDown}>
        <button type="button" onClick={() => setZoomOpen(false)}>关闭配图，回到正文</button>
        <img src={illustration} alt={section.illustrationAlt ?? ''} />
      </div>, document.body)}
    </main>
  </InvestigationShell>;
}

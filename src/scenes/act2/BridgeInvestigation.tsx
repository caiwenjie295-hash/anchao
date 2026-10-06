import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { EvidenceImage } from '../../components/EvidenceImage';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import type { AppState, HeibumuNamePart } from '../../core/types';
import { ACT2_BRIDGE_ELDER_TARGETS, bridgeRectToPercentStyle } from '../../data/act2BridgePresentation';
import {
  bridgeAudio,
  bridgeElders,
  bridgeEvidence,
  bridgeFlagIds,
  bridgeNoteIds,
  bridgePuzzle,
  bridgeResolution,
  bridgeScene,
} from '../../data/act2BridgeData';
import '../../act2/t02Bridge.css';

const namePartOrder: HeibumuNamePart[] = ['first', 'middle', 'last'];
const recognizedPhotoAssetId = 'IMG_A1_I_002';

function EvidenceSlot({ assetId, caption }: { assetId: string; caption: string }) {
  if (assetLoader.isAvailable(assetId)) return <EvidenceImage assetId={assetId} caption={caption} />;
  return <span className="act2-bridge__evidence-slot" data-asset-id={assetId} role="img" aria-label={caption}>{caption}</span>;
}

export function BridgeInvestigation({ manager: injectedManager, onReturnDesktop }: { manager?: StateManager; onReturnDesktop?: () => void } = {}) {
  const manager = injectedManager ?? defaultManager;
  const state: AppState = useSyncExternalStore(manager.subscribe, manager.getState);
  const bridge = state.modules.act2Research.bridge;
  const flags = state.game.flags;
  const isBridgeStage = state.modules.act2Research.stage === 'bridge';
  const heard = bridge.heardPhrase;
  const solved = flags.FLAG_A2_HEIBUMU_NAME_SOLVED === true;
  const oralProgress = heard || solved;

  const [selectedElderId, setSelectedElderId] = useState<string | null>(() => (
    bridge.heardPhrase || solved ? bridgeElders.find((elder) => elder.isClueElder)?.id ?? null : null
  ));
  const [askedMountainIds, setAskedMountainIds] = useState<string[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState('');
  const phraseRef = useRef<HTMLParagraphElement>(null);
  const responseWasAvailable = useRef(heard);

  const talkRecord = useRef(false);
  useEffect(() => {
    if (!heard || talkRecord.current) return;
    talkRecord.current = true;
    if (manager.getState().game.flags[bridgeFlagIds.evidenceShown] !== true) manager.setFlag(bridgeFlagIds.evidenceShown, true);
    if (manager.getState().game.flags[bridgeFlagIds.audioHeard] !== true) manager.setFlag(bridgeFlagIds.audioHeard, true);
    if (!manager.getState().modules.notepad.autoEntryIds.includes(bridgeNoteIds.phraseHeard)) manager.addNotepadAutoEntry(bridgeNoteIds.phraseHeard);
  }, [heard, manager]);

  useEffect(() => {
    if (heard && !responseWasAvailable.current) {
      const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      phraseRef.current?.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      phraseRef.current?.focus({ preventScroll: true });
    }
    responseWasAvailable.current = heard;
  }, [heard]);

  const solveRecord = useRef(false);
  useEffect(() => {
    if (!solved || solveRecord.current) return;
    solveRecord.current = true;
    if (manager.getState().game.flags[bridgeResolution.flagId] !== true) manager.setFlag(bridgeResolution.flagId, true);
    if (!manager.getState().modules.notepad.autoEntryIds.includes(bridgeResolution.noteId)) manager.addNotepadAutoEntry(bridgeResolution.noteId);
  }, [solved, manager]);

  if (!isBridgeStage) return null;

  const sceneImage = assetLoader.get('IMG_A2_T02_001')?.src;
  const selectedElder = bridgeElders.find((elder) => elder.id === selectedElderId) ?? null;
  const isClueElderSelected = selectedElder?.isClueElder === true;
  const locked = wrongAttempts >= bridgePuzzle.maxAttempts;
  // Reopened saves may already contain the oral phrase or solved name even
  // though the ask button itself is transient presentation state.
  const askedMountain = selectedElder
    ? askedMountainIds.includes(selectedElder.id) || (selectedElder.isClueElder && oralProgress)
    : false;

  const selectElder = (elderId: string) => {
    setSelectedElderId(elderId);
    manager.talkToAct2Elder(elderId);
  };

  const askMountain = () => {
    if (!selectedElder || askedMountainIds.includes(selectedElder.id)) return;
    setAskedMountainIds([...askedMountainIds, selectedElder.id]);
  };

  const choosePart = (part: HeibumuNamePart, value: string) => {
    if (locked && part === bridgePuzzle.lockPart) return;
    manager.setHeibumuNameChoice(part, value);
  };

  const canConfirm = namePartOrder.every((part) => bridge.nameChoices[part] !== null);

  const confirmName = () => {
    if (!canConfirm) return;
    manager.confirmHeibumuName();
    if (manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED === true) {
      setWrongAttempts(0);
      return;
    }
    const nextAttempts = wrongAttempts + 1;
    setWrongAttempts(nextAttempts);
    if (nextAttempts >= bridgePuzzle.maxAttempts) manager.setHeibumuNameChoice(bridgePuzzle.lockPart, bridgePuzzle.lockValue);
  };

  const continueToLibrary = () => {
    if (manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED !== true) return;
    manager.setAct2Stage(bridgeResolution.nextStage);
  };

  const actions: InvestigationAction[] = [{
    actionId: 'A2_T02_TO_LIBRARY', kind: 'move', target: 'county-library', label: bridgeResolution.continueLabel,
    state: solved ? 'ready' : heard ? 'blocked' : 'unavailable',
    reason: '先根据老人说出的称呼和出示的照片，辨认这处地名。',
    onActivate: continueToLibrary,
  }];


  return (
    <InvestigationShell
      ariaLabel="桥头调查"
      className="investigation-shell--exploration investigation-shell--act2-spacious"
      actLabel="第二幕 · 民俗疑问"
      locationLabel={bridgeScene.location}
      contextLabel={bridgeScene.title}
      objective="先听桥边闲谈，再问鸡公岭；带相关照片给老人看看。"
      helpText="四位老人都能交谈。照片里的虚线框可直接选择人物，也可以从下方名单开始。"
      actions={actions}
      onExit={() => onReturnDesktop?.()}
    >
    <section className="act2-bridge" aria-label={bridgeScene.title}>
      {!heard && <p className="act2-bridge__intro">{bridgeScene.intro}</p>}

      <div className="act2-bridge__scene-workspace">
        <div className="act2-bridge__stage" role="group" aria-label="桥头照片与人物入口">
          {sceneImage && !sceneFailed
            ? <img className="act2-bridge__scene-image" src={sceneImage} alt="桥头休息区，四位老人坐在石凳旁" data-asset-id="IMG_A2_T02_001" onError={() => setSceneFailed(true)} />
            : <div className="act2-bridge__scene-fallback" role="img" aria-label="桥头照片暂时无法显示，仍可从下方名单选择老人"><span aria-hidden="true">桥</span><p>桥头照片暂时无法显示；可以从下方名单选择老人继续交谈。</p></div>}
          {!sceneFailed && sceneImage && bridgeElders.map((elder) => {
            const target = ACT2_BRIDGE_ELDER_TARGETS.find((item) => item.elderId === elder.id);
            if (!target) return null;
            const talked = bridge.talkedElderIds.includes(elder.id);
            const active = selectedElderId === elder.id;
            return <button
              key={elder.id}
              type="button"
              className={`act2-bridge__elder${active ? ' act2-bridge__elder--active' : ''}`}
              style={{ ...bridgeRectToPercentStyle(target.rect), zIndex: elder.id.endsWith('_001') ? 3 : elder.id.endsWith('_002') ? 4 : elder.id.endsWith('_003') ? 5 : 2 }}
              aria-label={`${elder.name}，${talked ? '聊过了' : '还没聊'}`}
              aria-pressed={active}
              data-elder-id={elder.id}
              data-image-rect={`${target.rect.x},${target.rect.y},${target.rect.width},${target.rect.height}`}
              onClick={() => selectElder(elder.id)}
            ><span className="act2-bridge__elder-number" aria-hidden="true">{bridgeElders.indexOf(elder) + 1}</span></button>;
          })}
        </div>

        <nav className="act2-bridge__elder-list" aria-label="从文字名单选择老人">
          {bridgeElders.map((elder, index) => {
            const talked = bridge.talkedElderIds.includes(elder.id);
            const active = selectedElderId === elder.id;
            return <button key={elder.id} type="button" className={active ? 'is-active' : ''} aria-pressed={active} onClick={() => selectElder(elder.id)}>
              <span className="act2-bridge__elder-list-number" aria-hidden="true">{index + 1}</span>
              <span>{elder.name}</span><small>{talked ? '聊过了' : '开始闲谈'}</small>
            </button>;
          })}
        </nav>

        {!selectedElder && <section className="act2-bridge__dialogue act2-bridge__dialogue--empty" aria-label="桥边闲谈"><h2>桥边闲谈</h2><p>选一位老人坐下聊聊。问到鸡公岭时，再看看他是否愿意多说几句。</p></section>}
        {selectedElder && (
          <section className="act2-bridge__dialogue" aria-live="polite" aria-label={`${selectedElder.name}的谈话`}>
            <div className="act2-bridge__dialogue-heading"><p>桥边闲谈</p><h2>{selectedElder.name}</h2></div>
            <div className="act2-bridge__chat-lines">{selectedElder.chat.map((line) => <p key={line}>{line}</p>)}</div>
            {!askedMountain && <button type="button" className="act2-bridge__ask" onClick={askMountain}>{bridgeScene.askMountainLabel}</button>}
            {askedMountain && <div className="act2-bridge__reply" aria-label="关于鸡公岭的回答">{selectedElder.mountainReply.map((line) => <p key={line}>{line}</p>)}</div>}

            {isClueElderSelected && askedMountain && (
              <details className="act2-bridge__evidence" key={oralProgress ? 'response-found' : 'photo-selection'} open={!oralProgress}>
                <summary>{bridgeScene.evidencePanelTitle}</summary>
                <p>{bridgeScene.evidencePanelHint}</p>
                <ul>{bridgeEvidence.map((item) => (
                  <li key={item.assetId} className="act2-bridge__evidence-item">
                    <div className="act2-bridge__evidence-copy"><strong>{item.name}</strong><span>{item.description}</span></div>
                    <div className="act2-bridge__evidence-actions"><EvidenceSlot assetId={item.assetId} caption={item.name} /><button type="button" className="act2-bridge__show" aria-label={`出示${item.name}`} onClick={() => {
                      const responseWasAlreadyAvailable = manager.getState().modules.act2Research.bridge.heardPhrase || solved;
                      manager.showAct2Evidence(item.assetId);
                      setPhotoFeedback(item.assetId !== recognizedPhotoAssetId
                        ? '老人没有认出这张照片里的地点；可以换一张继续问。'
                        : responseWasAlreadyAvailable
                          ? '老人已经说过这处地名；可以再看看老人原话。'
                          : '老人接过石碑刻字照片，想起了那处地名。');
                    }}>出示照片</button></div>
                  </li>
                ))}</ul>
                {photoFeedback && <p className="act2-bridge__photo-feedback" role="status">{photoFeedback}</p>}
              </details>
            )}

            {isClueElderSelected && oralProgress && (
              <div className="act2-bridge__oral">
                <p className="act2-bridge__evidence-lead">{selectedElder.evidenceLead}</p>
                <p ref={phraseRef} tabIndex={-1} className="act2-bridge__phrase" aria-live="polite">“{bridgeAudio.phrase}”</p>
                <p className="act2-bridge__phrase-after" aria-live="polite">{selectedElder.phraseAfter}</p>
                <button type="button" className="act2-bridge__replay" onClick={() => { phraseRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); phraseRef.current?.focus({ preventScroll: true }); }}>再看看老人原话</button>
              </div>
            )}
          </section>
        )}
      </div>

      {heard && !solved && (
        <div
          className="act2-bridge__puzzle"
          aria-label={bridgePuzzle.question}
        >
          <p className="act2-bridge__puzzle-prompt">{bridgePuzzle.notebookPrompt}</p>
          <h2>{bridgePuzzle.question}</h2>
          {namePartOrder.map((part) => {
            const partData = bridgePuzzle.parts.find((item) => item.part === part)!;
            const partLocked = locked && part === bridgePuzzle.lockPart;
            return (
              <fieldset key={part} className="act2-bridge__part" disabled={partLocked}>
                <legend>{partData.label}</legend>
                {partData.options.map((option) => (
                  <label key={option} className="act2-bridge__option">
                    <input
                      type="radio"
                      name={`act2-bridge-${part}`}
                      value={option}
                      checked={bridge.nameChoices[part] === option || (partLocked && option === bridgePuzzle.lockValue)}
                      onChange={() => choosePart(part, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
                {partLocked && <p className="act2-bridge__part-locked">已按老人提示锁定</p>}
              </fieldset>
            );
          })}
          {locked && <p className="act2-bridge__locked-hint" role="note">{bridgePuzzle.lockedHint}</p>}
          {wrongAttempts > 0 && !solved && <p className="act2-bridge__wrong-hint" role="status">这组字还没有对上。可以再看看老人原话和石碑照片，再调整选字。</p>}
          <p className="act2-bridge__guessing-note">{bridgePuzzle.guessingNote}</p>
          <button type="button" className="act2-bridge__confirm" disabled={!canConfirm} onClick={confirmName}>{bridgePuzzle.confirmLabel}</button>
        </div>
      )}

      {solved && (
        <div className="act2-bridge__resolution" aria-live="polite">
          <h2 className="act2-bridge__entry-title">{bridgeResolution.entryTitle}</h2>
          <p className="act2-bridge__entry-body">{bridgeResolution.entryBody}</p>
          <p className="act2-bridge__entry-related">{bridgeResolution.entryRelated}</p>
          <p className="act2-bridge__elder-remark">{bridgeResolution.elderRemark}</p>
        </div>
      )}
    </section>
    </InvestigationShell>
  );
}

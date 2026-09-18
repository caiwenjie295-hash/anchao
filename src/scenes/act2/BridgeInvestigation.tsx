import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { EvidenceImage } from '../../components/EvidenceImage';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import type { AppState, HeibumuNamePart } from '../../core/types';
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

  const [selectedElderId, setSelectedElderId] = useState<string | null>(null);
  const [askedMountainIds, setAskedMountainIds] = useState<string[]>([]);
  const [replayCount, setReplayCount] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const talkRecord = useRef(false);
  useEffect(() => {
    if (!heard || talkRecord.current) return;
    talkRecord.current = true;
    if (manager.getState().game.flags[bridgeFlagIds.evidenceShown] !== true) manager.setFlag(bridgeFlagIds.evidenceShown, true);
    if (manager.getState().game.flags[bridgeFlagIds.audioHeard] !== true) manager.setFlag(bridgeFlagIds.audioHeard, true);
    if (!manager.getState().modules.notepad.autoEntryIds.includes(bridgeNoteIds.phraseHeard)) manager.addNotepadAutoEntry(bridgeNoteIds.phraseHeard);
  }, [heard, manager]);

  const solveRecord = useRef(false);
  useEffect(() => {
    if (!solved || solveRecord.current) return;
    solveRecord.current = true;
    if (manager.getState().game.flags[bridgeResolution.flagId] !== true) manager.setFlag(bridgeResolution.flagId, true);
    if (!manager.getState().modules.notepad.autoEntryIds.includes(bridgeResolution.noteId)) manager.addNotepadAutoEntry(bridgeResolution.noteId);
  }, [solved, manager]);

  if (!isBridgeStage) return null;

  const selectedElder = bridgeElders.find((elder) => elder.id === selectedElderId) ?? null;
  const isClueElderSelected = selectedElder?.isClueElder === true;
  const locked = wrongAttempts >= bridgePuzzle.maxAttempts;
  const askedMountain = selectedElder ? askedMountainIds.includes(selectedElder.id) : false;

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

  const confirmName = () => {
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

  return (
    <section className="act2-bridge" aria-label={bridgeScene.title}>
      <header className="act2-bridge__header">
        <div>
          <p className="act2-bridge__location">{bridgeScene.location}</p>
          <h1 className="act2-bridge__title">{bridgeScene.title}</h1>
        </div>
        {onReturnDesktop && <button type="button" className="act2-bridge__return" onClick={onReturnDesktop}>{bridgeScene.returnLabel}</button>}
      </header>

      {!heard && <p className="act2-bridge__intro">{bridgeScene.intro}</p>}

      <div className="act2-bridge__body">
        <div className="act2-bridge__elders" role="group" aria-label="桥头休息区的老人">
          {bridgeElders.map((elder) => (
            <button
              key={elder.id}
              type="button"
              className={`act2-bridge__elder${selectedElderId === elder.id ? ' act2-bridge__elder--active' : ''}`}
              aria-pressed={selectedElderId === elder.id}
              onClick={() => selectElder(elder.id)}
            >
              {elder.name}
              <span className="act2-bridge__elder-hint">{bridge.talkedElderIds.includes(elder.id) ? '聊过了' : bridgeScene.chatPrompt}</span>
            </button>
          ))}
        </div>

        {selectedElder && (
          <div className="act2-bridge__dialogue" aria-live="polite">
            <h2>{selectedElder.name}</h2>
            {selectedElder.chat.map((line) => <p key={line}>{line}</p>)}
            {!askedMountain && (
              <button type="button" className="act2-bridge__ask" onClick={askMountain}>{bridgeScene.askMountainLabel}</button>
            )}
            {askedMountain && selectedElder.mountainReply.map((line) => <p key={line}>{line}</p>)}

            {isClueElderSelected && (
              <div className="act2-bridge__evidence">
                <h3>{bridgeScene.evidencePanelTitle}</h3>
                {bridgeEvidence.map((item) => (
                  <button
                    key={item.assetId}
                    type="button"
                    className="act2-bridge__evidence-item"
                    aria-label={`出示${item.name}`}
                    onClick={() => manager.showAct2Evidence(item.assetId)}
                  >
                    <span className="act2-bridge__evidence-name">{item.name}</span>
                    <span className="act2-bridge__evidence-desc">{item.description}</span>
                    <EvidenceSlot assetId={item.assetId} caption={item.name} />
                  </button>
                ))}
              </div>
            )}

            {isClueElderSelected && heard && (
              <div className="act2-bridge__oral">
                <p className="act2-bridge__evidence-lead">{selectedElder.evidenceLead}</p>
                <p className="act2-bridge__phrase" aria-live="polite" data-audio-id={bridgeAudio.audioId}>
                  “{bridgeAudio.phrase}”
                  {replayCount > 0 && <span className="act2-bridge__replay-echo">{bridgeAudio.replaySuffixTemplate}</span>}
                </p>
                <p className="act2-bridge__phrase-after" aria-live="polite">{selectedElder.phraseAfter}</p>
                <p className="act2-bridge__audio-notice">{bridgeAudio.replayNotice}</p>
                <button type="button" className="act2-bridge__replay" data-audio-id={bridgeAudio.audioId} onClick={() => setReplayCount((count) => count + 1)}>
                  {bridgeAudio.replayLabel}
                </button>
              </div>
            )}
          </div>
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
          <p className="act2-bridge__guessing-note">{bridgePuzzle.guessingNote}</p>
          <button type="button" className="act2-bridge__confirm" onClick={confirmName}>{bridgePuzzle.confirmLabel}</button>
        </div>
      )}

      {solved && (
        <div className="act2-bridge__resolution" aria-live="polite">
          <h2 className="act2-bridge__entry-title">{bridgeResolution.entryTitle}</h2>
          <p className="act2-bridge__entry-body">{bridgeResolution.entryBody}</p>
          <p className="act2-bridge__entry-related">{bridgeResolution.entryRelated}</p>
          <p className="act2-bridge__elder-remark">{bridgeResolution.elderRemark}</p>
          {state.modules.act2Research.stage === 'bridge' && (
            <button type="button" className="act2-bridge__continue" onClick={continueToLibrary}>{bridgeResolution.continueLabel}</button>
          )}
        </div>
      )}
    </section>
  );
}

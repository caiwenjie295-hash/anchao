import { act4NarrativeExplanations, act4NarrativeSections } from '../../../data/narrative/act4Narrative';
import type { ActiveAct4NarrativeStage } from '../../../story/act4/narrativePolicy';

export function Act4ReaderReviewPanels({
  ids,
  stage,
  recapSentenceLimit,
  completedSectionIds,
  textBySection,
  onReview,
}: {
  ids: Iterable<string>;
  stage: ActiveAct4NarrativeStage;
  recapSentenceLimit?: number;
  completedSectionIds: readonly string[];
  textBySection: ReadonlyMap<string, string>;
  onReview: (stage: ActiveAct4NarrativeStage, triggerKey: string) => void;
}) {
  return <>{[...ids].map((id) => {
    const explanation = act4NarrativeExplanations[id as keyof typeof act4NarrativeExplanations];
    if (!explanation) return null;
    const t05Recap = stage === 'T05' && id === 'A4_EXPLAIN_T05';
    if (t05Recap && !recapSentenceLimit) return null;
    const explanationSentences = explanation.text.match(/[^；。]+[；。]?/gu) ?? [explanation.text];
    const visibleRecapClauses = recapSentenceLimit ?? 0;
    const explanationText = t05Recap
      ? explanationSentences.slice(0, visibleRecapClauses).join('')
      : explanation.text;
    const explanationHeading = t05Recap && visibleRecapClauses < explanationSentences.length
      ? '当前阅读页回顾'
      : explanation.heading;
    return <details className="a4-reader__explanation" data-explanation-id={id} key={id}>
      <summary>{explanationHeading}</summary>
      <div className="a4-reader__explanation-content">
        <p>{explanationText}</p>
        {explanation.connections.map((connection) => <p className="a4-reader__connection" key={connection}>{connection}</p>)}
        {explanation.replaySectionIds.some((replayId) => completedSectionIds.includes(replayId)) && <nav className="a4-reader__previous" aria-label="回看前文">
          {explanation.replaySectionIds.filter((replayId) => completedSectionIds.includes(replayId)).map((replayId) => {
            const prior = act4NarrativeSections.find((item) => item.id === replayId);
            const triggerKey = `replay-${stage}-${replayId}`;
            return prior && <button type="button" key={replayId} data-review-trigger={triggerKey} onClick={() => onReview(prior.stage, triggerKey)}>回看前文：{textBySection.get(replayId)}</button>;
          })}
        </nav>}
      </div>
    </details>;
  })}</>;
}

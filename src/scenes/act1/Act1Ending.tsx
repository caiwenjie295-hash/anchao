import ending from '../../../data/act1_ending.json';
import { stateManager } from '../../core/stateManager';
import { ResetProgressButton } from '../../components/ResetProgressButton';
import { useInvestigationProgress } from '../../components/InvestigationProgressContext';
import { useCurtainExit } from '../../components/scenePolish/useCurtainExit';

export function Act1Ending({ onContinue = () => stateManager.startSecondAct(), onReset = () => stateManager.resetProgress() }: { onContinue?: () => void; onReset?: () => void } = {}) {
  const progressContext = useInvestigationProgress();
  const { closing, beginExit } = useCurtainExit(onContinue);
  return <section className={`act1-ending scene-polish-curtain${closing ? ' act1-ending--closing scene-polish-curtain--closing' : ''}`} aria-label="第一幕结束">
    <div><p className="act1-ending__label">{ending.title}</p>
      {ending.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <h1>{ending.footer}</h1>
      <div className="act1-ending__actions">
        <button type="button" className="act1-ending__continue" disabled={closing} onClick={() => beginExit()}>回到桌面，继续调查</button>
        {progressContext && <button type="button" className="investigation-progress-trigger act1-ending__progress-trigger" aria-label="打开调查进度" onClick={(event) => progressContext.openProgress(event.currentTarget)}>调查进度</button>}
        <ResetProgressButton onReset={() => beginExit(onReset)} />
      </div>
    </div>
  </section>;
}

import ending from '../../../data/act1_ending.json';
import { stateManager } from '../../core/stateManager';
import { ResetProgressButton } from '../../components/ResetProgressButton';

export function Act1Ending() {
  return <section className="act1-ending" aria-label="第一幕结束">
    <div><p className="act1-ending__label">{ending.title}</p>
      {ending.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <h1>{ending.footer}</h1>
      <div className="act1-ending__actions">
        <button type="button" className="act1-ending__continue" onClick={() => stateManager.startSecondAct()}>回到桌面，继续调查</button>
        <ResetProgressButton onReset={() => stateManager.resetProgress()} />
      </div>
    </div>
  </section>;
}

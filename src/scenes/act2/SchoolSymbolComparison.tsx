import { useEffect, useRef, useState } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';
import type { StateManager } from '../../core/stateManager';
import { act2School } from '../../data/act2SchoolData';

export function SchoolSymbolComparison({ manager, onClose }: { manager: StateManager; onClose: () => void }) {
  const [view, setView] = useState<'side' | 'overlay'>('side');
  const [opacity, setOpacity] = useState(50);
  const [caveZoom, setCaveZoom] = useState(1);
  const [schoolZoom, setSchoolZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const cavePhoto = assetLoader.get('IMG_A1_H_003')?.src;
  const notebookPhoto = assetLoader.get('IMG_A2_SCHOOL_NOTE_001')?.src;
  const canConfirm = manager.getState().game.flags.FLAG_A1_SS_FOUND === true && manager.getState().game.flags.FLAG_A2_SCHOOL_SS_FOUND === true;
  useEffect(() => { closeRef.current?.focus(); }, []);
  return <section className="t05-comparison" role="dialog" aria-modal="true" aria-labelledby="t05-comparison-title">
    <header><div><p>图案比对</p><h2 id="t05-comparison-title">学霸笔记与山洞照片</h2></div><button ref={closeRef} type="button" onClick={onClose}>返回笔记</button></header>
    <div className="t05-comparison__toolbar" role="group" aria-label="图案排列方式">
      <button type="button" aria-pressed={view === 'side'} onClick={() => setView('side')}>并排</button>
      <button type="button" aria-pressed={view === 'overlay'} onClick={() => setView('overlay')}>半透明重合</button>
      <label>山洞图案大小 <input aria-label="山洞图案缩放" type="range" min="0.7" max="2.5" step="0.1" value={caveZoom} onChange={(event) => setCaveZoom(Number(event.target.value))} /><output>{Math.round(caveZoom * 100)}%</output></label>
      <label>笔记图案大小 <input aria-label="笔记图案缩放" type="range" min="0.7" max="2.5" step="0.1" value={schoolZoom} onChange={(event) => setSchoolZoom(Number(event.target.value))} /><output>{Math.round(schoolZoom * 100)}%</output></label>
    </div>
    {view === 'side' ? <div className="t05-comparison__side">
      <figure className="t05-comparison__cave" data-asset-id="IMG_A1_H_003">{cavePhoto && <img src={cavePhoto} alt="第一幕山洞留言墙照片" />}<DoubleSSymbol className="t05-comparison__symbol" label="山洞照片中的双 S 符号" style={{ transform: `scale(${caveZoom})` }} /><figcaption>鸡公岭 · 山洞照片</figcaption></figure>
      <figure className="t05-comparison__paper" data-asset-id="IMG_A2_SCHOOL_NOTE_001">{notebookPhoto ? <img src={notebookPhoto} alt="学霸笔记原页" /> : <div className="t05-comparison__paper-text">{act2School.notebookPage.heading}<br />────────────────{act2School.notebookPage.lines.map((line) => <span key={line}><br />{line}</span>)}</div>}<DoubleSSymbol className="t05-comparison__symbol" label="学霸笔记页边的双 S 符号" style={{ transform: `scale(${schoolZoom})` }} /><figcaption>小A · 学习笔记</figcaption></figure>
    </div> : <div className="t05-comparison__overlap" aria-label="双 S 半透明重合视图">
      {cavePhoto && <img className="t05-comparison__overlap-photo" src={cavePhoto} alt="山洞留言墙照片" />}
      <DoubleSSymbol className="t05-comparison__overlap-symbol t05-comparison__overlap-symbol--cave" label="山洞双 S 底图" style={{ transform: `translate(-50%, -50%) scale(${caveZoom})` }} />
      <DoubleSSymbol className="t05-comparison__overlap-symbol t05-comparison__overlap-symbol--school" label="笔记双 S 半透明叠图" style={{ opacity: opacity / 100, transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${schoolZoom})` }} />
      <p>拖动对齐控制，调整上层透明度</p>
    </div>}
    {view === 'overlay' && <div className="t05-comparison__align">
      <label>笔记符号透明度 <input aria-label="重合图案透明度" type="range" min="15" max="85" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /><output>{opacity}%</output></label>
      <label>左右对齐 <input aria-label="左右对齐" type="range" min="-40" max="40" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} /><output>{offsetX}</output></label>
      <label>上下对齐 <input aria-label="上下对齐" type="range" min="-40" max="40" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} /><output>{offsetY}</output></label>
    </div>}
    <footer>{view === 'overlay' && canConfirm ? <button type="button" onClick={() => { manager.confirmAct2SchoolSymbolMatch(); onClose(); }}>确认图案一致</button> : <p>{canConfirm ? '切换到半透明重合视图并对齐后，可以记录这次比对。' : '两处图案都确认后，才能进行比对。'}</p>}</footer>
  </section>;
}

import { useState } from 'react';

export function ResetProgressButton({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return <div className="debug-reset">
    <button type="button" className="debug-reset__trigger" onClick={() => setConfirming(!confirming)} aria-expanded={confirming}>↺<span>清零进度</span></button>
    {confirming && <div className="debug-reset__confirm" role="dialog" aria-label="确认清零游戏进度">
      <strong>从第一幕开头重新开始？</strong>
      <p>清除全部剧情进度、阅读与搜索记录、照片及编辑参数、笔记和窗口状态。</p>
      <div><button type="button" autoFocus onClick={() => setConfirming(false)}>取消</button><button type="button" className="debug-reset__danger" onClick={() => { setConfirming(false); onReset(); }}>确认清零</button></div>
    </div>}
  </div>;
}

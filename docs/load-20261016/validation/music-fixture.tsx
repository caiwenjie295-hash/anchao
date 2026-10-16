import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../../src/App';

// Dev-only UI for exercising the native loop boundary without a two-minute wait.
// This file is never a build entry and is never included in an upload package.
function Fixture() {
  const [mounted, setMounted] = useState(true);
  const [result, setResult] = useState('仅隔离测试端口；不连接玩家页面。');
  const [media, setMedia] = useState('尚无音频元素');
  useEffect(() => {
    const timer = window.setInterval(() => {
      const audio = document.querySelector<HTMLAudioElement>('[data-background-music]');
      setMedia(audio ? JSON.stringify({ count: document.querySelectorAll('[data-background-music]').length, duration: String(audio.duration), time: audio.currentTime, volume: audio.volume, loop: audio.loop, paused: audio.paused, readyState: audio.readyState, error: audio.error?.code ?? null }) : '尚无音频元素');
    }, 250);
    return () => window.clearInterval(timer);
  }, []);
  return <>
    {mounted && <App />}
    <aside aria-label="音乐验收夹具" style={{ position: 'fixed', zIndex: 50000, top: 8, left: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', maxWidth: 'calc(100vw - 16px)', padding: 6, background: '#eee', color: '#222', font: '12px sans-serif' }}>
      <button type="button" onClick={() => {
        const audio = document.querySelector<HTMLAudioElement>('[data-background-music]');
        if (!audio || !Number.isFinite(audio.duration)) { setResult('音频尚未就绪'); return; }
        audio.currentTime = Math.max(0, audio.duration - 0.6);
        setResult('已移至循环尾部，等待原生循环。');
      }}>测试循环尾部</button>
      <button type="button" onClick={() => { setMounted((value) => !value); setResult('已切换 App 挂载状态。'); }}>{mounted ? '卸载 App' : '重新挂载 App'}</button>
      <output>{result}</output>
      <output data-qa-media>{media}</output>
    </aside>
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { Taskbar } from './Taskbar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Taskbar chapter navigation placement', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); });

  it('places the chapter entry immediately after system time in the right-side system area', async () => {
    const desktop = createDefaultState().desktop;
    await act(async () => { root.render(<Taskbar desktop={desktop} onAppClick={() => {}} time={new Date('2026-10-14T06:30:00Z')} chapterNavigation={<button type="button" className="chapter-navigation--taskbar">章节选择</button>} />); });

    const system = host.querySelector('.taskbar__system');
    const chapter = host.querySelector('.chapter-navigation--taskbar');
    expect(system).not.toBeNull();
    expect(chapter).not.toBeNull();
    expect(chapter?.parentElement).toBe(host.querySelector('.taskbar__system-area'));
    expect(system!.compareDocumentPosition(chapter!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chapter?.textContent).toBe('章节选择');
  });
});

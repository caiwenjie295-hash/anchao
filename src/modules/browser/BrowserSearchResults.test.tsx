import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserSearchResults } from './BrowserSearchResults';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BrowserSearchResults search guidance', () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); });

  it('keeps a direct correction visible on a no-results page and routes its button to the caller search path', async () => {
    const onSearch = vi.fn();
    await act(async () => { root.render(<BrowserSearchResults
      query="错字路线"
      stage="search"
      onOpen={() => undefined}
      searchGuidance={[{ query: '鸡公岭 补', prompt: '直接搜索“鸡公岭 补”。' }]}
      onSearch={onSearch}
    />); });
    expect(host.querySelector('.browser-empty')?.textContent).toContain('上方已列出本阶段可用的搜索词');
    expect(host.textContent).toContain('接下来在浏览器搜：');
    expect(host.querySelector('.browser-search-guidance')?.textContent).toContain('鸡公岭 补');
    await act(async () => { host.querySelector<HTMLButtonElement>('[data-search-query="鸡公岭 补"]')!.click(); });
    expect(onSearch).toHaveBeenCalledWith('鸡公岭 补');
  });
});

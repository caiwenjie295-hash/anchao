import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { assetLoader } from '../../../src/core/assetLoader';
import manifest from '../../work_orders/工单/AS-OPS-20261015-assets.json';

const rows = manifest.candidates as { id: string; parentId?: string }[];
const pageSize = 6;
// QA-only: assetLoader has no StateManager dependency, so player storage is never read.
function Gallery() {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(rows.length / pageSize);
  return <><header><strong>小 A 运营时间线</strong><label>资源页 <select aria-label="资源页" value={page} onChange={event => setPage(Number(event.target.value))}>{Array.from({length: pages}, (_, index) => <option key={index} value={index}>{index + 1}/{pages}</option>)}</select></label><span>{rows.length} 个机构候选 · 不访问存档</span></header><main key={page}>{rows.slice(page * pageSize, (page + 1) * pageSize).map(row => {
    const current = assetLoader.get(row.id)?.src;
    const parent = row.parentId ? assetLoader.get(row.parentId)?.src : undefined;
    return <article key={row.id} data-job-id={row.id}><h2>{row.id}</h2><div className={parent ? 'pair' : undefined}>{parent && <figure><img src={parent} alt={`母图：${row.parentId}`} /><figcaption>母图：{row.parentId}</figcaption></figure>}<figure data-asset-id={row.id}>{current ? <img src={current} alt={row.id} /> : <div className="missing">缺图</div>}<figcaption>{row.parentId ? '独立近景' : '实际发布图'}</figcaption></figure></div></article>;
  })}</main></>;
}
createRoot(document.getElementById('root')!).render(<Gallery />);

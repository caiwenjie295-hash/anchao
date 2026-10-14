import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { assetLoader } from '../../../src/core/assetLoader';
import document from '../../work_orders/工单/UX-INV-20261014-asset-jobs.json';

type Job = { id: string; title: string; sourceAssetId?: string; dependsOn?: string; references: {assetId:string}[] };
const jobs = (document as {jobs:Job[]}).jobs;
const pageSize = 8;

// QA-only asset viewer. It imports no StateManager or persistence module and
// is excluded from the production entry point and offline player package.
function Gallery() {
  const [page,setPage] = useState(0);
  const pages = Math.ceil(jobs.length/pageSize);
  return <>
    <header><strong>最终统一素材验收</strong><label>资源页 <select aria-label="资源页" value={page} onChange={e=>setPage(Number(e.target.value))}>{Array.from({length:pages},(_,i)=><option key={i} value={i}>{i+1} / {pages} · {i*pageSize+1}–{Math.min((i+1)*pageSize,jobs.length)}</option>)}</select></label><span>{jobs.length} 个新增素材 · 不访问存档</span></header>
    <main key={page}>{jobs.slice(page*pageSize,(page+1)*pageSize).map(job=>{
      const referenceId=job.dependsOn??job.sourceAssetId??job.references[0]?.assetId;
      const reference=referenceId?assetLoader.get(referenceId)?.src:undefined;
      const source=assetLoader.get(job.id)?.src;
      return <article key={job.id} className="asset-qa-card" data-job-id={job.id}>
        <h2>{job.id}</h2><p>{job.title}</p>
        <div className="asset-qa-pair"><figure className="asset-qa-reference">{reference?<img src={reference} alt={`参考：${referenceId}`}/>:<div className="asset-qa-missing">无参考或未载入</div>}<figcaption>参考：{referenceId??'文字约束'}</figcaption></figure><figure className="asset-qa-new" data-asset-id={job.id}>{source?<img src={source} alt={job.title}/>:<div className="asset-qa-missing">资源未接入</div>}<figcaption>本次新增：{job.id}</figcaption></figure></div>
      </article>;
    })}</main>
  </>;
}
createRoot(window.document.getElementById('root')!).render(<Gallery/>);

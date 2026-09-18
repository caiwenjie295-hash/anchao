import type { AppDefinition } from '../data/apps';
import { WechatApp } from '../modules/wechat/WechatApp';
import { MailApp } from '../modules/mail/MailApp';
import { BrowserApp } from '../modules/browser/BrowserApp';
import { NotepadApp } from '../modules/notepad/NotepadApp';
import { ExplorerApp } from '../modules/explorer/ExplorerApp';
import { PhotosApp } from '../modules/photos/PhotosApp';

export function AppShell({ app }: { app: AppDefinition }) {
  if (app.appId === 'wechat') return <WechatApp />;
  if (app.appId === 'mail') return <MailApp />;
  if (app.appId === 'browser') return <BrowserApp />;
  if (app.appId === 'notepad') return <NotepadApp />;
  if (app.appId === 'explorer') return <ExplorerApp />;
  if (app.appId === 'photos') return <PhotosApp />;
  return (
    <section className="app-shell" aria-label={`${app.title} M0 应用壳层`}>
      <div className="app-shell__heading">
        <span className="app-shell__mark" data-asset-id={app.assetId} aria-hidden="true">{app.glyph}</span>
        <div>
          <h2>{app.title}</h2>
          <p>第一幕 · 阶段 {app.phase}</p>
        </div>
      </div>
      <div className="app-shell__placeholder" data-asset-id={app.assetId}>
        <span>内容区域待后续数据模块接入</span>
        <small>{app.id} · {app.notes}</small>
      </div>
    </section>
  );
}

import { useMemo, useState, useSyncExternalStore } from 'react';
import { VisualAvatar } from '../../components/VisualAvatar';
import { VisualIcon } from '../../components/VisualIcon';
import { stateManager, type StateManager } from '../../core/stateManager';
import {
  attachmentById,
  getFolderCount,
  getMailGroups,
  isMailRead,
  isMailStarred,
  mailById,
  mailFolders,
  type Mail,
  type MailFolderKey,
} from '../../data/mailData';
import { mailAvatarForSender } from '../../data/visualIdentityData';
import './mailIdentity.css';

const rowDateLabel = (timestamp: string): string => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(timestamp));

const fullDateLabel = (timestamp: string): string => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(timestamp));

function StarButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`mail-star${active ? ' mail-star--active' : ''}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      <VisualIcon name={active ? 'star-filled' : 'star'} size={16} />
    </button>
  );
}

function MailRow({ mail, selected, read, starred, onOpen, onToggleStar }: {
  mail: Mail;
  selected: boolean;
  read: boolean;
  starred: boolean;
  onOpen: () => void;
  onToggleStar: () => void;
}) {
  return <div className={`mail-row${selected ? ' mail-row--selected' : ''}${read ? ' mail-row--read' : ' mail-row--unread'}`}>
    <button type="button" className="mail-row__open" onClick={onOpen} aria-current={selected ? 'page' : undefined} aria-label={`${read ? '已读' : '未读'}，${mail.fromName}，${mail.subject}`}>
      <span className="mail-row__indicator" aria-hidden="true" />
      <span className="sr-only">{read ? '已读' : '未读'}</span>
      <span className="mail-row__from">{mail.fromName}</span>
      <span className="mail-row__summary"><strong>{mail.subject}</strong><span>{mail.preview}</span></span>
      <time dateTime={mail.sentAt}>{rowDateLabel(mail.sentAt)}</time>
    </button>
    <span className="mail-row__actions"><StarButton active={starred} onClick={onToggleStar} label={starred ? `取消星标：${mail.subject}` : `星标：${mail.subject}`} /></span>
  </div>;
}

function MailDetail({ mail, starred, onBack, onToggleStar }: { mail: Mail; starred: boolean; onBack: () => void; onToggleStar: () => void }) {
  return (
    <article className="mail-detail" aria-label={`邮件详情：${mail.subject}`}>
      <header className="mail-detail__header">
        <button type="button" className="mail-detail__back" onClick={onBack} aria-label="返回邮件列表">← <span>返回列表</span></button>
        <StarButton active={starred} onClick={onToggleStar} label={starred ? '取消星标当前邮件' : '星标当前邮件'} />
      </header>
      <div className="mail-detail__subject-row"><h2>{mail.subject}</h2></div>
      <div className="mail-detail__sender">
        <VisualAvatar className="mail-avatar" {...mailAvatarForSender(mail.fromName)} />
        <div><strong>{mail.fromName}</strong><span>&lt;{mail.fromAddress}&gt;</span><small>收件人：{mail.toAddresses.join('，')}</small></div>
        <time dateTime={mail.sentAt}>{fullDateLabel(mail.sentAt)}</time>
      </div>
      <div className="mail-detail__body">{mail.body}</div>
      {mail.attachmentIds.length > 0 && (
        <section className="mail-attachments" aria-label="附件">
          <h3>附件</h3>
          <div>{mail.attachmentIds.map((attachmentId) => {
            const attachment = attachmentById.get(attachmentId);
            if (!attachment) return null;
            const kind = attachment.mimeType === 'application/pdf' ? 'PDF 文件'
              : attachment.mimeType === 'application/zip' ? '压缩文件'
                : attachment.mimeType === 'text/calendar' ? '日历文件' : '文件';
            return <div className="mail-attachment" key={attachment.id}><b aria-hidden="true"><VisualIcon name="attachment" size={20} /></b><span>{attachment.title}</span><small>{kind} · 邮件附件</small></div>;
          })}</div>
        </section>
      )}
    </article>
  );
}

export function MailApp({ manager = stateManager }: { manager?: StateManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const [folderKey, setFolderKey] = useState<MailFolderKey>('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [foldersOpen, setFoldersOpen] = useState(false);
  const groups = useMemo(() => getMailGroups(folderKey, state.modules.mail, searchTerm), [folderKey, searchTerm, state.modules.mail]);
  const selectedMail = selectedMailId ? mailById.get(selectedMailId) : undefined;

  const openMail = (mailId: string) => {
    setSelectedMailId(mailId);
    manager.markMailRead(mailId);
    setNotice('');
  };
  const chooseFolder = (nextFolderKey: MailFolderKey) => {
    setFolderKey(nextFolderKey);
    setSelectedMailId(null);
    setFoldersOpen(false);
    setNotice('');
  };
  const toggleStar = (mailId: string) => manager.toggleMailStarred(mailId);
  const refresh = () => {
    setNotice('收件箱已刷新');
    window.setTimeout(() => setNotice(''), 1800);
  };

  return (
    <section className={`mail-app${selectedMail ? ' mail-app--has-selection' : ''}`} aria-label="私人邮箱">
      <header className="mail-toolbar">
        <button type="button" className="mail-folders-toggle" onClick={() => setFoldersOpen((open) => !open)} aria-label="显示邮件文件夹" aria-expanded={foldersOpen} aria-controls="mail-folders"><VisualIcon name="menu" size={16} /> <span>文件夹</span></button>
        <label className="mail-search"><span className="sr-only">搜索邮件</span><span aria-hidden="true"><VisualIcon name="search" size={16} /></span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索邮件" /></label>
        <div className="mail-toolbar__actions">
          <button type="button" onClick={refresh} aria-label="刷新邮件列表" title="刷新"><VisualIcon name="refresh" size={16} /></button>
          <button type="button" onClick={() => selectedMail && manager.markMailRead(selectedMail.id)} disabled={!selectedMail} aria-label="标记当前邮件为已读" title="标记为已读"><VisualIcon name="check" size={16} /></button>
          <button type="button" onClick={() => selectedMail && toggleStar(selectedMail.id)} disabled={!selectedMail} aria-label="切换当前邮件星标" title="切换星标"><VisualIcon name="star" size={16} /></button>
        </div>
      </header>
      <nav id="mail-folders" className={`mail-folders${foldersOpen ? ' mail-folders--open' : ''}`} aria-label="邮件文件夹">
        <div className="mail-folders__account"><VisualAvatar className="mail-account-avatar" {...mailAvatarForSender('林予')} /><span><strong>林予</strong><small>lin.yu@example.test</small></span></div>
        {mailFolders.map((folder) => <button type="button" key={folder.id} className={folderKey === folder.folderKey ? 'mail-folder--active' : ''} onClick={() => chooseFolder(folder.folderKey)} aria-current={folderKey === folder.folderKey ? 'page' : undefined}><span>{folder.label}</span><small>{getFolderCount(folder.folderKey, state.modules.mail)}</small></button>)}
      </nav>
      <section className="mail-list" aria-label="邮件列表">
        <header className="mail-list__header"><h2>{mailFolders.find((folder) => folder.folderKey === folderKey)?.label}</h2><span>{groups.reduce((total, group) => total + group.mails.length, 0)} 封</span></header>
        {notice && <p className="mail-status" role="status">{notice}</p>}
        <div className="mail-list__scroll">
          {groups.length > 0 ? groups.map((group) => <section className="mail-group" key={group.id}><h3>{group.label}</h3>{group.mails.map((mail) => <MailRow key={mail.id} mail={mail} selected={selectedMailId === mail.id} read={isMailRead(mail, state.modules.mail)} starred={isMailStarred(mail, state.modules.mail)} onOpen={() => openMail(mail.id)} onToggleStar={() => toggleStar(mail.id)} />)}</section>) : <p className="mail-empty">没有找到匹配的邮件</p>}
        </div>
      </section>
      <section className="mail-reading-pane" aria-label="阅读面板">
        {selectedMail ? <MailDetail mail={selectedMail} starred={isMailStarred(selectedMail, state.modules.mail)} onBack={() => setSelectedMailId(null)} onToggleStar={() => toggleStar(selectedMail.id)} /> : <div className="mail-empty mail-empty--reading"><span aria-hidden="true"><VisualIcon name="mail" size={30} /></span><p>选择一封邮件开始阅读</p></div>}
      </section>
    </section>
  );
}

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { EvidenceImage } from '../../components/EvidenceImage';
import { SpriteIcon } from '../../components/SpriteIcon';
import { eventBus, type EventBus } from '../../core/eventBus';
import { stateManager, type StateManager } from '../../core/stateManager';
import {
  MOM_CONTACT_ID,
  MOM_TRIGGERED_FLAG,
  SELF_CONTACT_ID,
  contactById,
  getConversationMessages,
  getLatestMessage,
  getUnreadCount,
  visibleContacts,
  type WechatMessage,
} from '../../data/wechatData';
import { AvatarSprite } from '../../components/SpriteIcon';
import '../../sprites.css';

const messageKindLabel = (message: WechatMessage): string => {
  if (message.kind === 'image') return '[图片]';
  if (message.kind === 'file') return '[文件]';
  if (message.kind === 'voice') return '[语音]';
  if (message.kind === 'system') return '[系统消息]';
  return message.content;
};

const timeLabel = (timestamp: string): string => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(timestamp));

function Avatar({ contactId, compact = false }: { contactId: string; compact?: boolean }) {
  const contact = contactById.get(contactId);
  if (!contact) return null;
  return <span className={`wechat-avatar${compact ? ' wechat-avatar--compact' : ''}`} data-asset-id={contact.avatarAssetId} aria-hidden="true"><AvatarSprite assetId={contact.avatarAssetId} /></span>;
}

function MessageBubble({ message }: { message: WechatMessage }) {
  const isSelf = message.senderId === SELF_CONTACT_ID;
  const className = `wechat-message wechat-message--${isSelf ? 'self' : 'contact'} wechat-message--${message.kind}`;
  const content = message.kind === 'voice' ? `${message.content} · ${message.durationSeconds}″` : message.content;
  const hasImage = message.kind === 'image' && message.assetId !== null && assetLoader.isAvailable(message.assetId);
  return (
    <div className={className}>
      {!isSelf && <Avatar contactId={message.senderId} compact />}
      <div className="wechat-message__body" data-asset-id={message.assetId ?? undefined}>
        {hasImage && <EvidenceImage assetId={message.assetId!} caption={message.content} />}
        {message.kind === 'image' && !hasImage && <span className="wechat-message__asset-icon" aria-hidden="true"><SpriteIcon name="file-image" /></span>}
        {message.kind === 'file' && <span className="wechat-message__asset-icon" aria-hidden="true"><SpriteIcon name="file-document" /></span>}
        {message.kind === 'voice' && <span className="wechat-message__asset-icon" aria-hidden="true">◖</span>}
        <span>{content}</span>
      </div>
    </div>
  );
}

export function WechatApp({ manager = stateManager, bus = eventBus }: { manager?: StateManager; bus?: EventBus }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const selectedContact = selectedContactId ? contactById.get(selectedContactId) : undefined;
  const messages = selectedContactId ? getConversationMessages(selectedContactId, state.game) : [];
  const motherMessageTriggered = state.game.flags[MOM_TRIGGERED_FLAG] === true;

  useEffect(() => {
    if (selectedContactId === MOM_CONTACT_ID && motherMessageTriggered) bus.emit('chat:opened', { contactId: MOM_CONTACT_ID });
  }, [bus, motherMessageTriggered, selectedContactId]);

  useLayoutEffect(() => {
    const messageArea = messagesRef.current;
    if (messageArea && selectedContactId) messageArea.scrollTop = messageArea.scrollHeight;
  }, [selectedContactId, messages.length, messages.at(-1)?.id]);

  const openConversation = (contactId: string) => {
    setSelectedContactId(contactId);
    bus.emit('chat:opened', { contactId });
  };

  return (
    <section className="wechat-app" aria-label="微信">
      <nav className="wechat-list" aria-label="会话列表">
        <div className="wechat-list__header"><h2>微信</h2><span aria-hidden="true">＋</span></div>
        <div className="wechat-list__items">
          {visibleContacts.map((contact) => {
            const latest = getLatestMessage(contact.id, state.game);
            const unreadCount = getUnreadCount(contact.id, state.game);
            return (
              <button
                type="button"
                key={contact.id}
                className={`wechat-conversation${selectedContactId === contact.id ? ' wechat-conversation--selected' : ''}`}
                onClick={() => openConversation(contact.id)}
                aria-current={selectedContactId === contact.id ? 'page' : undefined}
              >
                <Avatar contactId={contact.id} />
                <span className="wechat-conversation__copy">
                  <span className="wechat-conversation__top"><strong>{contact.name}</strong>{latest && <time>{timeLabel(latest.timestamp)}</time>}</span>
                  <span className="wechat-conversation__preview">{latest ? messageKindLabel(latest) : ''}</span>
                </span>
                {unreadCount > 0 && <span className="wechat-unread" aria-label={`${unreadCount} 条未读消息`}>{unreadCount}</span>}
              </button>
            );
          })}
        </div>
      </nav>
      <section className="wechat-chat" aria-live="polite" aria-label={selectedContact ? `${selectedContact.name} 的会话` : '未选择会话'}>
        {selectedContact ? (
          <>
            <header className="wechat-chat__header"><h3>{selectedContact.name}</h3><span aria-hidden="true">···</span></header>
            <div ref={messagesRef} className="wechat-chat__messages">
              {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            </div>
            <div className="wechat-chat__composer" aria-label="消息输入区域"><span aria-hidden="true">⌕</span><span aria-hidden="true">☺</span></div>
          </>
        ) : (
          <div className="wechat-chat__empty">从左侧选择一位联系人</div>
        )}
      </section>
    </section>
  );
}

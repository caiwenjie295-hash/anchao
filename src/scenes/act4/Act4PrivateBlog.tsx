import { useLayoutEffect, useRef, useState } from 'react';
import { VisualAvatar } from '../../components/VisualAvatar';
import { VisualIcon } from '../../components/VisualIcon';
import { assetLoader } from '../../core/assetLoader';
import { mailAvatarForSender } from '../../data/visualIdentityData';
import type { Act4PrivateBlogPost } from '../../data/narrative/act4Presentation';
import './privateBlog.css';

const BLOG_HEADER_ASSET_ID = 'IMG_A4_BLOG_WINDOW_001';
const WANG_AO_AVATAR = mailAvatarForSender('小A');

export function Act4PrivateBlog({
  openingText,
  posts,
  closingText,
  bookmarkedDates,
  onToggleBookmark,
  onReturnToContext,
  onContinue,
  continueLabel,
}: {
  openingText: string;
  posts: readonly Act4PrivateBlogPost[];
  closingText: string;
  bookmarkedDates: readonly string[];
  onToggleBookmark: (dateTime: string) => void;
  onReturnToContext: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const streamRef = useRef<HTMLElement>(null);
  const [headerImageFailed, setHeaderImageFailed] = useState(false);
  const headerImage = assetLoader.get(BLOG_HEADER_ASSET_ID)?.src;

  useLayoutEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const jumpToPost = (dateTime: string) => {
    const target = document.getElementById(`a4-private-post-${dateTime}`);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: 'start', behavior: 'auto' });
  };

  return <section
    ref={rootRef}
    className="a4-private-blog"
    aria-label="王澳的私人动态"
    data-blog-post-count={posts.length}
    data-blog-stream="true"
    tabIndex={-1}
  >
    <header className="a4-private-blog__masthead">
      <div className="a4-private-blog__wordmark" aria-label="潮汐簿">
        <span aria-hidden="true"><VisualIcon name="tidebook" size={18} /></span>
        <strong>潮汐簿</strong>
      </div>
      <p>私人动态 · 本地归档</p>
    </header>

    <div className="a4-private-blog__layout">
      <aside className="a4-private-blog__profile" aria-label="个人资料">
        <div className="a4-private-blog__banner">
          {headerImage && !headerImageFailed
            ? <img src={headerImage} alt="" onError={() => setHeaderImageFailed(true)} />
            : <div className="a4-private-blog__banner-fallback" aria-hidden="true" />}
        </div>
        <div className="a4-private-blog__profile-copy">
          <VisualAvatar className="a4-private-blog__avatar" {...WANG_AO_AVATAR} />
          <h2>王澳</h2>
          <p className="a4-private-blog__handle">@wangao</p>
          <p>个人记录</p>
          <dl>
            <div><dt>记录期间</dt><dd>2020 年 4 月 3 日—19 日</dd></div>
            <div><dt>动态</dt><dd>{posts.length} 条</dd></div>
          </dl>
        </div>
        <button className="a4-private-blog__return" type="button" onClick={onReturnToContext}>返回阅读起点</button>
      </aside>

      <main className="a4-private-blog__feed" ref={streamRef} tabIndex={-1} aria-label="按日期排列的动态">
        <header className="a4-private-blog__feed-heading">
          <p className="a4-private-blog__source-context">{openingText}</p>
          <p className="a4-private-blog__eyebrow">个人主页</p>
          <h2>王澳的动态</h2>
          <p>2020 年 4 月 3 日至 19 日</p>
        </header>

        <ol className="a4-private-blog__posts" aria-label="14 条按日期排列的动态">
          {posts.map((post) => {
            const isBookmarked = bookmarkedDates.includes(post.dateTime);
            return <li key={post.dateTime}>
              <article className="a4-private-blog__post" id={`a4-private-post-${post.dateTime}`} tabIndex={-1} data-post-date={post.dateTime}>
                <header className="a4-private-blog__post-heading">
                  <VisualAvatar className="a4-private-blog__post-avatar" {...WANG_AO_AVATAR} />
                  <div>
                    <strong>王澳</strong>
                    <span>@wangao</span>
                  </div>
                  <time dateTime={post.dateTime}>{post.dateText}</time>
                </header>
                <p className="a4-private-blog__post-text">{post.text}</p>
                <footer className="a4-private-blog__post-actions">
                  <button
                    type="button"
                    aria-pressed={isBookmarked}
                    aria-label={`${isBookmarked ? '取消收藏' : '收藏'} ${post.dateText} 的动态`}
                    onClick={() => onToggleBookmark(post.dateTime)}
                  >
                    <span aria-hidden="true" className="a4-private-blog__bookmark-icon"><VisualIcon name={isBookmarked ? 'bookmark-filled' : 'bookmark'} size={16} /></span>
                    {isBookmarked ? '已收藏' : '收藏'}
                  </button>
                </footer>
              </article>
            </li>;
          })}
        </ol>

        <section className="a4-private-blog__closing" aria-label="读完动态后的反应">
          <p className="a4-private-blog__closing-label">读完记录后</p>
          <p>{closingText}</p>
          <button type="button" onClick={onContinue}>{continueLabel}</button>
        </section>
      </main>

      <aside className="a4-private-blog__date-index" aria-label="动态日期索引">
        <h2>按日期查看</h2>
        <nav>
          {posts.map((post) => <button type="button" key={post.dateTime} onClick={() => jumpToPost(post.dateTime)}>
            <time dateTime={post.dateTime}>{post.dateText}</time>
          </button>)}
        </nav>
      </aside>
    </div>
  </section>;
}

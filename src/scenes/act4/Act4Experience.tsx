import { useEffect, useState, useSyncExternalStore } from "react";
import { stateManager, type StateManager } from "../../core/stateManager";
import {
  notebookPages,
  timeline,
  wakeWords,
  backWords,
  birthdayScenes,
} from "../../data/act4/content";
import { act4OldMails } from "../../data/act4/mail";
import { birthdayImageSlots } from "../../data/act4/assets";
import { Puzzle } from "./Act4Puzzle";
import { Act4LaterExperience } from './Act4LaterExperience';
import { Act4SceneImage } from './Act4SceneImage';
import { PhotoViewport } from '../../components/PhotoViewport';
import { assetLoader } from '../../core/assetLoader';
import { act4PhotoLayout } from '../../data/act4/act4PhotoLayout';
import "../../act4/act4.css";

const routeChoices = [
  { id: "cave", label: "02:30 石洞刻名" },
  { id: "gate", label: "03:50 机构外门" },
  { id: "hydrant", label: "消防栓旁鞋带与脚步" },
];
const days = [
  { id: "04-03", label: "04-03 注册" },
  { id: "04-09", label: "04-09 怀疑过去的自己" },
  { id: "04-19", label: "04-19 决定回去" },
];

export function Act4Experience({
  manager = stateManager,
  onExit,
}: {
  manager?: StateManager;
  onExit: () => void;
}) {
  const state = useSyncExternalStore(
    manager.subscribe,
    manager.getState,
    manager.getState,
  );
  const act4 = state.modules.act4;
  const stage = act4.stage;
  const solved = (id: string) => act4.solvedPuzzleIds.includes(id);
  const [page, setPage] = useState(1);
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [openedPost, setOpenedPost] = useState("04-03");
  const [openedMail, setOpenedMail] = useState("ordinary");
  const [openedOldMail, setOpenedOldMail] = useState<string>(act4OldMails[0].id);
  const [reviewBirthdayIndex, setReviewBirthdayIndex] = useState<number | null>(
    null,
  );
  const [photoDetail, setPhotoDetail] = useState(false);
  const [photoNotice, setPhotoNotice] = useState('');
  const completedT05 = state.game.flags.FLAG_A4_T05_COMPLETE === true;
  const birthday =
    completedT05 && reviewBirthdayIndex !== null
      ? birthdayScenes[reviewBirthdayIndex]
      : (birthdayScenes.find((scene) => scene.id === act4.birthdayNodeId) ??
        birthdayScenes[0]);
  const birthdayIndex = birthdayScenes.indexOf(birthday);
  useEffect(() => { setPhotoDetail(false); setPhotoNotice(''); }, [stage]);
  useEffect(() => {
    if (stage === "T01") manager.readAct4NotebookPage(page);
    if (stage === "T03" && solved("A4_P06"))
      manager.readAct4Timeline(openedPost);
  }, [stage, page, openedPost, act4.solvedPuzzleIds, manager]);
  if (stage === "inactive") return null;
  if (['T06', 'T07', 'T08', 'T09', 'T10'].includes(stage)) return <Act4LaterExperience manager={manager} onExit={onExit} />;
  const advance = () => manager.advanceAct4Stage();
  return (
    <main className="a4" aria-label="第四幕 王澳">
      <header className="a4-header">
        <div>
          <small>第四幕 · 王澳</small>
          <h1>
            {stage === "T01"
              ? "县城夜晚"
              : stage === "T02"
                ? "那一天"
                : stage === "T03"
                  ? "清醒的十七天"
                  : stage === "T04"
                    ? "启明来信"
                    : "2014 / 王澳（小 A）"}
          </h1>
        </div>
        <button type="button" onClick={onExit}>
          退出到桌面
        </button>
      </header>
      {stage === "T01" && (
        <>
        <section className="a4-photo-stage" data-asset-id="IMG_A4_T01_001">
          <PhotoViewport sceneKey="A4_T01_ROOM" imageUrl={assetLoader.get("IMG_A4_T01_001")?.src} imageAlt="酒店桌面上的小 A 笔记与旧址照片"
            hotspots={[{ id: 'clue:notes', ...act4PhotoLayout.IMG_A4_T01_001.focus, onActivate: () => { setPhotoNotice(''); setPhotoDetail(true); } }, ...(act4PhotoLayout.IMG_A4_T01_001.details ?? []).map((point, index) => ({ id: `clue:room:${index}`, ...point, onActivate: () => { setPhotoNotice(point.note ?? ''); setPhotoDetail(true); } }))]}
            routes={[{ id: 'route:mail', ...act4PhotoLayout.IMG_A4_T01_001.route, onActivate: () => { if (solved("A4_P01") && act4.readNotebookPages.length === 9) advance(); else { setPhotoDetail(true); setPhotoNotice("先读完九页，并整理凌晨的路线。"); } } }]}>
            <div className="a4-photo-caption"><strong>县城酒店 · 深夜</strong><p>小月把照片摊开，我把塑料袋里的笔记放在桌上。</p></div>
          </PhotoViewport>
        </section>
        {photoDetail && <div className="a4-detail-backdrop" onClick={() => setPhotoDetail(false)}><div className="a4-detail" role="dialog" aria-modal="true" aria-label="九页笔记" onKeyDown={event => { if (event.key === 'Escape') setPhotoDetail(false); }} onClick={event => event.stopPropagation()}><div className="a4-detail-head"><h2>小 A 的笔记</h2><button type="button" autoFocus onClick={() => setPhotoDetail(false)}>关闭，返回桌面</button></div>{photoNotice && <p role="status" className="a4-hint">{photoNotice}</p>}
        <div className="a4-grid">
          <section className="a4-card">
            <p>
              从启明旧址回到县城。烧烤店里很吵，只有我们这一桌没人说话。回到酒店，小月把照片摊开，我把塑料袋里的笔记放在桌上。
            </p>
            <p>小月：“先把他的笔记看完吧。”</p>
            <div className="a4-paper" data-asset-id="IMG_A4_T01_001">
              <Act4SceneImage assetId="IMG_A4_T01_001" alt="小 A 留下的笔记" />
              <span>小 A 的笔记 · {page}/9</span>
              <p>{notebookPages[page - 1]}</p>
            </div>
            <div className="a4-actions">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                  manager.readAct4NotebookPage(page - 1);
                }}
              >
                上一页
              </button>
              <button
                type="button"
                disabled={page === 9}
                onClick={() => {
                  setPage(page + 1);
                  manager.readAct4NotebookPage(page + 1);
                }}
              >
                下一页
              </button>
            </div>
            <div className="a4-page-list">
              {notebookPages.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  aria-current={page === index + 1 ? "page" : undefined}
                  onClick={() => {
                    setPage(index + 1);
                    manager.readAct4NotebookPage(index + 1);
                  }}
                >
                  {index + 1}
                  {act4.readNotebookPages.includes(index + 1) ? " ✓" : ""}
                </button>
              ))}
            </div>
          </section>
          <section className="a4-card">
            <Puzzle
              id="A4_P01"
              title="三段凌晨记录的先后"
              choices={routeChoices}
              manager={manager}
              solved={solved("A4_P01")}
            />
            {solved("A4_P01") && (
              <p>
                笔记记录他从石洞沿排水沟，再到机构和消防栓。他确实重走了我们走过的路；后面字句越来越乱，不能据此断定他的下落。
              </p>
            )}
            <Puzzle
              id="A4_P02"
              title="地点与旧路对应（可选）"
              choices={[
                { id: "cave", label: "石洞刻名 / 第一幕石洞" },
                { id: "drain", label: "排水沟 / 第三幕上山旧路" },
                { id: "hydrant", label: "消防栓 / 笔记藏处" },
              ]}
              manager={manager}
              solved={solved("A4_P02")}
            />
            <Puzzle
              id="A4_P03"
              title="破句可能指什么（可选）"
              choices={[
                { id: "accounts", label: "微博与邮箱两个账号" },
                { id: "photos", label: "两张照片" },
              ]}
              manager={manager}
              solved={solved("A4_P03")}
            />
            {solved("A4_P01") && (
              <>
                {act4.readNotebookPages.length < 9 && (
                  <p role="status">
                    笔记还有未读页：
                    {notebookPages
                      .map((_, index) => index + 1)
                      .filter(
                        (number) => !act4.readNotebookPages.includes(number),
                      )
                      .join("、")}
                    。读完再查“那一天”。
                  </p>
                )}
                <button
                  type="button"
                  disabled={act4.readNotebookPages.length < 9}
                  onClick={advance}
                >
                  收好笔记，查“那一天”
                </button>
              </>
            )}
          </section>
        </div></div></div>}
        </>
      )}
      {stage === "T02" && (
        <div className="a4-grid a4-grid--old-mail">
          <section className="a4-card">
            <p>小月和我各自打开旧收件箱，核对那一天的日期。</p>
            <div className="a4-mail-brand"><strong>旧邮件</strong><span>2020 年 4 月</span></div>
            <div className="a4-mail-shell"><nav className="a4-mail-folders" aria-label="邮箱文件夹"><strong>文件夹</strong><span>收件箱</span><span>已发送</span></nav><div className="a4-mail-main"><div className="a4-mail-toolbar">收件箱 <span>2 封来信</span></div><div className="a4-mail-list">
              {act4OldMails.map(mail => <button type="button" key={mail.id} aria-current={openedOldMail === mail.id ? 'true' : undefined} onClick={() => setOpenedOldMail(mail.id)}><strong>{mail.from}</strong><span>{mail.label} · {mail.subject}</span><time>{mail.sentAt.slice(5, 16)}</time></button>)}
            </div>{act4OldMails.filter(mail => mail.id === openedOldMail).map(mail => <article key={mail.id} className="a4-mail-reading"><h2>{mail.subject}</h2><p>发件人：{mail.from}<br />收件：{mail.label}</p><p>{mail.body}</p><button type="button" onClick={() => manager.checkAct4OldMail(mail.id)}>核对这封信的时间：{mail.sentAt.slice(0, 10)} {mail.sentAt.slice(11, 16)} {act4.checkedMailRecipients.includes(mail.id) && '✓'}</button></article>)}</div></div>
            <p>末页原文：“密码是一样的”“如果真的你们，那么不要担心那一天。”</p>
          </section>
          <section className="a4-card">
            {act4.checkedMailRecipients.length === 2 ? (
              <Puzzle
                id="A4_P04"
                title="用共同日期组成密码"
                input
                manager={manager}
                solved={solved("A4_P04")}
              />
            ) : (
              <p>先核对两封旧邮件的日期。</p>
            )}
            {solved("A4_P04") && (
              <>
                <label>
                  两个离线模拟账号的密码{" "}
                  <input
                    inputMode="numeric"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const ok = manager.loginAct4Accounts(password);
                    setLoginMessage(
                      ok ? "两个账号已解锁。" : "密码不符；没有尝试次数限制。",
                    );
                  }}
                >
                  确认登录微博与邮箱
                </button>
                <p role="status">{loginMessage}</p>
                <p>
                  微博：Wangao.weibo.com{" "}
                  {act4.unlockedAccountIds.includes("weibo") && "✓"}
                  <br />
                  邮箱：Wangao@163.com{" "}
                  {act4.unlockedAccountIds.includes("mail") && "✓"}
                </p>
                <Puzzle
                  id="A4_P05"
                  title="确认同一密码用于两个账号（可选）"
                  choices={[{ id: "both", label: "同一日期用于微博和邮箱" }]}
                  manager={manager}
                  solved={solved("A4_P05")}
                />
              </>
            )}
            {act4.unlockedAccountIds.length === 2 && (
              <button type="button" onClick={advance}>
                打开微博记录
              </button>
            )}
          </section>
        </div>
      )}
      {stage === "T03" && (
        <div className="a4-grid a4-grid--social">
          <section className="a4-card">
            <div className="a4-social-profile"><div className="a4-social-cover" /><div className="a4-social-avatar" aria-hidden="true">澳</div><div><strong>王澳</strong><span>@Wangao · 2020 年 4 月加入</span><p>写下最近的事，也许有一天能想明白。</p></div></div>
            <Puzzle
              id="A4_P06"
              title="三篇代表性微博排序"
              choices={days}
              manager={manager}
              solved={solved("A4_P06")}
            />
            {solved("A4_P06") && (
              <>
                <div className="a4-social-timeline" aria-label="王澳的动态">
                  {timeline.map(([date]) => (
                    <button
                      type="button"
                      key={date}
                      className="a4-social-post"
                      aria-current={openedPost === date ? 'true' : undefined}
                      onClick={() => {
                        setOpenedPost(date);
                        manager.readAct4Timeline(date);
                      }}
                    >
                      <span className="a4-social-post__avatar" aria-hidden="true">澳</span><span><strong>王澳 <small>@Wangao · 2020-{date}</small></strong><span>{timeline.find(([itemDate]) => itemDate === date)?.[1]}</span>{act4.timelineReadDates.includes(date) && <small>已读</small>}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
          <section className="a4-social-discussion">
            <h2>时间线里的标记与讨论</h2>
            <p>
              小月：“他想过我们。”
              我们只从这些帖子看见他的生活与记忆变化，还不知道原因。
            </p>
            <Puzzle
              id="A4_P07"
              title="生活变化（可选）"
              choices={[
                { id: "food", label: "食堂：吃饭" },
                { id: "friends", label: "网吧：朋友" },
                { id: "xiaoyue", label: "梦里女孩：小月" },
              ]}
              manager={manager}
              solved={solved("A4_P07")}
            />
            <Puzzle
              id="A4_P08"
              title="镜子与噩梦（可选）"
              choices={[
                { id: "memory", label: "可能与过去记忆有关" },
                { id: "proof", label: "已经证明病因" },
              ]}
              manager={manager}
              solved={solved("A4_P08")}
            />
            {solved("A4_P06") && (
              <>
                {!act4.timelineReadDates.includes("04-19") && (
                  <p role="status">请先打开 04-19 的回返与改密码记录。</p>
                )}
                <button
                  type="button"
                  disabled={!act4.timelineReadDates.includes("04-19")}
                  onClick={advance}
                >
                  继续查看邮箱
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {stage === "T04" && (
        <div className="a4-grid a4-grid--mail">
          <section className="a4-card">
            <div className="a4-mail-brand"><strong>王澳的邮箱</strong><span>Wangao@163.com</span></div>
            <div className="a4-mail-shell"><nav className="a4-mail-folders" aria-label="邮箱文件夹"><strong>文件夹</strong><span>收件箱</span><span>已发送</span><span>草稿箱</span></nav><div className="a4-mail-main"><div className="a4-mail-toolbar">收件箱 <span>按时间排序</span></div><div className="a4-mail-list" role="group" aria-label="邮件列表">
              <button type="button" aria-current={openedMail === 'ordinary' ? 'true' : undefined} onClick={() => setOpenedMail("ordinary")}><strong>校园招聘通知</strong><span>面试安排与岗位信息</span><time>04-08</time></button>
              <button type="button" onClick={() => setOpenedMail("ordinary")}><strong>生活服务</strong><span>本月优惠活动</span><time>04-06</time></button>
              <button
                type="button"
                aria-current={openedMail === 'wake' ? 'true' : undefined}
                onClick={() => {
                  setOpenedMail("wake");
                  manager.viewAct4WakeMail();
                }}
              >
                <strong>启明</strong><span>VVaKe</span><time>04-03 00:00</time>
              </button>
            </div>
            {openedMail === "ordinary" ? (
              <article className="a4-mail-reading"><h2>校园招聘通知</h2><p>发件人：校园招聘</p><p>面试时间及岗位安排已经更新，请登录招聘页面查看。</p></article>
            ) : (
              <article className="a4-mail-reading">
                <strong>
                  主题：VVaKe
                  <br />
                  发件人：启明
                  <br />
                  2020 年 4 月 3 日 00:00
                </strong>
                <p>{wakeWords.join(" · ")}</p>
              </article>
            )}</div></div>
          </section>
          <section className="a4-card">
            <h2>第三幕带回的两张纸</h2>
            <p>
              <strong>VVaKe</strong>：{wakeWords.join(" · ")}
            </p>
            <p>
              <strong>13aCK</strong>：{backWords.join(" · ")}
            </p>
            {openedMail === "wake" && (
              <>
                <Puzzle
                  id="A4_P09"
                  title="同词同序的纸片"
                  choices={[
                    { id: "VVaKe", label: "VVaKe · 蜘蛛开头" },
                    { id: "13aCK", label: "13aCK · 老鼠开头" },
                  ]}
                  manager={manager}
                  solved={solved("A4_P09")}
                />
                <Puzzle
                  id="A4_P10"
                  title="邮件与微博的先后（可选）"
                  choices={[
                    {
                      id: "mail-first",
                      label: "先收到 00:00 邮件，随后开始微博记录",
                    },
                    { id: "post-first", label: "先有微博，后来才收到邮件" },
                  ]}
                  manager={manager}
                  solved={solved("A4_P10")}
                />
              </>
            )}
            {act4.wakePaperConfirmed && (
              <>
                <p>
                  六个词与 VVaKe
                  纸片完全一致；时间也与清醒记录相邻。因果仍待求证。
                </p>
                <button type="button" onClick={advance}>
                  进入 2014 年的小 A 视角
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {stage === "T05" && (
        <>
        <section className="a4-photo-stage" data-asset-id={birthdayImageSlots[birthdayIndex].assetId}>
          <PhotoViewport sceneKey={birthday.id} imageUrl={assetLoader.get(birthdayImageSlots[birthdayIndex].assetId)?.src} imageAlt={birthdayImageSlots[birthdayIndex].alt}
            hotspots={[{ id: `clue:${birthday.id}`, ...act4PhotoLayout[birthdayImageSlots[birthdayIndex].assetId].focus, onActivate: () => { setPhotoNotice(''); setPhotoDetail(true); } }, ...(act4PhotoLayout[birthdayImageSlots[birthdayIndex].assetId].details ?? []).map((point, index) => ({ id: `clue:${birthday.id}:${index}`, ...point, onActivate: () => { setPhotoNotice(point.note ?? ''); setPhotoDetail(true); } }))]}
            routes={[{ id: `route:${birthday.id}`, ...act4PhotoLayout[birthdayImageSlots[birthdayIndex].assetId].route, onActivate: () => {
              if (completedT05) { if (reviewBirthdayIndex !== null) setReviewBirthdayIndex(null); else manager.startAct4T06(); }
              else if (birthday.id === 'taken') advance();
              else if (birthday.id === 'door' && !solved('A4_P11')) { setPhotoDetail(true); setPhotoNotice('先听清门缝里的两句话。'); }
              else manager.visitAct4BirthdayNode(birthdayScenes[birthdayIndex + 1].id);
            } }]}>
            <div className="a4-photo-caption"><strong>{birthday.title}</strong><p>{birthday.text}</p></div>
          </PhotoViewport>
        </section>
        {photoDetail && <div className="a4-detail-backdrop" onClick={() => setPhotoDetail(false)}><div className="a4-detail" role="dialog" aria-modal="true" aria-label={birthday.title} onKeyDown={event => { if (event.key === 'Escape') setPhotoDetail(false); }} onClick={event => event.stopPropagation()}><div className="a4-detail-head"><h2>{birthday.title}</h2><button type="button" autoFocus onClick={() => setPhotoDetail(false)}>关闭，返回画面</button></div>{photoNotice && <p role="status" className="a4-hint">{photoNotice}</p>}
        <div className="a4-grid">
          <section className="a4-card">
            <p className="a4-perspective">
              2014 年 · 王澳（小 A）的记忆。如今的我与小月尚不知道那天屋里发生了什么。
            </p>
            <div
              className="a4-scene"
              data-asset-id={birthdayImageSlots[birthdayIndex].assetId}
              aria-label={birthdayImageSlots[birthdayIndex].alt}
            >
              <Act4SceneImage assetId={birthdayImageSlots[birthdayIndex].assetId} alt={birthdayImageSlots[birthdayIndex].alt} />
              <h2>{birthday.title}</h2>
              <p>{birthday.text}</p>
            </div>
            {!completedT05 &&
              birthdayIndex < birthdayScenes.length - 1 &&
              birthday.id !== "door" && (
                <button
                  type="button"
                  onClick={() =>
                    manager.visitAct4BirthdayNode(
                      birthdayScenes[birthdayIndex + 1].id,
                    )
                  }
                >
                  继续经历
                </button>
              )}
            {!completedT05 && birthday.id === "door" && solved("A4_P11") && (
              <button
                type="button"
                onClick={() => manager.visitAct4BirthdayNode("taken")}
              >
                走到家门
              </button>
            )}
            {completedT05 && (
              <div className="a4-actions" aria-label="回看生日场景">
                <button
                  type="button"
                  onClick={() =>
                    setReviewBirthdayIndex(Math.max(0, birthdayIndex - 1))
                  }
                  disabled={birthdayIndex === 0}
                >
                  上一段
                </button>
                <button
                  type="button"
                  onClick={() => setReviewBirthdayIndex(birthdayIndex + 1)}
                  disabled={birthdayIndex === birthdayScenes.length - 1}
                >
                  下一段
                </button>
                <button
                  type="button"
                  onClick={() => setReviewBirthdayIndex(null)}
                >
                  回到家门待续
                </button>
              </div>
            )}
          </section>
          <section className="a4-card">
            <h2>日记与耳边的话</h2>
            <p>
              日记末尾写着 2014 年 12 月 28 日。老师说“明天是你的生日”；12 月 29
              日河边的孩子让我久久不想回家。
            </p>
            {birthdayIndex >= 3 && (
              <Puzzle
                id="A4_P12"
                title="生日与河边（可选）"
                choices={[
                  { id: "birthday", label: "12 月 29 日生日" },
                  { id: "river", label: "河边的孩子与自由" },
                ]}
                manager={manager}
                solved={solved("A4_P12")}
              />
            )}
            {birthday.id === "door" && (
              <>
                <blockquote>
                  “交给你们我们放心。”
                  <br />
                  “就两个月，刚好赶上寒假。”
                </blockquote>
                <Puzzle
                  id="A4_P11"
                  title="确认提前安排的来人"
                  choices={[
                    { id: "contact", label: "父母提前联系并放心交给来人" },
                    { id: "two-months", label: "已经说好两个月" },
                  ]}
                  manager={manager}
                  solved={solved("A4_P11")}
                />
              </>
            )}
            {birthday.id === "taken" && (
              <>
                <p>父母忘了我的生日。家门在眼前，故事停在这里。</p>
                {!completedT05 ? (
                  <button type="button" onClick={advance}>
                    确认第五段结束
                  </button>
                ) : (
                  <><p className="a4-done">生日这一天停在家门。可回看、退出，或主动进入后续回忆。</p><button type="button" onClick={() => manager.startAct4T06()}>继续体验 2014 年启明机构</button></>
                )}
              </>
            )}
          </section>
        </div>
        </div></div>}
        {completedT05 && <details className="a4-recap"><summary>回看已见生日片段</summary><div className="a4-page-list">{birthdayScenes.map((scene, index) => <button type="button" key={scene.id} onClick={() => setReviewBirthdayIndex(index)}>{scene.title}</button>)}<button type="button" onClick={() => setReviewBirthdayIndex(null)}>回到当前进度</button></div></details>}
        </>
      )}
    </main>
  );
}

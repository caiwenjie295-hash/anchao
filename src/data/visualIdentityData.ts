import wangAoAvatar from '../assets/ui-identity/IMG_UI_IDENTITY_WANGAO_001.webp';
import { visualIconNames, type VisualIconName } from '../components/VisualIcon';

export type VisualIdentityImageId = 'IMG_UI_IDENTITY_WANGAO_001';
export type MailAvatarSpec = { fallbackIcon: VisualIconName; tone: number; imageId?: VisualIdentityImageId; spriteAssetId?: 'IMG_A1_B_010' };

export const visualIdentityAssetLedger = [{
  id: 'IMG_UI_IDENTITY_WANGAO_001' as const,
  source: 'docs/ux-identity-20261006/source/IMG_UI_IDENTITY_WANGAO_001.png',
  published: 'src/assets/ui-identity/IMG_UI_IDENTITY_WANGAO_001.webp',
  purpose: 'Same daily-life account avatar for Wang Ao and Xiao A in the private blog and email sender detail. No person or identity evidence appears in the image.',
  prompt: 'docs/ux-identity-20261006/prompts/profile-avatars.md#IMG_UI_IDENTITY_WANGAO_001',
  uniqueWriter: 'agent/UX-IDENTITY-20261006-icons',
}] as const;

const visualIdentityVectorPurposes: Record<VisualIconName, string> = {
  search: '邮件和网页搜索入口',
  refresh: '邮件列表刷新操作',
  check: '邮件已读状态操作',
  star: '邮件星标待操作状态',
  'star-filled': '邮件星标已选状态',
  menu: '邮件文件夹菜单入口',
  attachment: '邮件附件类型标记',
  mail: '邮件阅读区空状态',
  bookmark: '博客收藏待选状态',
  'bookmark-filled': '博客收藏已选状态',
  tidebook: '私人博客站点品牌标识',
  news: '地方新闻、融媒和周刊来源标识及未知来源回退',
  trail: '徒步指南来源标识',
  book: '百科、开放词条和项目目录来源标识',
  weather: '天气服务来源标识',
  map: '地图服务来源标识及未知来源回退',
  forum: '徒步论坛与旧校园论坛来源标识',
  notes: '田野笔记与网页存档索引来源标识',
  location: '地方地点与地名服务来源标识',
  hotel: '住宿服务来源标识',
  government: '教务及政务机构来源标识',
  community: '互助社区来源标识及未知来源回退',
  outdoor: '户外用品来源标识',
  market: '商城与交易来源标识及未知来源回退',
  education: '教育与成长项目来源标识',
  repair: '维修服务来源标识',
  travel: '旅行笔记来源标识',
  photo: '摄影论坛、相册和工作室来源标识',
  bus: '公交服务来源标识',
  career: '就业与招聘来源标识',
  cloud: '云盘服务来源标识',
  media: '媒体、周刊与流媒体来源标识',
  service: '账户、校园卡及未知发件人服务标识',
  library: '图书馆账户与服务来源标识',
  event: '活动及赛事来源标识',
  calendar: '日历及清单来源标识',
  network: '校园网络与信息中心来源标识',
  club: '读书会来源标识',
  streaming: '流媒体账户来源标识',
  history: '浏览器搜索历史入口',
  'avatar-leaf': '论坛昵称对应的叶片头像图形',
  'avatar-wave': '论坛昵称对应的波纹头像图形',
  'avatar-spark': '论坛昵称对应的光点头像图形',
  'avatar-photo': '论坛昵称对应的风景框头像图形',
  'avatar-cloud': '论坛昵称对应的云朵头像图形',
  'avatar-book': '论坛昵称对应的书页头像图形',
  profile: '普通账户头像的无字图形回退',
};

export const visualIdentityVectorLedger = visualIconNames.map((icon) => ({
  id: `ICON_UI_IDENTITY_${icon.toUpperCase().replace(/-/g, '_')}`,
  icon,
  purpose: visualIdentityVectorPurposes[icon],
})) satisfies ReadonlyArray<{ id: string; icon: VisualIconName; purpose: string }>;

export const visualIdentityImageSources: Record<VisualIdentityImageId, string> = {
  IMG_UI_IDENTITY_WANGAO_001: wangAoAvatar,
};

const siteMarks: Record<string, VisualIconName> = {
  'xxdaily.local': 'news',
  'trailbook.local': 'trail',
  'baike.local': 'book',
  'weather.xx.local': 'weather',
  'map.xx.local': 'map',
  'hikeforum.local': 'forum',
  'fieldnotes.local': 'notes',
  'southcity.local': 'location',
  'citynews.local': 'news',
  'stay.xx.local': 'hotel',
  'gov.xx.local': 'government',
  'mutualaid.local': 'community',
  'outdoor-shop.local': 'outdoor',
  'market.xx.local': 'market',
  'yangsheng-weekly.local': 'media',
  'buybus.local': 'bus',
  'xxshop.local': 'market',
  'xxedu.local': 'education',
  'xxfix.local': 'repair',
  'travelnote.local': 'travel',
  'geoname.local': 'location',
  'photoforum.local': 'photo',
  'stonecare.local': 'service',
  'openwiki.local': 'book',
  '启明青少年成长中心旧站': 'education',
  'XX县融媒旧闻': 'news',
  'XX县融媒旧档': 'news',
  'XX县融媒': 'news',
  '旧校园论坛': 'forum',
  '青少年项目目录': 'book',
  '旧网页存档索引': 'notes',
};
const fallbackSiteMarks: VisualIconName[] = ['news', 'book', 'map', 'community', 'market'];

const stableHash = (value: string): number => {
  let hash = 0;
  for (const character of Array.from(value.trim())) hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  return hash;
};

/** Site marks depend only on the visible source name, so search and source pages stay consistent. */
export const siteMarkForName = (name: string): VisualIconName =>
  siteMarks[name] ?? fallbackSiteMarks[stableHash(name) % fallbackSiteMarks.length]!;

const mailIcons: Record<string, VisualIconName> = {
  '暗房周刊': 'media',
  '白昼工作室': 'photo',
  '北岸文化': 'book',
  '城市马拉松': 'event',
  '海风传媒': 'media',
  '活力商城': 'market',
  '教务处': 'government',
  '教务系统': 'education',
  '旧相册': 'photo',
  '就业指导中心': 'career',
  '林予': 'profile',
  '流媒体服务': 'streaming',
  '慢慢买': 'market',
  '青年职场': 'career',
  '日常集市': 'market',
  '图书馆': 'library',
  '图书馆账户': 'library',
  '小A': 'profile',
  '校园卡服务': 'service',
  '校园网': 'network',
  '校园优选': 'market',
  '信息中心': 'network',
  '学生事务中心': 'service',
  '远川科技招聘组': 'career',
  '跃迁招聘': 'career',
  '云盘备份': 'cloud',
  '折线新闻': 'news',
  '纸页读书会': 'club',
  '周末清单': 'calendar',
};

/** Sender identity is stable across folders and independent of mail content or game state. */
export const mailAvatarForSender = (sender: string): MailAvatarSpec => ({
  fallbackIcon: mailIcons[sender] ?? 'service',
  tone: stableHash(sender) % 6,
  ...(sender === '林予' ? { spriteAssetId: 'IMG_A1_B_010' as const } : {}),
  ...(sender === '小A' ? { imageId: 'IMG_UI_IDENTITY_WANGAO_001' as const } : {}),
});

const forumAvatarMarks: VisualIconName[] = ['avatar-leaf', 'avatar-wave', 'avatar-spark', 'avatar-photo', 'avatar-cloud', 'avatar-book'];

/** Forum identity depends only on the displayed nickname, never page tier, flags, or correctness. */
export const forumAvatarForAuthor = (author: string): { icon: VisualIconName; tone: number } => {
  const hash = stableHash(author || '匿名');
  return { icon: forumAvatarMarks[hash % forumAvatarMarks.length]!, tone: hash % 6 };
};

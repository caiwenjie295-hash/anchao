import type { AppState } from '../core/types';
import { findSearchQuery } from './browserData';

export interface SearchGuidance {
  query: string;
  prompt: string;
}

const guidance = (query: string, prompt: string): SearchGuidance => {
  if (!findSearchQuery(query)) throw new Error(`搜索指引必须对应现有查询：${query}`);
  return { query, prompt };
};

/** Derives only search prompts supported by the player's current stage and discovered sources. */
export function getSearchGuidance(state: AppState): SearchGuidance[] {
  const flags = state.game.flags;
  if (state.game.act === 1 && ['C', 'D', 'E'].includes(state.game.phase) && flags.FLAG_A1_MAIL_XIAOA_OPENED === true) {
    if (flags.FLAG_A1_NEWS_FOUND !== true) return [guidance('XX县失踪', '先搜索“XX县失踪”，打开并阅读一篇旧报道。')];
    if (flags.FLAG_A1_ROUTE_INFO_FOUND !== true) return [guidance('鸡公岭徒步', '接着搜索“鸡公岭徒步”，打开路线资料核对长度和难度。')];
  }
  if (state.game.act === 2 && state.modules.act2Research.stage === 'search' && flags.FLAG_A1_COMPLETE === true) {
    const prompts = [guidance('鸡公岭 补', '先搜索“鸡公岭 补”，查看地点与现场记号是否能对应。')];
    if (flags.FLAG_A1_SS_FOUND === true) prompts.push(guidance('双S 十字', '第一幕照片里已经发现的记号，也可以搜“双S 十字”。'));
    return prompts;
  }
  if (state.game.act === 2 && state.modules.act2Research.stage === 'qiming' && flags.FLAG_A2_SS_MATCH_CONFIRMED === true) {
    const prompts = [guidance('启明青少年成长中心', '接下来在浏览器搜“启明青少年成长中心”，阅读公开资料。')];
    if (flags.FLAG_A2_QIMING_TESTIMONIALS_READ === true) {
      prompts.push(guidance('启明 黄子山', '公开案例已经给出黄子山的姓名；可搜“启明 黄子山”核对他的后续报道。'));
      prompts.push(guidance('启明 钟子月', '公开案例已经给出钟子月的姓名；可搜“启明 钟子月”核对她的后续报道。'));
    }
    return prompts;
  }
  return [];
}

// 专题注册表
// =============================================================================
// 「专题」是战争目录里的一类特殊条目：不是一场仗，而是**一条按时间推进的主线**，
// 点开整屏播放分阶段动画。三个专题共用同一个舞台（ui/storyStage.js），
// 差异只在数据：品牌名、段数与每段的取景框/路线/叙事。
//
// 加新专题只需在这里加一项：{ ...META, stages }，META 里要 id/title/sub/brand/meta。
// main.js 按 id 懒创建舞台实例并缓存——省界与河流只请求一次。
// =============================================================================

import { MARCH_STAGES, MARCH_META } from './march.js';
import { EXPEDITION_STAGES, EXPEDITION_META } from './expedition.js';
import { RESISTANCE_STAGES, RESISTANCE_META } from './resistance.js';
import { LIBERATION_STAGES, LIBERATION_META } from './liberation.js';

export const TOPICS = [
  { ...MARCH_META, stages: MARCH_STAGES },
  { ...EXPEDITION_META, stages: EXPEDITION_STAGES },
  { ...RESISTANCE_META, stages: RESISTANCE_STAGES },
  { ...LIBERATION_META, stages: LIBERATION_STAGES },
];

export const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/** 战争列表「专题」分组要用的条目（去掉 stages，只留目录信息）。 */
export function topicEntries() {
  return TOPICS.map((t) => ({ id: t.id, title: t.title, sub: t.sub }));
}

import { DAYS, EVIDENCE, type Content } from './types';

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';
const hasPage = (v: unknown) => (typeof v === 'number' && v > 0) || filled(v);

/** Returns every problem found in the content files; an empty list means the content is usable. */
export function validateContent(c: Content): string[] {
  const errs: string[] = [];
  const partIds = new Set<number>();
  for (const p of c.parts ?? []) {
    if (!Number.isInteger(p.id)) errs.push(`parts: id 必须是整数 (${p.id})`);
    if (partIds.has(p.id)) errs.push(`parts: id 重复 (${p.id})`);
    partIds.add(p.id);
    if (!filled(p.zh)) errs.push(`parts ${p.id}: 缺少 zh`);
    if (typeof p.read !== 'boolean') errs.push(`parts ${p.id}: read 必须是 true 或 false`);
  }

  if (c.school) {
    const codes = new Set(Object.keys(c.school.classes ?? {}));
    for (const [date, code] of Object.entries(c.school.days ?? {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errs.push(`school: 日期 "${date}" 要写成 YYYY-MM-DD`);
      if (code !== 'noschool' && !codes.has(code)) errs.push(`school ${date}: "${code}" 不是 noschool,也不在 classes 里`);
    }
    for (const code of Object.keys(c.school.spring ?? {})) if (!codes.has(code)) errs.push(`school: spring 里的 "${code}" 不在 classes 里`);
  }

  const sysIds = new Set<string>();
  for (const s of c.systems ?? []) {
    const at = `systems ${s.id}`;
    if (!ID.test(String(s.id))) errs.push(`${at}: id 只能用小写字母、数字和连字符`);
    if (sysIds.has(s.id)) errs.push(`${at}: id 重复`);
    sysIds.add(s.id);
    if (!filled(s.zh) || !filled(s.en)) errs.push(`${at}: 缺少 zh 或 en`);
    if (typeof s.checked !== 'boolean') errs.push(`${at}: checked 必须是 true 或 false`);
    if (s.checked && !(filled(s.senses) && filled(s.outputs) && filled(s.timescale) && hasPage(s.page)))
      errs.push(`${at}: checked 为 true 之前,senses、outputs、timescale 和 page 都要填`);
  }

  const ids = new Set<string>();
  for (const p of c.protocols ?? []) {
    const at = `protocols ${p.id}`;
    if (!ID.test(String(p.id))) errs.push(`${at}: id 只能用小写字母、数字和连字符`);
    if (ids.has(p.id)) errs.push(`${at}: id 重复`);
    ids.add(p.id);
    if (!partIds.has(p.part)) errs.push(`${at}: part ${p.part} 不存在`);
    if (!filled(p.zh) || !filled(p.en)) errs.push(`${at}: 缺少 zh 或 en`);
    if (!filled(p.how)) errs.push(`${at}: 缺少 how(做法)`);
    if (!TIME.test(String(p.time))) errs.push(`${at}: time 要写成 "HH:MM"`);

    const f = p.freq;
    const okFreq =
      f === 'daily' ||
      (typeof f === 'number' && Number.isInteger(f) && f >= 1 && f <= 7) ||
      (Array.isArray(f) && f.length > 0 && f.every((d) => DAYS.includes(d)) && new Set(f).size === f.length);
    if (!okFreq) errs.push(`${at}: freq 要写成 daily、[mon, wed] 这样的列表,或 1–7 的数字`);

    if (p.when != null && p.when !== 'school' && p.when !== 'noschool') errs.push(`${at}: when 只能是 school 或 noschool`);
    if (p.when != null && typeof f === 'number') errs.push(`${at}: 每周 N 次的条目不能再加 when`);

    const ch = p.chain;
    if (!ch || ['act', 'trigger', 'change', 'result'].some((k) => typeof (ch as never)[k] !== 'string'))
      errs.push(`${at}: chain 要有 act、trigger、change、result 四格`);
    if (!Array.isArray(p.systems)) errs.push(`${at}: systems 必须是列表`);
    else for (const s of p.systems) if (!sysIds.has(s)) errs.push(`${at}: 系统 "${s}" 在 systems.yaml 里不存在`);
    if (!Array.isArray(p.adapt)) errs.push(`${at}: adapt 必须是列表`);
    else for (const a of p.adapt) if (!a || !filled(a.when) || !filled(a.then)) errs.push(`${at}: adapt 每条都要有 when 和 then`);
    if (p.evidence != null && !EVIDENCE.includes(p.evidence)) errs.push(`${at}: evidence 只能是 ${EVIDENCE.join(' / ')}`);
    if (typeof p.checked !== 'boolean') errs.push(`${at}: checked 必须是 true 或 false`);
    if (p.checked) {
      if (!ch || !(filled(ch.act) && filled(ch.trigger) && filled(ch.change) && filled(ch.result)))
        errs.push(`${at}: checked 为 true 之前,机制链四格都要写`);
      if (!hasPage(p.page)) errs.push(`${at}: checked 为 true 之前要填 page(书中页码)`);
      if (Array.isArray(p.systems) && p.systems.length === 0) errs.push(`${at}: checked 为 true 之前至少选一个系统`);
    }
  }
  return errs;
}

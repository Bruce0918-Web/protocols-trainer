import { useState } from 'preact/hooks';
import { protocols, school, schoolLabel } from '../content';
import { addDays, byTime, dateKey, dayOf, isFlexible, parseKey, scheduledOn, weekStart } from '../schedule';
import type { Data, Scores } from '../store';
import type { Day } from '../types';

const DAY_ZH: Record<Day, string> = { mon: '一', tue: '二', wed: '三', thu: '四', fri: '五', sat: '六', sun: '日' };
const SCORE_ROWS: { key: keyof Scores; label: string; hint: string }[] = [
  { key: 'sleep', label: '睡眠', hint: '这天晚上睡得怎么样' },
  { key: 'energy', label: '精力', hint: '这天白天' },
  { key: 'focus', label: '专注', hint: '这天白天' },
];

/** The day is recalled in four stretches; times are 'HH:MM' strings, so plain string comparison works. */
const BLOCKS = [
  { name: '早上', from: '00:00', to: '08:00' },
  { name: '白天', from: '08:00', to: '15:00' },
  { name: '下午', from: '15:00', to: '19:30' },
  { name: '晚上', from: '19:30', to: '24:00' },
];

interface Props {
  data: Data;
  onChange: (next: Data) => void;
}

export function CheckinPage({ data, onChange }: Props) {
  const today = dateKey(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const [day, setDay] = useState(addDays(today, -1));

  return (
    <section>
      <header class="head">
        <h1>每日回顾</h1>
        <p class="sub">白天不用碰手机。第二天早上花半分钟,把前一天过一遍。</p>
      </header>
      <div class="days" role="tablist" aria-label="选择日期">
        {days.map((k) => (
          <button key={k} role="tab" aria-selected={k === day} class={data.checkins[k] ? 'saved' : ''} onClick={() => setDay(k)}>
            <span>{k === today ? '今天' : k === addDays(today, -1) ? '昨天' : '周' + DAY_ZH[dayOf(k)]}</span>
            <b>{parseKey(k).getDate()}</b>
          </button>
        ))}
      </div>
      <DayForm key={day + (data.checkins[day]?.savedAt ?? '')} day={day} data={data} onChange={onChange} />
    </section>
  );
}

function DayForm({ day, data, onChange }: Props & { day: string }) {
  const saved = data.checkins[day];
  const fixed = protocols.filter((p) => scheduledOn(p, day, school.days)).sort(byTime);
  const blocks = BLOCKS.map((b) => ({ ...b, items: fixed.filter((p) => p.time >= b.from && p.time < b.to) })).filter((b) => b.items.length);
  const label = schoolLabel(day);
  const flexible = protocols.filter(isFlexible);

  const [done, setDone] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const p of fixed) init[p.id] = saved?.done[p.id] ?? true;
    for (const p of flexible) init[p.id] = saved?.done[p.id] ?? false;
    return init;
  });
  const [scores, setScores] = useState<Scores>(saved?.scores ?? { sleep: null, energy: null, focus: null });
  const [dirty, setDirty] = useState(!saved);

  const toggle = (id: string) => {
    setDone((d) => ({ ...d, [id]: !d[id] }));
    setDirty(true);
  };
  const setScore = (key: keyof Scores, v: number) => {
    setScores((s) => ({ ...s, [key]: s[key] === v ? null : v }));
    setDirty(true);
  };
  const saveDay = () =>
    onChange({ ...data, checkins: { ...data.checkins, [day]: { done, scores, savedAt: new Date().toISOString() } } });

  /** How many times a flexible protocol was done this week, counting this form's unsaved state for the selected day. */
  const weekCount = (id: string) => {
    const monday = weekStart(day);
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const k = addDays(monday, i);
      if (k === day ? done[id] : data.checkins[k]?.done[id]) n++;
    }
    return n;
  };

  const doneCount = fixed.filter((p) => done[p.id]).length;
  const d = parseKey(day);

  return (
    <div>
      <div class="dayline">
        <h2>
          {d.getMonth() + 1} 月 {d.getDate()} 日 · 周{DAY_ZH[dayOf(day)]}
        </h2>
        <span class="count">
          做到 <b>{doneCount}</b> / {fixed.length}
        </span>
      </div>
      {label && <p class="school">{label}</p>}
      <p class="hint">默认都算做到。点一下,把没做到的标出来。</p>

      {blocks.map((b) => (
        <div key={b.name}>
          <h3 class="sec">
            {b.name}
            <span class="pill">
              {b.items.filter((p) => done[p.id]).length} / {b.items.length}
            </span>
          </h3>
          <ul class="rows">
            {b.items.map((p) => (
              <li key={p.id}>
                <button class="row" aria-pressed={done[p.id]} onClick={() => toggle(p.id)}>
                  <span class="time">{p.time}</span>
                  <span class="name">
                    {p.zh}
                    <small>{p.en}</small>
                  </span>
                  <span class="mark">{done[p.id] ? '做到' : '没做到'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {flexible.length > 0 && (
        <>
          <h3 class="sec">每周几次的 · 这天做了就点一下</h3>
          <ul class="rows">
            {flexible.map((p) => (
              <li key={p.id}>
                <button class="row flex" aria-pressed={done[p.id]} onClick={() => toggle(p.id)}>
                  <span class="time">
                    {weekCount(p.id)}/{p.freq as number}
                  </span>
                  <span class="name">
                    {p.zh}
                    <small>{p.en}</small>
                  </span>
                  <span class="mark">{done[p.id] ? '做了' : '没做'}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 class="sec">这一天感觉如何 · 1 最差,5 最好</h3>
      <div class="scores">
        {SCORE_ROWS.map((r) => (
          <div class="score" key={r.key}>
            <span class="slabel">
              {r.label}
              <small>{r.hint}</small>
            </span>
            <span class="dots" role="group" aria-label={r.label}>
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} aria-pressed={scores[r.key] === v} onClick={() => setScore(r.key, v)}>
                  {v}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>

      <div class="savebar">
        <button class="primary" disabled={!dirty} onClick={saveDay}>
          {dirty ? (saved ? '保存修改' : '保存这一天') : '已记录'}
        </button>
      </div>
    </div>
  );
}

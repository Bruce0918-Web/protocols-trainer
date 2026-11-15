import { useState } from 'preact/hooks';
import { parts, protocols, systems } from '../content';
import { byTime } from '../schedule';
import type { Day, Protocol } from '../types';

const DAY_ZH: Record<Day, string> = { mon: '一', tue: '二', wed: '三', thu: '四', fri: '五', sat: '六', sun: '日' };
const EVIDENCE_ZH = { strong: '强', medium: '中', weak: '弱', unsure: '不确定' } as const;

export function freqLabel(p: Protocol): string {
  if (p.when === 'school') return '上学日';
  if (p.when === 'noschool') return '不上学的日子';
  if (p.freq === 'daily') return '每天';
  if (typeof p.freq === 'number') return `每周 ${p.freq} 次`;
  return '周' + p.freq.map((d) => DAY_ZH[d]).join('、');
}

const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div class="field">
    <dt>{label}</dt>
    <dd class={value ? '' : 'empty'}>{value || '还没写'}</dd>
  </div>
);

function ProtocolCard({ p, showAll }: { p: Protocol; showAll: boolean }) {
  return (
    <details class="card">
      <summary>
        <span class="name">
          {p.zh}
          <small>{p.en}</small>
        </span>
        <span class="meta">
          {p.time} · {freqLabel(p)}
        </span>
      </summary>
      <div class="cardbody">
        <p class="how">{p.how}</p>
        {showAll ? (
          <>
            <ol class="chain">
              {(
                [
                  ['行为', p.chain.act],
                  ['触发', p.chain.trigger],
                  ['改变', p.chain.change],
                  ['结果', p.chain.result],
                ] as const
              ).map(([label, text]) => (
                <li key={label}>
                  <span>{label}</span>
                  <p class={text ? '' : 'empty'}>{text || '还没写'}</p>
                </li>
              ))}
            </ol>
            <dl>
              <Field label="作用的系统" value={p.systems.map((id) => systems.find((s) => s.id === id)?.zh ?? id).join('、')} />
              <div class="field">
                <dt>变通规则</dt>
                {p.adapt.length === 0 ? (
                  <dd class="empty">还没写</dd>
                ) : (
                  p.adapt.map((a, i) => (
                    <dd key={i}>
                      {a.when} → {a.then}
                    </dd>
                  ))
                )}
              </div>
              <Field label="证据强度" value={p.evidence ? EVIDENCE_ZH[p.evidence] : ''} />
              <Field label="预期好处" value={p.benefit} />
              <Field label="我的看法" value={p.view} />
              <Field label="书中页码" value={p.page} />
            </dl>
            <p class={'status ' + (p.checked ? 'ok' : '')}>{p.checked ? '已对照书核对' : '还没核对,不会进入复习'}</p>
          </>
        ) : (
          <p class="status">这部分还没读,先照做。读完后在 parts.yaml 里把 read 改成 true。</p>
        )}
      </div>
    </details>
  );
}

export function CardsPage() {
  const [view, setView] = useState<'part' | 'system'>('part');
  const untagged = protocols.filter((p) => p.systems.length === 0);

  return (
    <section>
      <header class="head">
        <h1>卡片</h1>
        <p class="sub">这里只读。卡片内容在电脑上改 content 文件夹里的文件。</p>
      </header>
      <div class="seg" role="tablist">
        <button role="tab" aria-selected={view === 'part'} onClick={() => setView('part')}>
          按部分
        </button>
        <button role="tab" aria-selected={view === 'system'} onClick={() => setView('system')}>
          按系统
        </button>
      </div>

      {view === 'part' &&
        parts.map((part) => {
          const list = protocols.filter((p) => p.part === part.id).sort(byTime);
          return (
            <div key={part.id}>
              <h3 class="sec">
                {part.id} · {part.zh}
                <span class="pill">{part.read ? `${list.length} 条` : `${list.length} 条 · 未读,照做中`}</span>
              </h3>
              {list.map((p) => (
                <ProtocolCard key={p.id} p={p} showAll={part.read} />
              ))}
            </div>
          );
        })}

      {view === 'system' && (
        <>
          {systems.map((s) => {
            const list = protocols.filter((p) => p.systems.includes(s.id)).sort(byTime);
            return (
              <div key={s.id}>
                <h3 class="sec">
                  {s.zh}
                  <span class="pill">{list.length} 条</span>
                </h3>
                <div class="syscard">
                  <p class="en">{s.en}</p>
                  <dl>
                    <Field label="它感受什么" value={s.senses} />
                    <Field label="它输出什么" value={s.outputs} />
                    <Field label="多久起效" value={s.timescale} />
                  </dl>
                  <p class={'status ' + (s.checked ? 'ok' : '')}>{s.checked ? '已对照书核对' : '还没核对'}</p>
                </div>
                {list.map((p) => (
                  <ProtocolCard key={p.id} p={p} showAll={parts.find((x) => x.id === p.part)?.read ?? false} />
                ))}
              </div>
            );
          })}
          <h3 class="sec">
            还没归到任何系统
            <span class="pill">{untagged.length} 条</span>
          </h3>
          <p class="hint">在卡片的 systems 里填上系统 id,它就会出现在对应的系统下面。</p>
        </>
      )}
    </section>
  );
}

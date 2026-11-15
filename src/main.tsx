import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './style.css';
import { load, save, requestPersistence, type Data } from './store';
import { CheckinPage } from './ui/Checkin';
import { CardsPage } from './ui/Cards';
import { BackupPage } from './ui/Backup';

const TABS = [
  { id: 'log', label: '记录' },
  { id: 'cards', label: '卡片' },
  { id: 'backup', label: '备份' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const tabFromHash = (): Tab => {
  const h = location.hash.slice(1);
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'log';
};

function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [data, setData] = useState<Data>(load);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    const on = () => setTab(tabFromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  const update = (next: Data) => {
    setData(next);
    setSaveFailed(!save(next));
    requestPersistence();
  };

  return (
    <div class="shell">
      {saveFailed && <p class="warn">浏览器没能保存这次改动。请到“备份”页导出一份,再检查是否开了无痕模式。</p>}
      <main>
        {tab === 'log' && <CheckinPage data={data} onChange={update} />}
        {tab === 'cards' && <CardsPage />}
        {tab === 'backup' && <BackupPage data={data} onChange={update} />}
      </main>
      <nav class="tabs" aria-label="页面">
        {TABS.map((t) => (
          <a key={t.id} href={'#' + t.id} aria-current={tab === t.id ? 'page' : undefined}>
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

render(<App />, document.getElementById('app')!);

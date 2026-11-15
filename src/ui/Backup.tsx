import { useRef, useState } from 'preact/hooks';
import { dateKey } from '../schedule';
import { parseData, serialize, type Data } from '../store';

interface Props {
  data: Data;
  onChange: (next: Data) => void;
}

export function BackupPage({ data, onChange }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState<Data | null>(null);
  const days = Object.keys(data.checkins).length;

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([serialize(data)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `protocols-backup-${dateKey(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg('已导出。把文件存到你找得到的地方。');
  };

  const pick = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      setPending(parseData(await f.text()));
      setMsg('');
    } catch (err) {
      setPending(null);
      setMsg((err as Error).message);
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    onChange(pending);
    setMsg(`已导入 ${Object.keys(pending.checkins).length} 天的记录。`);
    setPending(null);
  };

  return (
    <section>
      <header class="head">
        <h1>备份</h1>
        <p class="sub">记录只存在这台设备的浏览器里。清空浏览器数据或换手机之前,先导出。</p>
      </header>

      <div class="panel">
        <p>
          这台设备上有 <b>{days}</b> 天的回顾记录。
        </p>
        <button class="primary" onClick={exportJson}>
          导出 JSON
        </button>
      </div>

      <div class="panel">
        <p>导入会用备份文件替换这台设备上的全部记录。</p>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={pick} />
        <button class="ghost" onClick={() => file.current?.click()}>
          选择备份文件
        </button>
        {pending && (
          <div class="confirm">
            <p>
              备份里有 {Object.keys(pending.checkins).length} 天的记录,这台设备上现有 {days} 天。替换后现有的无法找回。
            </p>
            <button class="primary" onClick={confirmImport}>
              确认替换
            </button>
            <button class="ghost" onClick={() => setPending(null)}>
              取消
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p class="msg" role="status">
          {msg}
        </p>
      )}
    </section>
  );
}

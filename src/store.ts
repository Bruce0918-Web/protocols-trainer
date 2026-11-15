/** Everything the phone remembers. Card content is not here; it lives in content/*.yaml. */
export interface Scores {
  sleep: number | null;
  energy: number | null;
  focus: number | null;
}

export interface Checkin {
  /** protocol id → done or missed, for the protocols shown that day. */
  done: Record<string, boolean>;
  scores: Scores;
  savedAt: string;
}

export interface Data {
  version: 1;
  mode: 'train' | 'maintain';
  /** Keyed by the day the protocols were done ('YYYY-MM-DD'). `scores.sleep` is the night that followed. */
  checkins: Record<string, Checkin>;
  /** Review answers (stage 2) and quarterly audits (stage 3). Kept untouched by stage 1. */
  reviews: unknown[];
  audits: unknown[];
}

const KEY = 'protocols-trainer-v1';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyData(): Data {
  return { version: 1, mode: 'train', checkins: {}, reviews: [], audits: [] };
}

export function serialize(data: Data): string {
  return JSON.stringify(data, null, 2);
}

const score = (v: unknown): number | null => (v == null ? null : (v as number));
const okScore = (v: unknown) => v == null || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5);

/** Reads a backup. Throws with a readable message if the text is not a valid backup; never returns partial data. */
export function parseData(text: string): Data {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('这不是有效的 JSON 文件。');
  }
  if (!raw || typeof raw !== 'object' || raw.version !== 1 || !raw.checkins || typeof raw.checkins !== 'object' || Array.isArray(raw.checkins))
    throw new Error('这不是训练器的备份文件。');

  const checkins: Record<string, Checkin> = {};
  for (const [key, c] of Object.entries<any>(raw.checkins)) {
    if (!DATE.test(key) || !c || typeof c !== 'object' || !c.done || typeof c.done !== 'object')
      throw new Error(`备份里 ${key} 这一天的记录损坏。`);
    const done: Record<string, boolean> = {};
    for (const [id, v] of Object.entries(c.done)) {
      if (typeof v !== 'boolean') throw new Error(`备份里 ${key} 这一天的记录损坏。`);
      done[id] = v;
    }
    const s = c.scores ?? {};
    if (!okScore(s.sleep) || !okScore(s.energy) || !okScore(s.focus)) throw new Error(`备份里 ${key} 这一天的打分损坏。`);
    checkins[key] = {
      done,
      scores: { sleep: score(s.sleep), energy: score(s.energy), focus: score(s.focus) },
      savedAt: typeof c.savedAt === 'string' ? c.savedAt : '',
    };
  }
  return {
    version: 1,
    mode: raw.mode === 'maintain' ? 'maintain' : 'train',
    checkins,
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    audits: Array.isArray(raw.audits) ? raw.audits : [],
  };
}

export function load(): Data {
  try {
    const text = localStorage.getItem(KEY);
    return text ? parseData(text) : emptyData();
  } catch {
    return emptyData();
  }
}

/** Returns false if the browser refused to store the data. */
export function save(data: Data): boolean {
  try {
    localStorage.setItem(KEY, serialize(data));
    return true;
  } catch {
    return false;
  }
}

/** Asks the browser not to evict our data. Safe to call repeatedly. */
export function requestPersistence(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}

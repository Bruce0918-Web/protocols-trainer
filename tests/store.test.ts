import { describe, expect, it } from 'vitest';
import { emptyData, parseData, serialize, type Data } from '../src/store';

const sample = (): Data => ({
  version: 1,
  mode: 'maintain',
  checkins: {
    '2026-11-16': { done: { 'morning-sun': true, 'cold-shower': false }, scores: { sleep: 4, energy: 3, focus: null }, savedAt: '2026-11-17T05:00:00.000Z' },
    '2026-11-17': { done: { 'a-card-that-was-later-deleted': true }, scores: { sleep: null, energy: null, focus: null }, savedAt: '' },
  },
  reviews: [{ date: '2026-11-17', card: 'morning-sun', kind: 'mechanism', answer: '…', grade: 'partial' }],
  audits: [{ date: '2027-02-15', id: 'zinc', decision: 'stop', reason: '没感觉' }],
});

describe('backup', () => {
  it('export then import gives back exactly the same data', () => {
    expect(parseData(serialize(sample()))).toEqual(sample());
  });
  it('keeps records for cards that no longer exist', () => {
    expect(parseData(serialize(sample())).checkins['2026-11-17'].done['a-card-that-was-later-deleted']).toBe(true);
  });
  it('an empty store round-trips', () => {
    expect(parseData(serialize(emptyData()))).toEqual(emptyData());
  });
  it('rejects things that are not a backup', () => {
    expect(() => parseData('hello')).toThrow();
    expect(() => parseData('{}')).toThrow();
    expect(() => parseData('{"version":2,"checkins":{}}')).toThrow();
    expect(() => parseData('{"version":1,"checkins":[]}')).toThrow();
  });
  it('rejects damaged days instead of importing part of a file', () => {
    expect(() => parseData('{"version":1,"checkins":{"2026-11-16":{"done":{"x":"yes"}}}}')).toThrow();
    expect(() => parseData('{"version":1,"checkins":{"not-a-date":{"done":{}}}}')).toThrow();
    expect(() => parseData('{"version":1,"checkins":{"2026-11-16":{"done":{},"scores":{"sleep":9}}}}')).toThrow();
  });
});

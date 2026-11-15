import { describe, expect, it } from 'vitest';
import { content, schoolLabel } from '../src/content';
import { validateContent } from '../src/validate';
import type { Content, Protocol } from '../src/types';

const clone = (): Content => JSON.parse(JSON.stringify(content));
const first = (c: Content): Protocol => c.protocols[0];

describe('content files', () => {
  it('the real content has no problems', () => {
    expect(validateContent(content)).toEqual([]);
  });
  it('the school calendar matches the spreadsheet on key dates', () => {
    const d = content.school!.days;
    expect(Object.keys(d)).toHaveLength(65);
    expect(d['2026-11-16']).toBe('A1');
    expect(d['2026-11-25']).toBe('noschool'); // Thanksgiving break
    expect(d['2026-12-01']).toBe('B1');
    expect(d['2027-01-04']).toBe('noschool'); // last day of winter break
    expect(d['2027-01-05']).toBe('A2');
    expect(d['2027-01-18']).toBe('noschool'); // MLK
    expect(d['2027-02-11']).toBe('C2');
  });
  it('labels a day by its rotation, with the spring classes after the switch', () => {
    expect(schoolLabel('2026-11-16')).toBe('A1 日 · 历史 · 生物 · 几何 · 代数 · 戏剧技术');
    expect(schoolLabel('2027-01-19')).toBe('A1 日 · 历史 · 生物 · 几何 · 代数 · 空');
    expect(schoolLabel('2026-11-25')).toBe('放假');
    expect(schoolLabel('2026-11-21')).toBe(''); // a Saturday
  });
  it('has seven systems and seven parts', () => {
    expect(content.systems).toHaveLength(7);
    expect(content.parts).toHaveLength(7);
  });
});

describe('validator', () => {
  it('catches a duplicate id', () => {
    const c = clone();
    c.protocols.push({ ...first(c) });
    expect(validateContent(c).some((e) => e.includes('重复'))).toBe(true);
  });
  it('catches a system that does not exist', () => {
    const c = clone();
    first(c).systems = ['no-such-system'];
    expect(validateContent(c).some((e) => e.includes('no-such-system'))).toBe(true);
  });
  it('catches a bad frequency and a bad time', () => {
    const c = clone();
    first(c).freq = ['monday'] as never;
    first(c).time = '7:5';
    expect(validateContent(c)).toHaveLength(2);
  });
  it('refuses checked: true while the mechanism chain is empty', () => {
    const c = clone();
    first(c).checked = true;
    expect(validateContent(c).length).toBeGreaterThan(0);
  });
  it('accepts checked: true once chain, page and a system are filled', () => {
    const c = clone();
    Object.assign(first(c), { checked: true, page: 12, systems: [c.systems[0].id], chain: { act: 'a', trigger: 'b', change: 'c', result: 'd' } });
    expect(validateContent(c)).toEqual([]);
  });
});

import partsRaw from '../content/parts.yaml';
import systemsRaw from '../content/systems.yaml';
import protocolsRaw from '../content/protocols.yaml';
import schoolRaw from '../content/school.yaml';
import type { Content, Part, Protocol, School, SystemCard } from './types';

export const parts = partsRaw as Part[];
export const systems = systemsRaw as SystemCard[];
export const protocols = protocolsRaw as Protocol[];
export const school = schoolRaw as School;
export const content: Content = { school, parts, systems, protocols };

/** What kind of day it was at school: the rotation day and its classes, a day off, or nothing for a plain weekend. */
export function schoolLabel(key: string): string {
  const code = school.days[key];
  if (code === undefined) return '';
  if (code === 'noschool') return '放假';
  const table = school.springFrom && key >= school.springFrom && school.spring ? school.spring : school.classes;
  return `${code} 日 · ${table[code] ?? school.classes[code]}`;
}

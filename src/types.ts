export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof DAYS)[number];

/** 'daily', a list of weekdays, or a number meaning "N times a week, any days". */
export type Freq = 'daily' | Day[] | number;

export const EVIDENCE = ['strong', 'medium', 'weak', 'unsure'] as const;
export type Evidence = (typeof EVIDENCE)[number];

export interface Part {
  id: number;
  zh: string;
  en: string;
  read: boolean;
}

export interface SystemCard {
  id: string;
  zh: string;
  en: string;
  senses: string;
  outputs: string;
  timescale: string;
  page: string | number | null;
  checked: boolean;
}

export interface Protocol {
  id: string;
  part: number;
  no: string | number | null;
  zh: string;
  en: string;
  freq: Freq;
  /** Optional: only due on school days, or only on days without school. */
  when?: 'school' | 'noschool';
  time: string;
  how: string;
  chain: { act: string; trigger: string; change: string; result: string };
  systems: string[];
  adapt: { when: string; then: string }[];
  evidence: Evidence | null;
  benefit: string;
  view: string;
  page: string | number | null;
  checked: boolean;
}

/** School calendar: date → rotation code ('A1' …) or 'noschool'. Dates not listed fall back to Mon–Fri = school. */
export interface School {
  classes: Record<string, string>;
  springFrom?: string;
  spring?: Record<string, string>;
  days: Record<string, string>;
}

export interface Content {
  school?: School;
  parts: Part[];
  systems: SystemCard[];
  protocols: Protocol[];
}

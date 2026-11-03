import type { Lead } from '../api/schemas';
import { PATH } from '../api/schemas';
import { DAY, toDate } from './time';

/** Pure helpers behind the Flow board cards. */

/** Whole days a lead has sat in its current stage (a stage change updates `updated`). */
export function daysInStage(l: Pick<Lead, 'updated' | 'created'>, now = Date.now()): number {
  const d = toDate(l.updated) || toDate(l.created);
  return d ? Math.max(0, Math.floor((now - d.getTime()) / DAY)) : 0;
}

/** The stage one tap moves a card to. Never jumps into «عميل نشط» (converting a client is a deliberate move) and never leaves the exit lanes. */
export function nextStage(stage: string): string | null {
  const i = PATH.indexOf(stage);
  if (i < 0 || i >= PATH.length - 2) return null;
  return PATH[i + 1];
}

/** 0..1 — how far along the path the lead is (progress ring). Exit lanes read as 0. */
export function pathProgress(stage: string): number {
  const i = PATH.indexOf(stage);
  return i < 0 ? 0 : (i + 1) / PATH.length;
}

export type Pulse = 'fresh' | 'warm' | 'cold' | 'none';
/** How recently we touched an open deal: ≤3 days fresh, ≤7 warm, older cold. Closed and active clients have no pulse. */
export function pulse(l: Pick<Lead, 'stage' | 'lastContact' | 'created'>, now = Date.now()): Pulse {
  if (l.stage === 'عميل نشط' || l.stage === 'خسرناه' || l.stage === 'متوقف') return 'none';
  const ref = toDate(l.lastContact) || toDate(l.created);
  if (!ref) return 'none';
  const days = (now - ref.getTime()) / DAY;
  return days <= 3 ? 'fresh' : days <= 7 ? 'warm' : 'cold';
}

/** The money a card shows: monthly fee for clients, deal value otherwise. */
export function dealAmount(l: Pick<Lead, 'type' | 'mrr' | 'dealValue'>): number {
  return (l.type === 'حالي' && l.mrr ? l.mrr : l.dealValue) || 0;
}

/** Column total, same rule as the card. */
export function stageTotal(leads: Pick<Lead, 'type' | 'mrr' | 'dealValue' | 'stage'>[], stage: string): number {
  return leads.filter((l) => l.stage === stage).reduce((a, l) => a + (stage === 'عميل نشط' ? l.mrr || 0 : l.dealValue || 0), 0);
}

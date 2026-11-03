import { describe, expect, it } from 'vitest';
import { dealAmount, daysInStage, nextStage, pathProgress, pulse, stageTotal } from '../flow';

const NOW = Date.parse('2026-11-10T12:00:00+03:00');
describe('flow helpers', () => {
  it('daysInStage counts whole days and never goes negative', () => {
    expect(daysInStage({ updated: '2026-11-07T12:00:00+03:00', created: '' }, NOW)).toBe(3);
    expect(daysInStage({ updated: '', created: '2026-11-11T12:00:00+03:00' }, NOW)).toBe(0);
    expect(daysInStage({ updated: '', created: '' }, NOW)).toBe(0);
  });
  it('nextStage walks the path but stops before «عميل نشط» and in exit lanes', () => {
    expect(nextStage('جديد')).toBe('تم التواصل');
    expect(nextStage('تفاوض')).toBe('فترة تجريبية');
    expect(nextStage('فترة تجريبية')).toBeNull();
    expect(nextStage('عميل نشط')).toBeNull();
    expect(nextStage('خسرناه')).toBeNull();
  });
  it('pathProgress runs 1/8 to 1 and is 0 outside the path', () => {
    expect(pathProgress('جديد')).toBeCloseTo(0.125);
    expect(pathProgress('عميل نشط')).toBe(1);
    expect(pathProgress('متوقف')).toBe(0);
  });
  it('pulse reads recency of contact and ignores closed deals', () => {
    expect(pulse({ stage: 'تفاوض', lastContact: '2026-11-09T12:00:00+03:00', created: '' }, NOW)).toBe('fresh');
    expect(pulse({ stage: 'تفاوض', lastContact: '2026-11-05T12:00:00+03:00', created: '' }, NOW)).toBe('warm');
    expect(pulse({ stage: 'تفاوض', lastContact: '2026-10-20T12:00:00+03:00', created: '' }, NOW)).toBe('cold');
    expect(pulse({ stage: 'خسرناه', lastContact: '2026-10-20T12:00:00+03:00', created: '' }, NOW)).toBe('none');
  });
  it('dealAmount prefers the monthly fee of a client; stageTotal uses mrr only for active', () => {
    expect(dealAmount({ type: 'حالي', mrr: 900, dealValue: 5000 })).toBe(900);
    expect(dealAmount({ type: 'متوقع', mrr: null, dealValue: 5000 })).toBe(5000);
    const ls = [{ type: 'حالي', stage: 'عميل نشط', mrr: 900, dealValue: 5000 }, { type: 'متوقع', stage: 'تفاوض', mrr: null, dealValue: 3000 }];
    expect(stageTotal(ls, 'عميل نشط')).toBe(900);
    expect(stageTotal(ls, 'تفاوض')).toBe(3000);
  });
});

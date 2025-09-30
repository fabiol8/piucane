import { describe, expect, it } from '@jest/globals';
import { computeCadenceDays } from '@/lib/validations';

describe('computeCadenceDays', () => {
  it('rounds cadence up to next standard interval applying buffer', () => {
    const cadence = computeCadenceDays(20, 12000, 25);
    expect(cadence).toBe(28);
  });

  it('caps cadence at maximum supported window', () => {
    const cadence = computeCadenceDays(5, 25000, 5);
    expect(cadence).toBe(84);
  });

  it('ensures minimum cadence of one week', () => {
    const cadence = computeCadenceDays(40, 1500, 30);
    expect(cadence).toBeGreaterThanOrEqual(7);
    expect(cadence % 7).toBe(0);
  });
});

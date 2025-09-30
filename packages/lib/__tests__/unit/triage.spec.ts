import { describe, expect, it } from '@jest/globals';
import { evaluateTriage } from '../../src/triage';

describe('evaluateTriage', () => {
  it('flags urgent red flag symptoms', () => {
    const result = evaluateTriage({
      symptoms: ['Dispnea improvvisa', 'letargia']
    });

    expect(result.urgency).toBe('urgent');
    expect(result.redFlags).toContain('dispnea');
    expect(result.recommendedAction).toMatch(/emergenza/);
  });

  it('returns priority when vitals are outside safe thresholds', () => {
    const result = evaluateTriage({
      symptoms: ['apatico'],
      temperatureC: 40,
      heartRateBpm: 150
    });

    expect(result.urgency).toBe('priority');
    expect(result.redFlags).toEqual(
      expect.arrayContaining(['temperatura fuori range', 'frequenza cardiaca anomala'])
    );
  });

  it('defaults to routine monitoring when no alerts are present', () => {
    const result = evaluateTriage({
      symptoms: ['pelo opaco'],
      temperatureC: 38.2,
      heartRateBpm: 90
    });

    expect(result.urgency).toBe('routine');
    expect(result.redFlags).toHaveLength(0);
    expect(result.recommendedAction).toMatch(/Monitora/);
  });
});

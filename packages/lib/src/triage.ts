export type UrgencyLevel = 'urgent' | 'priority' | 'routine';

export interface TriageInput {
  symptoms: string[];
  temperatureC?: number;
  heartRateBpm?: number;
  hasCollapse?: boolean;
}

export interface TriageResult {
  urgency: UrgencyLevel;
  redFlags: string[];
  recommendedAction: string;
}

const RED_FLAG_KEYWORDS = ['dispnea', 'collasso', 'convulsioni', 'emorragia', 'incosciente'];

const PRIORITY_TEMPERATURE_RANGE = { min: 37.5, max: 39.5 };
const PRIORITY_HEART_RATE_RANGE = { min: 60, max: 140 };

export function evaluateTriage(input: TriageInput): TriageResult {
  const normalizedSymptoms = input.symptoms.map(symptom => symptom.toLowerCase());
  const redFlags = normalizedSymptoms.filter(symptom =>
    RED_FLAG_KEYWORDS.some(keyword => symptom.includes(keyword))
  );

  if (input.hasCollapse) {
    redFlags.push('collasso');
  }

  if (redFlags.length > 0) {
    return {
      urgency: 'urgent',
      redFlags,
      recommendedAction: 'Contatta immediatamente il veterinario di emergenza e monitora la respirazione.'
    };
  }

  const priorityReasons: string[] = [];

  if (
    typeof input.temperatureC === 'number' &&
    (input.temperatureC < PRIORITY_TEMPERATURE_RANGE.min ||
      input.temperatureC > PRIORITY_TEMPERATURE_RANGE.max)
  ) {
    priorityReasons.push('temperatura fuori range');
  }

  if (
    typeof input.heartRateBpm === 'number' &&
    (input.heartRateBpm < PRIORITY_HEART_RATE_RANGE.min ||
      input.heartRateBpm > PRIORITY_HEART_RATE_RANGE.max)
  ) {
    priorityReasons.push('frequenza cardiaca anomala');
  }

  if (priorityReasons.length > 0) {
    return {
      urgency: 'priority',
      redFlags: priorityReasons,
      recommendedAction: 'Contatta il veterinario nelle prossime ore e limita l\'attività del cane.'
    };
  }

  return {
    urgency: 'routine',
    redFlags: [],
    recommendedAction: 'Monitora la situazione e annota eventuali cambiamenti nel diario salute.'
  };
}

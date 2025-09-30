import { Metadata } from 'next';
import MissionProgress from '@/components/gamification/MissionProgress';

export const metadata: Metadata = {
  title: 'Missioni - PiùCane',
  description: 'Completa missioni per guadagnare XP e premi per il tuo cane',
};

// Mock data - in production, fetch from API
const mockMissionProgress = {
  userId: 'demo-user-123',
  missionId: 'mission_health_001',
  status: 'active' as const,
  currentStep: 2,
  completedSteps: 2,
  totalSteps: 5,
  progressPercentage: 0.4,
  stepProgress: [
    {
      stepId: 'step_1',
      status: 'completed' as const,
      completedAt: new Date('2024-01-28'),
      timeSpent: 15,
      verification: { type: 'photo', photoUrl: '/demo-photo.jpg' },
      rating: 5
    },
    {
      stepId: 'step_2',
      status: 'completed' as const,
      completedAt: new Date('2024-01-29'),
      timeSpent: 22,
      verification: { type: 'checklist', items: ['item1', 'item2'] },
      rating: 4
    },
    {
      stepId: 'step_3',
      status: 'active' as const,
      timeSpent: 0
    },
    {
      stepId: 'step_4',
      status: 'pending' as const,
      timeSpent: 0
    },
    {
      stepId: 'step_5',
      status: 'pending' as const,
      timeSpent: 0
    }
  ],
  startedAt: new Date('2024-01-28'),
  lastActiveAt: new Date(),
  estimatedCompletionAt: new Date(Date.now() + 86400000),
  timeSpent: 37,
  efficiency: 0.95,
  qualityScore: 0.88,
  currentDifficulty: 'medium' as const,
  ddaAdjustments: [],
  earnedRewards: [],
  pendingRewards: [],
  createdAt: new Date('2024-01-28'),
  updatedAt: new Date()
};

const mockMission = {
  id: 'mission_health_001',
  title: 'Controllo Salute Settimanale',
  description: 'Monitora la salute del tuo cane con controlli regolari',
  type: 'health' as const,
  category: 'health',
  difficulty: 'medium' as const,
  ddaEnabled: true,
  adaptiveAdjustments: [],
  steps: [
    {
      id: 'step_1',
      order: 0,
      title: 'Controllo Peso',
      description: 'Pesa il tuo cane e registra il peso',
      type: 'verification' as const,
      requirements: [{
        type: 'photo' as const,
        description: 'Scatta una foto della bilancia con il peso',
        data: {},
        optional: false
      }],
      estimatedMinutes: 10,
      instructions: 'Usa una bilancia precisa per pesare il tuo cane. Se il cane è piccolo, pesati prima da solo, poi con il cane in braccio e calcola la differenza.',
      tips: ['Pesa sempre alla stessa ora del giorno', 'Usa la stessa bilancia per coerenza'],
      materials: ['Bilancia', 'Quaderno per appunti'],
      verification: {
        type: 'photo',
        data: { requiredElements: ['bilancia', 'peso_visibile'] },
        required: true
      },
      xpReward: 50,
      itemRewards: [],
      difficultyModifiers: {
        easy: { estimatedMinutes: 5, xpReward: 40 },
        medium: {},
        hard: { estimatedMinutes: 15, xpReward: 60 }
      }
    },
    {
      id: 'step_2',
      order: 1,
      title: 'Controllo Occhi e Orecchie',
      description: 'Esamina occhi e orecchie per segni di infezioni',
      type: 'verification' as const,
      requirements: [{
        type: 'checklist' as const,
        description: 'Completa tutti i controlli',
        data: {
          items: [
            { id: 'eyes_clear', text: 'Occhi puliti e chiari', required: true },
            { id: 'no_discharge', text: 'Nessuna secrezione', required: true },
            { id: 'ears_clean', text: 'Orecchie pulite', required: true },
            { id: 'no_odor', text: 'Nessun cattivo odore', required: true }
          ]
        },
        optional: false
      }],
      estimatedMinutes: 15,
      instructions: 'Esamina attentamente occhi e orecchie del tuo cane. Cerca segni di rossore, secrezioni o cattivi odori.',
      tips: ['Usa una torcia per vedere meglio', 'Se noti anomalie, consulta il veterinario'],
      materials: ['Torcia', 'Salviette pulite'],
      verification: {
        type: 'checklist',
        data: {
          items: [
            { id: 'eyes_clear', text: 'Occhi puliti e chiari', required: true },
            { id: 'no_discharge', text: 'Nessuna secrezione', required: true },
            { id: 'ears_clean', text: 'Orecchie pulite', required: true },
            { id: 'no_odor', text: 'Nessun cattivo odore', required: true }
          ]
        },
        required: true
      },
      xpReward: 75,
      itemRewards: [],
      difficultyModifiers: {
        easy: { estimatedMinutes: 10, xpReward: 60 },
        medium: {},
        hard: { estimatedMinutes: 20, xpReward: 90 }
      }
    },
    {
      id: 'step_3',
      order: 2,
      title: 'Controllo Denti e Gengive',
      description: 'Ispeziona la salute dentale del tuo cane',
      type: 'verification' as const,
      requirements: [{
        type: 'photo' as const,
        description: 'Foto dei denti del cane',
        data: {},
        optional: false
      }],
      estimatedMinutes: 10,
      instructions: 'Solleva delicatamente le labbra del cane per ispezionare denti e gengive. Cerca segni di tartaro, infiammazioni o denti rotti.',
      tips: ['Ricompensa il cane per la collaborazione', 'Controlla il colore delle gengive (dovrebbero essere rosa)'],
      materials: ['Premio per cane'],
      verification: {
        type: 'photo',
        data: { requiredElements: ['denti_visibili', 'gengive'] },
        required: true
      },
      xpReward: 60,
      itemRewards: [],
      difficultyModifiers: {
        easy: { estimatedMinutes: 5, xpReward: 50 },
        medium: {},
        hard: { estimatedMinutes: 15, xpReward: 75 }
      }
    },
    {
      id: 'step_4',
      order: 3,
      title: 'Controllo Pelle e Pelo',
      description: 'Esamina la condizione di pelle e mantello',
      type: 'verification' as const,
      requirements: [{
        type: 'checklist' as const,
        description: 'Verifica tutti gli aspetti',
        data: {
          items: [
            { id: 'skin_healthy', text: 'Pelle sana senza rossori', required: true },
            { id: 'coat_shiny', text: 'Pelo lucido e morbido', required: true },
            { id: 'no_parasites', text: 'Nessun segno di parassiti', required: true },
            { id: 'no_wounds', text: 'Nessuna ferita o lesione', required: true }
          ]
        },
        optional: false
      }],
      estimatedMinutes: 20,
      instructions: 'Ispeziona accuratamente pelle e pelo, prestando attenzione a zone come ascelle, inguine e tra le dita.',
      tips: ['Controlla anche le zampe e gli spazi tra le dita', 'Cerca noduli o masse inusuali'],
      materials: ['Spazzola', 'Torcia'],
      verification: {
        type: 'checklist',
        data: {
          items: [
            { id: 'skin_healthy', text: 'Pelle sana senza rossori', required: true },
            { id: 'coat_shiny', text: 'Pelo lucido e morbido', required: true },
            { id: 'no_parasites', text: 'Nessun segno di parassiti', required: true },
            { id: 'no_wounds', text: 'Nessuna ferita o lesione', required: true }
          ]
        },
        required: true
      },
      xpReward: 80,
      itemRewards: [],
      difficultyModifiers: {
        easy: { estimatedMinutes: 15, xpReward: 65 },
        medium: {},
        hard: { estimatedMinutes: 25, xpReward: 95 }
      }
    },
    {
      id: 'step_5',
      order: 4,
      title: 'Registrazione Report Salute',
      description: 'Compila il report finale sui controlli effettuati',
      type: 'verification' as const,
      requirements: [{
        type: 'quiz_score' as const,
        description: 'Completa il questionario salute',
        data: {
          questions: [
            {
              question: 'Il peso del tuo cane è nella norma?',
              answers: ['Sì, normale', 'Leggermente sovrappeso', 'Sottopeso', 'Molto sovrappeso'],
              correctAnswer: 0
            },
            {
              question: 'Hai notato anomalie negli occhi?',
              answers: ['No, tutto normale', 'Leggero rossore', 'Secrezioni', 'Lacrimazione eccessiva'],
              correctAnswer: 0
            }
          ],
          passingScore: 0.8
        },
        optional: false
      }],
      estimatedMinutes: 5,
      instructions: 'Rispondi alle domande basandoti sui controlli appena effettuati per completare il report salute.',
      tips: ['Rispondi onestamente per avere un quadro accurato', 'Salva il report per i prossimi controlli veterinari'],
      materials: [],
      verification: {
        type: 'quiz',
        data: {
          questions: [
            {
              question: 'Il peso del tuo cane è nella norma?',
              answers: ['Sì, normale', 'Leggermente sovrappeso', 'Sottopeso', 'Molto sovrappeso'],
              correctAnswer: 0
            },
            {
              question: 'Hai notato anomalie negli occhi?',
              answers: ['No, tutto normale', 'Leggero rossore', 'Secrezioni', 'Lacrimazione eccessiva'],
              correctAnswer: 0
            }
          ],
          passingScore: 0.8
        },
        required: true
      },
      xpReward: 100,
      itemRewards: [],
      difficultyModifiers: {
        easy: { xpReward: 80 },
        medium: {},
        hard: { xpReward: 120 }
      }
    }
  ],
  totalSteps: 5,
  estimatedDuration: 60,
  recommendedSchedule: 'weekly' as const,
  prerequisites: [],
  minLevel: 1,
  requiredBadges: [],
  targetAudience: {
    dogAges: [{ min: 0, max: 20, unit: 'years' as const }],
    dogBreeds: [],
    experienceLevels: ['beginner', 'intermediate', 'advanced'],
    userLevels: [{ min: 1, max: 100 }]
  },
  rewards: {
    xp: 365,
    badges: ['health_monitor'],
    items: [{
      type: 'discount' as const,
      title: '10% Sconto Prodotti Salute',
      description: 'Sconto su tutti i prodotti per la salute',
      value: 10,
      quantity: 1
    }],
    discounts: [],
    exclusiveContent: []
  },
  bonusRewards: [],
  createdBy: 'system' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  stats: {
    timesStarted: 1250,
    timesCompleted: 987,
    averageCompletionTime: 58,
    completionRate: 0.79,
    averageRating: 4.3
  }
};

export default function MissionsPage() {
  const handleStepComplete = async (
    stepId: string,
    verification: any,
    timeSpent: number,
    rating?: number
  ) => {
    console.log('Step completed:', { stepId, verification, timeSpent, rating });
    // In production, call API to update step progress
  };

  const handleMissionPause = async () => {
    console.log('Mission paused');
    // In production, call API to pause mission
  };

  const handleMissionResume = async () => {
    console.log('Mission resumed');
    // In production, call API to resume mission
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🎯 Le Tue Missioni</h1>
          <p className="text-gray-600 mt-2">
            Completa le missioni passo dopo passo per guadagnare XP e premi!
          </p>
        </div>

        <MissionProgress
          missionProgress={mockMissionProgress}
          mission={mockMission}
          onStepComplete={handleStepComplete}
          onMissionPause={handleMissionPause}
          onMissionResume={handleMissionResume}
        />
      </div>
    </div>
  );
}
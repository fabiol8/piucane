import { NextRequest, NextResponse } from 'next/server';

// Mock gamification data
const mockGamificationData = {
  user: {
    id: 'user-123',
    level: 12,
    xp: 2850,
    totalXpForNextLevel: 3200,
    streak: 7,
    weeklyStats: {
      activitiesCompleted: 15,
      xpEarned: 380,
      missionsCompleted: 3,
      badgesEarned: 1
    }
  },
  missions: [
    {
      id: 'mission-1',
      title: 'Controllo Salute Mensile',
      description: 'Completa il controllo mensile della salute di Luna',
      difficulty: 'medium',
      xpReward: 150,
      category: 'health',
      timeEstimate: '15 min',
      deadline: '2024-10-15',
      progress: 3,
      totalSteps: 5,
      status: 'in_progress',
      steps: [
        { id: 1, title: 'Controlla peso', completed: true, type: 'measurement' },
        { id: 2, title: 'Verifica vaccinazioni', completed: true, type: 'checklist' },
        { id: 3, title: 'Foto stato generale', completed: true, type: 'photo' },
        { id: 4, title: 'Controllo denti e gengive', completed: false, type: 'checklist' },
        { id: 5, title: 'Aggiorna libretto sanitario', completed: false, type: 'form' }
      ]
    },
    {
      id: 'mission-2',
      title: 'Training Settimanale',
      description: 'Completa 5 sessioni di training questa settimana',
      difficulty: 'easy',
      xpReward: 100,
      category: 'training',
      timeEstimate: '10 min/giorno',
      deadline: '2024-10-12',
      progress: 2,
      totalSteps: 5,
      status: 'in_progress',
      steps: [
        { id: 1, title: 'Sessione 1: Comandi base', completed: true, type: 'training' },
        { id: 2, title: 'Sessione 2: Richiamo', completed: true, type: 'training' },
        { id: 3, title: 'Sessione 3: Socializzazione', completed: false, type: 'training' },
        { id: 4, title: 'Sessione 4: Gioco interattivo', completed: false, type: 'training' },
        { id: 5, title: 'Sessione 5: Consolidamento', completed: false, type: 'training' }
      ]
    }
  ],
  badges: [
    {
      id: 'health-champion',
      name: 'Campione della Salute',
      description: 'Completa 10 controlli sanitari',
      rarity: 'rare',
      category: 'health',
      icon: '🏥',
      earnedAt: '2024-09-15',
      progress: 10,
      maxProgress: 10
    },
    {
      id: 'trainer-expert',
      name: 'Esperto Allenatore',
      description: 'Completa 25 sessioni di training',
      rarity: 'epic',
      category: 'training',
      icon: '🎾',
      earnedAt: '2024-08-20',
      progress: 25,
      maxProgress: 25
    }
  ],
  rewards: [
    {
      id: 'reward-1',
      name: 'Sconto 20% Shop',
      description: 'Sconto del 20% su tutti i prodotti',
      type: 'discount',
      value: 20,
      cost: 500,
      available: true,
      expiresAt: '2024-12-31'
    },
    {
      id: 'reward-2',
      name: 'Cibo Premium Gratis',
      description: 'Sacco di cibo premium da 3kg gratuito',
      type: 'product',
      value: 45,
      cost: 1000,
      available: true,
      expiresAt: '2024-11-30'
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    switch (type) {
      case 'missions':
        return NextResponse.json({
          success: true,
          data: mockGamificationData.missions
        });

      case 'badges':
        return NextResponse.json({
          success: true,
          data: mockGamificationData.badges
        });

      case 'rewards':
        return NextResponse.json({
          success: true,
          data: mockGamificationData.rewards
        });

      default:
        return NextResponse.json({
          success: true,
          data: mockGamificationData
        });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gamification data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, missionId, stepId, rewardId } = await request.json();

    switch (action) {
      case 'complete_step':
        // Mock step completion
        return NextResponse.json({
          success: true,
          data: {
            xpEarned: 25,
            message: 'Step completato! +25 XP'
          }
        });

      case 'claim_reward':
        // Mock reward claim
        return NextResponse.json({
          success: true,
          data: {
            message: 'Premio riscattato con successo!',
            code: 'PIUCANE20OFF'
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Action failed' },
      { status: 500 }
    );
  }
}
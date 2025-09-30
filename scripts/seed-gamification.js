const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../environments/firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedGamificationData() {
  console.log('🎮 Starting gamification data seeding...');

  try {
    // Seed Missions
    await seedMissions();

    // Seed Badges
    await seedBadges();

    // Seed Rewards
    await seedRewards();

    console.log('✅ Gamification data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding gamification data:', error);
  }
}

async function seedMissions() {
  console.log('📋 Seeding missions...');

  const missions = [
    // Onboarding Missions
    {
      id: 'complete_profile',
      title: 'Completa il tuo profilo',
      description: 'Aggiungi tutte le informazioni del tuo profilo personale',
      type: 'complete_profile',
      category: 'onboarding',
      points: 100,
      requirements: {
        profileCompletion: 100
      },
      icon: 'user-circle',
      difficulty: 'easy',
      estimatedTime: 5,
      active: true,
      featured: true,
      priority: 1,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },
    {
      id: 'add_first_dog',
      title: 'Aggiungi il tuo primo cane',
      description: 'Crea il profilo del tuo fedele compagno',
      type: 'add_dog',
      category: 'onboarding',
      points: 200,
      requirements: {
        dogsCount: 1
      },
      icon: 'dog',
      difficulty: 'easy',
      estimatedTime: 10,
      active: true,
      featured: true,
      priority: 2,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },
    {
      id: 'complete_dog_profile',
      title: 'Completa il profilo del cane',
      description: 'Aggiungi foto, peso, allergenie e tutte le informazioni del tuo cane',
      type: 'complete_dog_profile',
      category: 'onboarding',
      points: 150,
      requirements: {
        dogProfileCompletion: 100
      },
      icon: 'id-card',
      difficulty: 'easy',
      estimatedTime: 15,
      active: true,
      featured: true,
      priority: 3,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },

    // Purchase Missions
    {
      id: 'first_purchase',
      title: 'Il tuo primo acquisto',
      description: 'Effettua il tuo primo ordine su PiùCane',
      type: 'make_purchase',
      category: 'purchase',
      points: 300,
      requirements: {
        ordersCount: 1,
        minAmount: 0
      },
      icon: 'shopping-cart',
      difficulty: 'easy',
      estimatedTime: 20,
      active: true,
      featured: true,
      priority: 4,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },
    {
      id: 'big_spender',
      title: 'Grande acquirente',
      description: 'Spendi almeno €100 in un singolo ordine',
      type: 'make_purchase',
      category: 'purchase',
      points: 500,
      requirements: {
        minAmount: 100
      },
      icon: 'money-bill-wave',
      difficulty: 'medium',
      estimatedTime: 30,
      active: true,
      featured: false,
      priority: 5,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },
    {
      id: 'loyal_customer',
      title: 'Cliente fedele',
      description: 'Effettua 5 ordini su PiùCane',
      type: 'make_purchase',
      category: 'purchase',
      points: 1000,
      requirements: {
        ordersCount: 5
      },
      icon: 'heart',
      difficulty: 'medium',
      estimatedTime: 0,
      active: true,
      featured: false,
      priority: 6,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },

    // Subscription Missions
    {
      id: 'create_subscription',
      title: 'Crea il tuo primo abbonamento',
      description: 'Attiva un abbonamento per ricevere prodotti regolarmente',
      type: 'create_subscription',
      category: 'subscription',
      points: 400,
      requirements: {
        subscriptionsCount: 1
      },
      icon: 'sync',
      difficulty: 'easy',
      estimatedTime: 15,
      active: true,
      featured: true,
      priority: 7,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },
    {
      id: 'subscription_master',
      title: 'Maestro degli abbonamenti',
      description: 'Mantieni un abbonamento attivo per 6 mesi',
      type: 'maintain_subscription',
      category: 'subscription',
      points: 1500,
      requirements: {
        subscriptionDuration: 180 // days
      },
      icon: 'crown',
      difficulty: 'hard',
      estimatedTime: 0,
      active: true,
      featured: false,
      priority: 8,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },

    // Health & Care Missions
    {
      id: 'add_weight_record',
      title: 'Monitora il peso',
      description: 'Registra il peso del tuo cane',
      type: 'add_weight_record',
      category: 'health',
      points: 50,
      requirements: {
        weightRecords: 1
      },
      icon: 'weight',
      difficulty: 'easy',
      estimatedTime: 2,
      active: true,
      featured: false,
      priority: 9,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'weekly',
      maxCompletions: 52,
      createdAt: new Date()
    },
    {
      id: 'add_vaccination',
      title: 'Aggiorna le vaccinazioni',
      description: 'Registra una vaccinazione del tuo cane',
      type: 'add_vaccination',
      category: 'health',
      points: 100,
      requirements: {
        vaccinations: 1
      },
      icon: 'syringe',
      difficulty: 'easy',
      estimatedTime: 5,
      active: true,
      featured: false,
      priority: 10,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },
    {
      id: 'health_tracker',
      title: 'Monitoraggio della salute',
      description: 'Registra 10 record di salute (peso, visite, vaccini)',
      type: 'health_tracking',
      category: 'health',
      points: 800,
      requirements: {
        healthRecords: 10
      },
      icon: 'heart-pulse',
      difficulty: 'medium',
      estimatedTime: 0,
      active: true,
      featured: false,
      priority: 11,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },

    // Social & Engagement Missions
    {
      id: 'daily_check_in',
      title: 'Check-in giornaliero',
      description: 'Accedi all\'app per 7 giorni consecutivi',
      type: 'daily_check_in',
      category: 'engagement',
      points: 350,
      requirements: {
        consecutiveDays: 7
      },
      icon: 'calendar-check',
      difficulty: 'medium',
      estimatedTime: 1,
      active: true,
      featured: true,
      priority: 12,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'weekly',
      maxCompletions: 52,
      createdAt: new Date()
    },
    {
      id: 'chat_with_ai',
      title: 'Chiacchiera con l\'AI',
      description: 'Fai 5 domande all\'assistente AI',
      type: 'chat_with_ai',
      category: 'engagement',
      points: 200,
      requirements: {
        aiMessages: 5
      },
      icon: 'robot',
      difficulty: 'easy',
      estimatedTime: 10,
      active: true,
      featured: false,
      priority: 13,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'monthly',
      maxCompletions: 12,
      createdAt: new Date()
    },
    {
      id: 'leave_review',
      title: 'Lascia una recensione',
      description: 'Recensisci un prodotto acquistato',
      type: 'leave_review',
      category: 'engagement',
      points: 150,
      requirements: {
        reviews: 1
      },
      icon: 'star',
      difficulty: 'easy',
      estimatedTime: 5,
      active: true,
      featured: false,
      priority: 14,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'none',
      createdAt: new Date()
    },

    // Special Missions
    {
      id: 'refer_friend',
      title: 'Invita un amico',
      description: 'Invita un amico ad utilizzare PiùCane',
      type: 'refer_friend',
      category: 'social',
      points: 1000,
      requirements: {
        referrals: 1
      },
      icon: 'user-plus',
      difficulty: 'medium',
      estimatedTime: 0,
      active: true,
      featured: true,
      priority: 15,
      availableFrom: new Date('2024-01-01'),
      availableTo: null,
      repeatType: 'unlimited',
      createdAt: new Date()
    },
    {
      id: 'early_adopter',
      title: 'Early Adopter',
      description: 'Sei tra i primi 1000 utenti di PiùCane!',
      type: 'early_adopter',
      category: 'special',
      points: 2000,
      requirements: {
        userRank: 1000
      },
      icon: 'trophy',
      difficulty: 'special',
      estimatedTime: 0,
      active: true,
      featured: true,
      priority: 16,
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2024-12-31'),
      repeatType: 'none',
      createdAt: new Date()
    }
  ];

  const batch = db.batch();
  missions.forEach(mission => {
    const docRef = db.collection('missions').doc(mission.id);
    batch.set(docRef, mission);
  });

  await batch.commit();
  console.log(`✅ Seeded ${missions.length} missions`);
}

async function seedBadges() {
  console.log('🏆 Seeding badges...');

  const badges = [
    // Onboarding Badges
    {
      id: 'welcome_badge',
      name: 'Benvenuto',
      description: 'Hai completato la registrazione su PiùCane',
      icon: 'hand-wave',
      color: '#10B981',
      rarity: 'common',
      type: 'automatic',
      points: 50,
      requirements: {
        type: 'registration',
        value: 1
      },
      category: 'onboarding',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'profile_complete_badge',
      name: 'Profilo Completo',
      description: 'Hai completato il 100% del tuo profilo',
      icon: 'user-check',
      color: '#3B82F6',
      rarity: 'common',
      type: 'achievement',
      points: 100,
      requirements: {
        type: 'profile_completion',
        value: 100
      },
      category: 'onboarding',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'dog_lover_badge',
      name: 'Amante dei Cani',
      description: 'Hai aggiunto il tuo primo cane',
      icon: 'heart',
      color: '#EF4444',
      rarity: 'common',
      type: 'achievement',
      points: 100,
      requirements: {
        type: 'dogs_count',
        value: 1
      },
      category: 'onboarding',
      active: true,
      createdAt: new Date()
    },

    // Purchase Badges
    {
      id: 'first_buyer_badge',
      name: 'Primo Acquisto',
      description: 'Hai effettuato il tuo primo ordine',
      icon: 'shopping-bag',
      color: '#F59E0B',
      rarity: 'common',
      type: 'achievement',
      points: 200,
      requirements: {
        type: 'orders_count',
        value: 1
      },
      category: 'purchase',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'big_spender_badge',
      name: 'Grande Spesa',
      description: 'Hai speso più di €100 in un singolo ordine',
      icon: 'money-bill',
      color: '#059669',
      rarity: 'uncommon',
      type: 'achievement',
      points: 300,
      requirements: {
        type: 'single_order_amount',
        value: 100
      },
      category: 'purchase',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'loyal_customer_badge',
      name: 'Cliente Fedele',
      description: 'Hai effettuato 5 ordini',
      icon: 'medal',
      color: '#7C3AED',
      rarity: 'rare',
      type: 'achievement',
      points: 500,
      requirements: {
        type: 'orders_count',
        value: 5
      },
      category: 'purchase',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'vip_customer_badge',
      name: 'Cliente VIP',
      description: 'Hai speso più di €500 in totale',
      icon: 'crown',
      color: '#DC2626',
      rarity: 'epic',
      type: 'achievement',
      points: 1000,
      requirements: {
        type: 'total_spent',
        value: 500
      },
      category: 'purchase',
      active: true,
      createdAt: new Date()
    },

    // Subscription Badges
    {
      id: 'subscriber_badge',
      name: 'Abbonato',
      description: 'Hai attivato il tuo primo abbonamento',
      icon: 'refresh',
      color: '#0EA5E9',
      rarity: 'common',
      type: 'achievement',
      points: 300,
      requirements: {
        type: 'subscriptions_count',
        value: 1
      },
      category: 'subscription',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'subscription_master_badge',
      name: 'Maestro Abbonamenti',
      description: 'Hai mantenuto un abbonamento per 6 mesi',
      icon: 'calendar-star',
      color: '#8B5CF6',
      rarity: 'rare',
      type: 'achievement',
      points: 800,
      requirements: {
        type: 'subscription_duration',
        value: 180
      },
      category: 'subscription',
      active: true,
      createdAt: new Date()
    },

    // Health & Care Badges
    {
      id: 'health_monitor_badge',
      name: 'Monitor della Salute',
      description: 'Hai registrato 10 record di salute',
      icon: 'activity',
      color: '#EF4444',
      rarity: 'uncommon',
      type: 'achievement',
      points: 400,
      requirements: {
        type: 'health_records',
        value: 10
      },
      category: 'health',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'weight_tracker_badge',
      name: 'Tracker del Peso',
      description: 'Hai monitorato il peso per 4 settimane consecutive',
      icon: 'trending-up',
      color: '#10B981',
      rarity: 'uncommon',
      type: 'achievement',
      points: 300,
      requirements: {
        type: 'weight_tracking_streak',
        value: 4
      },
      category: 'health',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'vaccination_expert_badge',
      name: 'Esperto Vaccinazioni',
      description: 'Hai tenuto aggiornate tutte le vaccinazioni',
      icon: 'shield-check',
      color: '#059669',
      rarity: 'rare',
      type: 'achievement',
      points: 600,
      requirements: {
        type: 'vaccinations_up_to_date',
        value: 1
      },
      category: 'health',
      active: true,
      createdAt: new Date()
    },

    // Engagement Badges
    {
      id: 'daily_visitor_badge',
      name: 'Visitatore Giornaliero',
      description: 'Hai effettuato il check-in per 7 giorni consecutivi',
      icon: 'calendar-days',
      color: '#F59E0B',
      rarity: 'common',
      type: 'achievement',
      points: 200,
      requirements: {
        type: 'daily_streak',
        value: 7
      },
      category: 'engagement',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'ai_chatter_badge',
      name: 'Chiacchierone AI',
      description: 'Hai fatto 50 domande all\'assistente AI',
      icon: 'messages',
      color: '#6366F1',
      rarity: 'uncommon',
      type: 'achievement',
      points: 400,
      requirements: {
        type: 'ai_messages',
        value: 50
      },
      category: 'engagement',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'reviewer_badge',
      name: 'Recensore',
      description: 'Hai lasciato 5 recensioni prodotti',
      icon: 'star-half',
      color: '#F59E0B',
      rarity: 'uncommon',
      type: 'achievement',
      points: 350,
      requirements: {
        type: 'reviews_count',
        value: 5
      },
      category: 'engagement',
      active: true,
      createdAt: new Date()
    },

    // Social Badges
    {
      id: 'referrer_badge',
      name: 'Ambasciatore',
      description: 'Hai invitato 3 amici su PiùCane',
      icon: 'users',
      color: '#8B5CF6',
      rarity: 'rare',
      type: 'achievement',
      points: 1000,
      requirements: {
        type: 'referrals_count',
        value: 3
      },
      category: 'social',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'influencer_badge',
      name: 'Influencer',
      description: 'Hai invitato 10 amici su PiùCane',
      icon: 'megaphone',
      color: '#DC2626',
      rarity: 'epic',
      type: 'achievement',
      points: 2000,
      requirements: {
        type: 'referrals_count',
        value: 10
      },
      category: 'social',
      active: true,
      createdAt: new Date()
    },

    // Special Badges
    {
      id: 'early_adopter_badge',
      name: 'Early Adopter',
      description: 'Sei tra i primi 1000 utenti di PiùCane',
      icon: 'rocket',
      color: '#DC2626',
      rarity: 'legendary',
      type: 'special',
      points: 2500,
      requirements: {
        type: 'user_rank',
        value: 1000
      },
      category: 'special',
      active: true,
      limitedTime: true,
      availableUntil: new Date('2024-12-31'),
      createdAt: new Date()
    },
    {
      id: 'beta_tester_badge',
      name: 'Beta Tester',
      description: 'Hai testato PiùCane durante la fase beta',
      icon: 'flask',
      color: '#059669',
      rarity: 'legendary',
      type: 'special',
      points: 3000,
      requirements: {
        type: 'beta_participation',
        value: 1
      },
      category: 'special',
      active: true,
      limitedTime: true,
      availableUntil: new Date('2024-06-30'),
      createdAt: new Date()
    },

    // Level Badges
    {
      id: 'level_5_badge',
      name: 'Livello 5',
      description: 'Hai raggiunto il livello 5',
      icon: 'chevron-up',
      color: '#6B7280',
      rarity: 'common',
      type: 'level',
      points: 0,
      requirements: {
        type: 'level',
        value: 5
      },
      category: 'level',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'level_10_badge',
      name: 'Livello 10',
      description: 'Hai raggiunto il livello 10',
      icon: 'chevron-double-up',
      color: '#059669',
      rarity: 'uncommon',
      type: 'level',
      points: 0,
      requirements: {
        type: 'level',
        value: 10
      },
      category: 'level',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'level_25_badge',
      name: 'Livello 25',
      description: 'Hai raggiunto il livello 25',
      icon: 'star',
      color: '#F59E0B',
      rarity: 'rare',
      type: 'level',
      points: 0,
      requirements: {
        type: 'level',
        value: 25
      },
      category: 'level',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'level_50_badge',
      name: 'Livello 50',
      description: 'Hai raggiunto il livello 50',
      icon: 'crown',
      color: '#8B5CF6',
      rarity: 'epic',
      type: 'level',
      points: 0,
      requirements: {
        type: 'level',
        value: 50
      },
      category: 'level',
      active: true,
      createdAt: new Date()
    },
    {
      id: 'level_100_badge',
      name: 'Livello 100',
      description: 'Hai raggiunto il livello 100 - Master PiùCane!',
      icon: 'trophy',
      color: '#DC2626',
      rarity: 'legendary',
      type: 'level',
      points: 0,
      requirements: {
        type: 'level',
        value: 100
      },
      category: 'level',
      active: true,
      createdAt: new Date()
    }
  ];

  const batch = db.batch();
  badges.forEach(badge => {
    const docRef = db.collection('badges').doc(badge.id);
    batch.set(docRef, badge);
  });

  await batch.commit();
  console.log(`✅ Seeded ${badges.length} badges`);
}

async function seedRewards() {
  console.log('🎁 Seeding rewards...');

  const rewards = [
    // Digital Rewards
    {
      id: 'free_shipping_coupon',
      name: 'Spedizione Gratuita',
      description: 'Coupon per spedizione gratuita sul prossimo ordine',
      type: 'digital',
      category: 'coupon',
      pointsCost: 500,
      value: 5.99,
      icon: 'truck',
      image: '/images/rewards/free-shipping.png',
      active: true,
      featured: true,
      maxRedemptions: 1,
      validityDays: 30,
      terms: 'Valido per ordini superiori a €25. Non cumulabile con altre offerte.',
      createdAt: new Date()
    },
    {
      id: 'discount_5_percent',
      name: 'Sconto 5%',
      description: 'Sconto del 5% sul prossimo ordine',
      type: 'digital',
      category: 'discount',
      pointsCost: 750,
      value: 0,
      discountPercentage: 5,
      icon: 'percent',
      image: '/images/rewards/discount-5.png',
      active: true,
      featured: true,
      maxRedemptions: 3,
      validityDays: 60,
      terms: 'Valido per ordini superiori a €50. Non cumulabile con altre offerte.',
      createdAt: new Date()
    },
    {
      id: 'discount_10_percent',
      name: 'Sconto 10%',
      description: 'Sconto del 10% sul prossimo ordine',
      type: 'digital',
      category: 'discount',
      pointsCost: 1500,
      value: 0,
      discountPercentage: 10,
      icon: 'percent',
      image: '/images/rewards/discount-10.png',
      active: true,
      featured: true,
      maxRedemptions: 2,
      validityDays: 60,
      terms: 'Valido per ordini superiori a €75. Non cumulabile con altre offerte.',
      createdAt: new Date()
    },
    {
      id: 'discount_15_percent',
      name: 'Sconto 15%',
      description: 'Sconto del 15% sul prossimo ordine',
      type: 'digital',
      category: 'discount',
      pointsCost: 3000,
      value: 0,
      discountPercentage: 15,
      icon: 'percent',
      image: '/images/rewards/discount-15.png',
      active: true,
      featured: true,
      maxRedemptions: 1,
      validityDays: 90,
      terms: 'Valido per ordini superiori a €100. Non cumulabile con altre offerte.',
      createdAt: new Date()
    },

    // Physical Rewards
    {
      id: 'dog_toy_squeaky',
      name: 'Giocattolo Squeaky',
      description: 'Simpatico giocattolo squeaky per il tuo cane',
      type: 'physical',
      category: 'toy',
      pointsCost: 2000,
      value: 12.99,
      icon: 'gift',
      image: '/images/rewards/squeaky-toy.jpg',
      active: true,
      featured: false,
      maxRedemptions: 2,
      shippingRequired: true,
      stock: 100,
      estimatedDelivery: '3-5 giorni lavorativi',
      dimensions: '15x8x8 cm',
      weight: '150g',
      createdAt: new Date()
    },
    {
      id: 'dog_treats_sample',
      name: 'Campione Snack',
      description: 'Confezione campione di snack premium per cani',
      type: 'physical',
      category: 'treat',
      pointsCost: 1200,
      value: 8.99,
      icon: 'cookie',
      image: '/images/rewards/treat-sample.jpg',
      active: true,
      featured: true,
      maxRedemptions: 3,
      shippingRequired: true,
      stock: 200,
      estimatedDelivery: '3-5 giorni lavorativi',
      expiryDate: new Date('2025-12-31'),
      createdAt: new Date()
    },
    {
      id: 'piucane_tshirt',
      name: 'T-shirt PiùCane',
      description: 'T-shirt ufficiale PiùCane in cotone biologico',
      type: 'physical',
      category: 'merchandise',
      pointsCost: 4500,
      value: 24.99,
      icon: 'shirt',
      image: '/images/rewards/tshirt.jpg',
      active: true,
      featured: false,
      maxRedemptions: 1,
      shippingRequired: true,
      stock: 50,
      estimatedDelivery: '5-7 giorni lavorativi',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Bianco', 'Nero', 'Blu'],
      createdAt: new Date()
    },
    {
      id: 'dog_leash_premium',
      name: 'Guinzaglio Premium',
      description: 'Guinzaglio in nylon resistente con riflettenti',
      type: 'physical',
      category: 'accessory',
      pointsCost: 3500,
      value: 19.99,
      icon: 'link',
      image: '/images/rewards/premium-leash.jpg',
      active: true,
      featured: true,
      maxRedemptions: 1,
      shippingRequired: true,
      stock: 75,
      estimatedDelivery: '3-5 giorni lavorativi',
      colors: ['Rosso', 'Blu', 'Verde', 'Nero'],
      lengths: ['120cm', '150cm', '180cm'],
      createdAt: new Date()
    },

    // Experience Rewards
    {
      id: 'vet_consultation',
      name: 'Consulto Veterinario',
      description: 'Consulto telefonico gratuito con veterinario partner',
      type: 'experience',
      category: 'consultation',
      pointsCost: 5000,
      value: 35.00,
      icon: 'stethoscope',
      image: '/images/rewards/vet-consultation.jpg',
      active: true,
      featured: true,
      maxRedemptions: 2,
      validityDays: 90,
      bookingRequired: true,
      duration: '30 minuti',
      availability: 'Lun-Ven 9:00-18:00',
      createdAt: new Date()
    },
    {
      id: 'nutrition_consultation',
      name: 'Consulto Nutrizionale',
      description: 'Consulenza personalizzata sull\'alimentazione del tuo cane',
      type: 'experience',
      category: 'consultation',
      pointsCost: 4000,
      value: 25.00,
      icon: 'apple',
      image: '/images/rewards/nutrition-consultation.jpg',
      active: true,
      featured: false,
      maxRedemptions: 1,
      validityDays: 60,
      bookingRequired: true,
      duration: '45 minuti',
      availability: 'Lun-Ven 10:00-17:00',
      createdAt: new Date()
    },
    {
      id: 'dog_training_session',
      name: 'Sessione di Training',
      description: 'Sessione di addestramento online con educatore cinofilo',
      type: 'experience',
      category: 'training',
      pointsCost: 6000,
      value: 45.00,
      icon: 'graduation-cap',
      image: '/images/rewards/dog-training.jpg',
      active: true,
      featured: true,
      maxRedemptions: 1,
      validityDays: 120,
      bookingRequired: true,
      duration: '60 minuti',
      availability: 'Lun-Sab 9:00-19:00',
      prerequisites: 'Cane di età superiore a 4 mesi',
      createdAt: new Date()
    },

    // Subscription Rewards
    {
      id: 'subscription_discount_month',
      name: 'Mese Gratis Abbonamento',
      description: 'Un mese gratuito sul tuo abbonamento attivo',
      type: 'subscription',
      category: 'discount',
      pointsCost: 8000,
      value: 30.00,
      icon: 'calendar-plus',
      image: '/images/rewards/free-month.png',
      active: true,
      featured: true,
      maxRedemptions: 1,
      validityDays: 180,
      requirements: 'Abbonamento attivo richiesto',
      terms: 'Applicabile solo su abbonamenti mensili attivi',
      createdAt: new Date()
    },
    {
      id: 'subscription_upgrade',
      name: 'Upgrade Abbonamento',
      description: 'Passa al piano superiore per 3 mesi senza costi aggiuntivi',
      type: 'subscription',
      category: 'upgrade',
      pointsCost: 12000,
      value: 45.00,
      icon: 'arrow-up-circle',
      image: '/images/rewards/subscription-upgrade.png',
      active: true,
      featured: false,
      maxRedemptions: 1,
      validityDays: 90,
      requirements: 'Abbonamento base attivo richiesto',
      terms: 'Valido per upgrade da Basic a Premium',
      createdAt: new Date()
    },

    // Special Limited Rewards
    {
      id: 'exclusive_dog_bowl',
      name: 'Ciotola Esclusiva PiùCane',
      description: 'Ciotola in ceramica con logo PiùCane - Edizione Limitata',
      type: 'physical',
      category: 'merchandise',
      pointsCost: 7500,
      value: 39.99,
      icon: 'bowl-food',
      image: '/images/rewards/exclusive-bowl.jpg',
      active: true,
      featured: true,
      maxRedemptions: 1,
      shippingRequired: true,
      stock: 25,
      estimatedDelivery: '7-10 giorni lavorativi',
      limited: true,
      limitedQuantity: 100,
      specialEdition: true,
      createdAt: new Date()
    },
    {
      id: 'vip_customer_package',
      name: 'Pacchetto Cliente VIP',
      description: 'Kit esclusivo con prodotti premium e gadget PiùCane',
      type: 'physical',
      category: 'package',
      pointsCost: 15000,
      value: 99.99,
      icon: 'gift-box',
      image: '/images/rewards/vip-package.jpg',
      active: true,
      featured: true,
      maxRedemptions: 1,
      shippingRequired: true,
      stock: 10,
      estimatedDelivery: '7-14 giorni lavorativi',
      limited: true,
      limitedQuantity: 50,
      specialEdition: true,
      contents: [
        'Ciotola ceramica personalizzata',
        'Guinzaglio premium',
        'Set snack gourmet',
        'T-shirt PiùCane',
        'Giocattolo esclusivo',
        'Buono sconto 20%'
      ],
      createdAt: new Date()
    }
  ];

  const batch = db.batch();
  rewards.forEach(reward => {
    const docRef = db.collection('rewards').doc(reward.id);
    batch.set(docRef, reward);
  });

  await batch.commit();
  console.log(`✅ Seeded ${rewards.length} rewards`);
}

// Run the seeding
seedGamificationData();
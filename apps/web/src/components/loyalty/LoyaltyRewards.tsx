'use client'

/**
 * Sistema di Fedeltà e Ricompense PiùCane
 * Programma fedeltà completo con punti, livelli e ricompense
 */

import React, { useState, useEffect } from 'react'
import { Gift, Star, Crown, Zap, Heart, Trophy, ArrowRight, Share2, Calendar, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { trackCTA } from '@/analytics/ga4'

interface LoyaltyProfile {
  userId: string
  points: number
  level: number
  levelName: string
  nextLevelPoints: number
  pointsToNextLevel: number
  totalEarned: number
  totalRedeemed: number
  joinDate: string
  benefits: string[]
}

interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  type: 'discount' | 'product' | 'service' | 'experience'
  value: number
  image: string
  category: string
  available: boolean
  featured: boolean
  expiryDate?: string
  termsAndConditions: string[]
}

interface LoyaltyActivity {
  id: string
  type: 'earned' | 'redeemed'
  points: number
  description: string
  date: string
  orderId?: string
  rewardId?: string
}

interface LoyaltyRewardsProps {
  userId: string
}

export function LoyaltyRewards({ userId }: LoyaltyRewardsProps) {
  const [profile, setProfile] = useState<LoyaltyProfile | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [activities, setActivities] = useState<LoyaltyActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    loadLoyaltyData()
  }, [userId])

  const loadLoyaltyData = async () => {
    try {
      // Simula caricamento dati fedeltà
      const mockProfile: LoyaltyProfile = {
        userId,
        points: 2847,
        level: 3,
        levelName: 'Gold',
        nextLevelPoints: 5000,
        pointsToNextLevel: 2153,
        totalEarned: 3500,
        totalRedeemed: 653,
        joinDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        benefits: [
          'Spedizione gratuita sempre',
          'Sconto 15% su tutti i prodotti',
          'Accesso anticipato alle novità',
          'Supporto prioritario',
          'Regalo di compleanno per il cane'
        ]
      }

      const mockRewards: Reward[] = [
        {
          id: 'discount-10',
          name: 'Sconto 10%',
          description: 'Sconto del 10% sul prossimo ordine',
          pointsCost: 500,
          type: 'discount',
          value: 10,
          image: '/rewards/discount-10.jpg',
          category: 'discounts',
          available: true,
          featured: true,
          termsAndConditions: [
            'Valido per 30 giorni dall\'attivazione',
            'Non cumulabile con altre promozioni',
            'Ordine minimo €30'
          ]
        },
        {
          id: 'product-treats',
          name: 'Snack Premium Gratis',
          description: 'Confezione di snack premium PiùCane',
          pointsCost: 800,
          type: 'product',
          value: 12.50,
          image: '/rewards/premium-treats.jpg',
          category: 'products',
          available: true,
          featured: false,
          termsAndConditions: [
            'Prodotto spedito con il prossimo ordine',
            'Soggetto a disponibilità'
          ]
        },
        {
          id: 'consultation',
          name: 'Consulenza Veterinaria',
          description: 'Consultazione gratuita con il nostro veterinario',
          pointsCost: 1200,
          type: 'service',
          value: 45,
          image: '/rewards/vet-consultation.jpg',
          category: 'services',
          available: true,
          featured: true,
          termsAndConditions: [
            'Consultazione di 30 minuti',
            'Disponibile in videochiamata',
            'Prenotazione obbligatoria'
          ]
        },
        {
          id: 'experience-training',
          name: 'Sessione di Addestramento',
          description: 'Sessione personalizzata con addestratore professionista',
          pointsCost: 2000,
          type: 'experience',
          value: 80,
          image: '/rewards/dog-training.jpg',
          category: 'experiences',
          available: true,
          featured: false,
          termsAndConditions: [
            'Sessione di 1 ora',
            'Disponibile nelle principali città',
            'Prenotazione con almeno 7 giorni di anticipo'
          ]
        },
        {
          id: 'product-premium-food',
          name: 'Cibo Premium 2kg',
          description: 'Confezione da 2kg di cibo premium PiùCane',
          pointsCost: 1500,
          type: 'product',
          value: 35,
          image: '/rewards/premium-food.jpg',
          category: 'products',
          available: false,
          featured: false,
          termsAndConditions: [
            'Prodotto attualmente non disponibile',
            'Riceverai una notifica quando sarà disponibile'
          ]
        }
      ]

      const mockActivities: LoyaltyActivity[] = [
        {
          id: '1',
          type: 'earned',
          points: 150,
          description: 'Punti per ordine #ORD-001',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          orderId: 'ORD-001'
        },
        {
          id: '2',
          type: 'earned',
          points: 100,
          description: 'Bonus recensione prodotto',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'redeemed',
          points: -500,
          description: 'Riscattato: Sconto 10%',
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          rewardId: 'discount-10'
        },
        {
          id: '4',
          type: 'earned',
          points: 200,
          description: 'Punti per ordine #ORD-002',
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          orderId: 'ORD-002'
        }
      ]

      setProfile(mockProfile)
      setRewards(mockRewards)
      setActivities(mockActivities)

      trackCTA({
        ctaId: 'loyalty.dashboard.viewed',
        event: 'loyalty_dashboard_viewed',
        value: 'dashboard_loaded',
        metadata: { userId, points: mockProfile.points, level: mockProfile.level }
      })

    } catch (error) {
      console.error('Errore nel caricamento dati fedeltà:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const redeemReward = async (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId)
    if (!reward || !profile || profile.points < reward.pointsCost || !reward.available) return

    trackCTA({
      ctaId: 'loyalty.reward.redeemed',
      event: 'reward_redeemed',
      value: rewardId,
      metadata: { userId, rewardId, pointsCost: reward.pointsCost }
    })

    // Aggiorna profilo
    setProfile(prev => prev ? {
      ...prev,
      points: prev.points - reward.pointsCost,
      totalRedeemed: prev.totalRedeemed + reward.pointsCost
    } : null)

    // Aggiungi attività
    const newActivity: LoyaltyActivity = {
      id: Date.now().toString(),
      type: 'redeemed',
      points: -reward.pointsCost,
      description: `Riscattato: ${reward.name}`,
      date: new Date().toISOString(),
      rewardId
    }

    setActivities(prev => [newActivity, ...prev])

    alert(`Ricompensa "${reward.name}" riscattata con successo!`)
  }

  const shareLoyaltyStatus = async () => {
    if (!profile) return

    trackCTA({
      ctaId: 'loyalty.status.shared',
      event: 'loyalty_status_shared',
      value: 'social_share',
      metadata: { userId, level: profile.level, points: profile.points }
    })

    const shareText = `Sono livello ${profile.levelName} nel programma fedeltà PiùCane! 🏆 Il mio cane e io adoriamo i loro prodotti premium! 🐕❤️`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PiùCane Loyalty Program',
          text: shareText,
          url: window.location.origin
        })
      } catch (error) {
        navigator.clipboard.writeText(shareText + ' ' + window.location.origin)
        alert('Testo copiato negli appunti!')
      }
    }
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-gray-600'
      case 2: return 'text-yellow-600'
      case 3: return 'text-yellow-500'
      case 4: return 'text-purple-600'
      case 5: return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1: return <Star className="h-5 w-5" />
      case 2: return <Heart className="h-5 w-5" />
      case 3: return <Crown className="h-5 w-5" />
      case 4: return <Trophy className="h-5 w-5" />
      case 5: return <Zap className="h-5 w-5" />
      default: return <Star className="h-5 w-5" />
    }
  }

  const filteredRewards = rewards.filter(reward => {
    if (selectedCategory === 'all') return true
    return reward.category === selectedCategory
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Programma Fedeltà</h3>
          <p className="text-gray-600 mb-4">Effettua il tuo primo ordine per iniziare a guadagnare punti!</p>
          <Button onClick={() => window.location.href = '/shop'}>
            Inizia a fare shopping
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Programma Fedeltà</h1>
        <p className="text-gray-600">Guadagna punti, sblocca ricompense e goditi vantaggi esclusivi</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Panoramica', icon: Star },
            { id: 'rewards', label: 'Ricompense', icon: Gift },
            { id: 'activity', label: 'Attività', icon: Calendar }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-piucane-primary text-piucane-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Profile Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className={`inline-flex items-center gap-2 mb-4 ${getLevelColor(profile.level)}`}>
                  {getLevelIcon(profile.level)}
                  <span className="text-2xl font-bold">{profile.levelName}</span>
                </div>
                <p className="text-sm text-gray-600">Livello {profile.level}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-piucane-primary mb-2">
                  {profile.points.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Punti disponibili</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {profile.pointsToNextLevel.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Al prossimo livello</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress to Next Level */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso verso il prossimo livello</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Livello {profile.level} - {profile.levelName}</span>
                  <span>Livello {profile.level + 1}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-piucane-primary h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${((profile.nextLevelPoints - profile.pointsToNextLevel) / profile.nextLevelPoints) * 100}%`
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {profile.pointsToNextLevel.toLocaleString()} punti al prossimo livello
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>I tuoi vantaggi attuali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-piucane-primary rounded-full"></div>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button onClick={shareLoyaltyStatus} variant="outline" className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Condividi il tuo status
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Continua a guadagnare</h3>
                    <p className="text-sm text-gray-600">10 punti per ogni euro speso</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => window.location.href = '/shop'}
                  >
                    Shop
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Gift className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Riscatta ricompense</h3>
                    <p className="text-sm text-gray-600">Usa i tuoi punti</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedTab('rewards')}
                  >
                    Riscatta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedTab === 'rewards' && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tutte' },
              { id: 'discounts', label: 'Sconti' },
              { id: 'products', label: 'Prodotti' },
              { id: 'services', label: 'Servizi' },
              { id: 'experiences', label: 'Esperienze' }
            ].map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-piucane-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map(reward => (
              <Card
                key={reward.id}
                className={`relative overflow-hidden ${
                  !reward.available ? 'opacity-60' : ''
                } ${reward.featured ? 'ring-2 ring-piucane-primary' : ''}`}
              >
                {reward.featured && (
                  <div className="absolute top-0 right-0 bg-piucane-primary text-white text-xs px-2 py-1 rounded-bl">
                    In evidenza
                  </div>
                )}

                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={reward.image}
                    alt={reward.name}
                    className="w-full h-32 object-cover"
                  />
                </div>

                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-medium text-gray-900 mb-1">{reward.name}</h3>
                    <p className="text-sm text-gray-600">{reward.description}</p>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-piucane-primary">
                        {reward.pointsCost.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-600">punti</span>
                    </div>

                    {reward.type === 'discount' && (
                      <span className="text-sm text-green-600 font-medium">
                        {reward.value}% OFF
                      </span>
                    )}

                    {reward.type === 'product' && (
                      <span className="text-sm text-gray-600">
                        €{reward.value.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => redeemReward(reward.id)}
                    disabled={!reward.available || profile.points < reward.pointsCost}
                    className="w-full"
                    size="sm"
                  >
                    {!reward.available ? 'Non disponibile' :
                     profile.points < reward.pointsCost ? 'Punti insufficienti' :
                     'Riscatta'}
                  </Button>

                  {/* Terms Preview */}
                  {reward.termsAndConditions.length > 0 && (
                    <div className="mt-3 text-xs text-gray-500">
                      <details>
                        <summary className="cursor-pointer hover:text-gray-700">
                          Termini e condizioni
                        </summary>
                        <div className="mt-2 space-y-1">
                          {reward.termsAndConditions.map((term, index) => (
                            <div key={index}>• {term}</div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRewards.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna ricompensa trovata
                </h3>
                <p className="text-gray-600">
                  Prova a cambiare categoria o guadagna più punti per sbloccare nuove ricompense
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {selectedTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Cronologia Attività</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nessuna attività registrata</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {activity.type === 'earned' ? (
                          <ArrowRight className="h-4 w-4 text-green-600 rotate-180" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.description}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(activity.date).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className={`text-lg font-medium ${
                      activity.type === 'earned' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {activity.type === 'earned' ? '+' : ''}{activity.points}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
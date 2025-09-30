'use client'

/**
 * SubscriptionManager - Main subscription dashboard component
 * Features: Active subscriptions overview, quick actions, analytics, next deliveries
 */

import React, { useState, useEffect } from 'react'
import { Plus, Calendar, Package, Pause, Play, Settings, TrendingUp, Clock, AlertCircle, CheckCircle, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trackCTA } from '@/analytics/ga4'
import { SubscriptionCard } from './SubscriptionCard'
import { CreateSubscriptionModal } from './CreateSubscriptionModal'

interface Dog {
  id: string
  name: string
  breed: string
  weight: number
  age: number
  allergies: string[]
  specialNeeds: string[]
  activityLevel: 'low' | 'medium' | 'high'
}

interface Subscription {
  id: string
  dogId: string
  productId: string
  productName: string
  productBrand: string
  productImage: string
  formatId: string
  formatSize: string
  quantity: number
  frequency: number // weeks
  status: 'active' | 'paused' | 'cancelled'
  nextDelivery: string
  price: number
  originalPrice: number
  savings: number
  createdAt: string
  lastDelivery?: string
  totalDeliveries: number
  isCustomizable: boolean
  autoAdjust: boolean
  personalizedDosage?: {
    dailyAmount: number
    adjustmentHistory: Array<{
      date: string
      oldAmount: number
      newAmount: number
      reason: string
    }>
  }
}

interface SubscriptionManagerProps {
  userId: string
  dogs: Dog[]
  className?: string
}

export function SubscriptionManager({
  userId,
  dogs,
  className = ''
}: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all')
  const [sortBy, setSortBy] = useState<'nextDelivery' | 'created' | 'name'>('nextDelivery')

  useEffect(() => {
    loadSubscriptions()
    trackCTA({
      ctaId: 'subscriptions.dashboard.viewed',
      event: 'page_view',
      metadata: { userId, dogCount: dogs.length }
    })
  }, [userId])

  const loadSubscriptions = async () => {
    setLoading(true)
    try {
      // Mock data - in real app would fetch from API
      const mockSubscriptions: Subscription[] = [
        {
          id: 'sub-1',
          dogId: dogs[0]?.id || 'dog-1',
          productId: 'piucane-adult-chicken-rice-12kg',
          productName: 'PiùCane Adult Pollo e Riso',
          productBrand: 'PiùCane',
          productImage: '/products/piucane-adult-chicken-rice-main.jpg',
          formatId: 'piucane-adult-chicken-rice-12kg',
          formatSize: '12kg',
          quantity: 1,
          frequency: 6,
          status: 'active',
          nextDelivery: '2024-02-15',
          price: 40.79,
          originalPrice: 47.99,
          savings: 7.20,
          createdAt: '2024-01-01',
          lastDelivery: '2024-01-04',
          totalDeliveries: 3,
          isCustomizable: true,
          autoAdjust: true,
          personalizedDosage: {
            dailyAmount: 280,
            adjustmentHistory: [
              {
                date: '2024-01-15',
                oldAmount: 300,
                newAmount: 280,
                reason: 'Ridotto livello di attività'
              }
            ]
          }
        },
        {
          id: 'sub-2',
          dogId: dogs[0]?.id || 'dog-1',
          productId: 'piucane-treats-dental',
          productName: 'Snack Dental Care Menta',
          productBrand: 'DentaDog',
          productImage: '/products/treats-dental.jpg',
          formatId: 'dental-treats-200g',
          formatSize: '200g',
          quantity: 2,
          frequency: 4,
          status: 'active',
          nextDelivery: '2024-02-08',
          price: 21.26,
          originalPrice: 25.00,
          savings: 3.74,
          createdAt: '2024-01-15',
          totalDeliveries: 1,
          isCustomizable: false,
          autoAdjust: false
        },
        {
          id: 'sub-3',
          dogId: dogs[1]?.id || 'dog-2',
          productId: 'piucane-puppy-chicken-rice-3kg',
          productName: 'PiùCane Puppy Pollo e Riso',
          productBrand: 'PiùCane',
          productImage: '/products/piucane-puppy-chicken-rice-main.jpg',
          formatId: 'piucane-puppy-chicken-rice-3kg',
          formatSize: '3kg',
          quantity: 1,
          frequency: 3,
          status: 'paused',
          nextDelivery: '2024-02-20',
          price: 18.69,
          originalPrice: 21.99,
          savings: 3.30,
          createdAt: '2024-01-20',
          totalDeliveries: 2,
          isCustomizable: true,
          autoAdjust: true
        }
      ]

      setSubscriptions(mockSubscriptions)
    } catch (error) {
      console.error('Error loading subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubscription = (dogId: string) => {
    const dog = dogs.find(d => d.id === dogId)
    setSelectedDog(dog || null)
    setShowCreateModal(true)

    trackCTA({
      ctaId: 'subscriptions.create.initiated',
      event: 'subscription_create_start',
      metadata: { dogId, source: 'dashboard' }
    })
  }

  const handleSubscriptionUpdate = async (subscriptionId: string, updates: Partial<Subscription>) => {
    try {
      setSubscriptions(current =>
        current.map(sub =>
          sub.id === subscriptionId ? { ...sub, ...updates } : sub
        )
      )

      trackCTA({
        ctaId: 'subscriptions.updated',
        event: 'subscription_modified',
        value: subscriptionId,
        metadata: { updates: Object.keys(updates) }
      })
    } catch (error) {
      console.error('Error updating subscription:', error)
    }
  }

  const handleBulkAction = async (action: 'pause' | 'resume' | 'cancel', subscriptionIds: string[]) => {
    try {
      const updates: Partial<Subscription> = {}

      switch (action) {
        case 'pause':
          updates.status = 'paused'
          break
        case 'resume':
          updates.status = 'active'
          break
        case 'cancel':
          updates.status = 'cancelled'
          break
      }

      setSubscriptions(current =>
        current.map(sub =>
          subscriptionIds.includes(sub.id) ? { ...sub, ...updates } : sub
        )
      )

      trackCTA({
        ctaId: 'subscriptions.bulk_action',
        event: 'subscription_bulk_update',
        value: action,
        metadata: { count: subscriptionIds.length }
      })
    } catch (error) {
      console.error('Error performing bulk action:', error)
    }
  }

  const getFilteredSubscriptions = () => {
    let filtered = subscriptions

    if (filter !== 'all') {
      filtered = filtered.filter(sub => sub.status === filter)
    }

    // Sort subscriptions
    switch (sortBy) {
      case 'nextDelivery':
        filtered.sort((a, b) => new Date(a.nextDelivery).getTime() - new Date(b.nextDelivery).getTime())
        break
      case 'created':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'name':
        filtered.sort((a, b) => a.productName.localeCompare(b.productName))
        break
    }

    return filtered
  }

  const getSubscriptionStats = () => {
    const active = subscriptions.filter(sub => sub.status === 'active').length
    const paused = subscriptions.filter(sub => sub.status === 'paused').length
    const totalSavings = subscriptions.reduce((sum, sub) => sum + (sub.savings * sub.totalDeliveries), 0)
    const monthlyValue = subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + (sub.price * (4 / sub.frequency)), 0) // Approximate monthly value

    const nextDeliveries = subscriptions
      .filter(sub => sub.status === 'active')
      .sort((a, b) => new Date(a.nextDelivery).getTime() - new Date(b.nextDelivery).getTime())
      .slice(0, 3)

    return { active, paused, totalSavings, monthlyValue, nextDeliveries }
  }

  const filteredSubscriptions = getFilteredSubscriptions()
  const stats = getSubscriptionStats()

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">I tuoi abbonamenti</h1>
          <p className="text-gray-600 mt-1">
            Gestisci le consegne automatiche per i tuoi cani
          </p>
        </div>

        <Button
          onClick={() => handleCreateSubscription(dogs[0]?.id || '')}
          className="whitespace-nowrap"
          data-cta-id="subscriptions.create"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo abbonamento
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Abbonamenti attivi</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In pausa</p>
                <p className="text-3xl font-bold text-orange-600">{stats.paused}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Pause className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Risparmi totali</p>
                <p className="text-3xl font-bold text-blue-600">€{stats.totalSavings.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valore mensile</p>
                <p className="text-3xl font-bold text-purple-600">€{stats.monthlyValue.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Deliveries */}
      {stats.nextDeliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Prossime consegne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.nextDeliveries.map(subscription => {
                const daysUntil = Math.ceil((new Date(subscription.nextDelivery).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                const dog = dogs.find(d => d.id === subscription.dogId)

                return (
                  <div key={subscription.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={subscription.productImage}
                        alt={subscription.productName}
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{subscription.productName}</p>
                        <p className="text-sm text-gray-600">
                          Per {dog?.name} • {subscription.formatSize}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(subscription.nextDelivery).toLocaleDateString('it-IT')}
                      </p>
                      <p className={`text-xs ${
                        daysUntil <= 3 ? 'text-orange-600' :
                        daysUntil <= 7 ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {daysUntil <= 0 ? 'Oggi' :
                         daysUntil === 1 ? 'Domani' :
                         `Tra ${daysUntil} giorni`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Status Filter */}
              <div className="flex gap-1">
                {[
                  { value: 'all', label: 'Tutti', count: subscriptions.length },
                  { value: 'active', label: 'Attivi', count: stats.active },
                  { value: 'paused', label: 'In pausa', count: stats.paused },
                  { value: 'cancelled', label: 'Cancellati', count: subscriptions.filter(s => s.status === 'cancelled').length }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={filter === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(option.value as any)}
                    className="relative"
                  >
                    {option.label}
                    {option.count > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                        {option.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="nextDelivery">Prossima consegna</option>
                <option value="created">Data creazione</option>
                <option value="name">Nome prodotto</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'Nessun abbonamento' : `Nessun abbonamento ${filter}`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all'
                ? 'Crea il tuo primo abbonamento per ricevere automaticamente i prodotti per i tuoi cani.'
                : 'Non ci sono abbonamenti con questo stato.'}
            </p>
            {filter === 'all' && (
              <Button
                onClick={() => handleCreateSubscription(dogs[0]?.id || '')}
                data-cta-id="subscriptions.create.empty_state"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea abbonamento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubscriptions.map(subscription => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              dog={dogs.find(d => d.id === subscription.dogId)}
              onUpdate={(updates) => handleSubscriptionUpdate(subscription.id, updates)}
              onDelete={() => handleSubscriptionUpdate(subscription.id, { status: 'cancelled' })}
            />
          ))}
        </div>
      )}

      {/* Create Subscription Modal */}
      <CreateSubscriptionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        selectedDog={selectedDog}
        dogs={dogs}
        onSubscriptionCreated={(newSubscription) => {
          setSubscriptions(current => [...current, newSubscription])
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}
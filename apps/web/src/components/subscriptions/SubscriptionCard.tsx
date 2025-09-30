'use client'

/**
 * SubscriptionCard - Individual subscription display component
 * Features: Status indicators, quick actions, delivery info, dosage tracking
 */

import React, { useState } from 'react'
import { Calendar, Package, Pause, Play, Edit, Trash2, Clock, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Settings, Truck, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal, ConfirmationModal } from '@/components/ui/modal'
import { trackCTA } from '@/analytics/ga4'
import { SubscriptionEditModal } from './SubscriptionEditModal'

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

interface SubscriptionCardProps {
  subscription: Subscription
  dog?: Dog
  onUpdate: (updates: Partial<Subscription>) => void
  onDelete: () => void
  className?: string
}

export function SubscriptionCard({
  subscription,
  dog,
  onUpdate,
  onDelete,
  className = ''
}: SubscriptionCardProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const getStatusInfo = () => {
    switch (subscription.status) {
      case 'active':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: CheckCircle,
          label: 'Attivo'
        }
      case 'paused':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          icon: Pause,
          label: 'In pausa'
        }
      case 'cancelled':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: AlertTriangle,
          label: 'Cancellato'
        }
    }
  }

  const getNextDeliveryInfo = () => {
    if (subscription.status !== 'active') return null

    const nextDate = new Date(subscription.nextDelivery)
    const today = new Date()
    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let urgency: 'normal' | 'soon' | 'urgent' = 'normal'
    let message = ''

    if (daysUntil <= 0) {
      urgency = 'urgent'
      message = 'Consegna prevista oggi'
    } else if (daysUntil === 1) {
      urgency = 'urgent'
      message = 'Consegna domani'
    } else if (daysUntil <= 3) {
      urgency = 'soon'
      message = `Consegna tra ${daysUntil} giorni`
    } else if (daysUntil <= 7) {
      urgency = 'soon'
      message = `Consegna tra ${daysUntil} giorni`
    } else {
      message = `Consegna il ${nextDate.toLocaleDateString('it-IT')}`
    }

    return { urgency, message, daysUntil }
  }

  const getDosageInfo = () => {
    if (!subscription.personalizedDosage || !dog) return null

    const { dailyAmount } = subscription.personalizedDosage
    const formatWeight = parseFloat(subscription.formatSize.replace('kg', '')) || 1
    const daysPerPackage = Math.floor((formatWeight * 1000) / dailyAmount)
    const packagesPerFrequency = subscription.quantity
    const totalDays = daysPerPackage * packagesPerFrequency

    return {
      dailyAmount,
      daysPerPackage,
      totalDays,
      isOptimal: totalDays >= (subscription.frequency * 7 * 0.9) && totalDays <= (subscription.frequency * 7 * 1.1)
    }
  }

  const handleToggleStatus = async () => {
    if (subscription.status === 'active') {
      setShowPauseModal(true)
    } else if (subscription.status === 'paused') {
      await handleUpdate({ status: 'active' })
      trackCTA({
        ctaId: 'subscription.resumed',
        event: 'subscription_resumed',
        value: subscription.id,
        metadata: { productId: subscription.productId }
      })
    }
  }

  const handleUpdate = async (updates: Partial<Subscription>) => {
    setIsUpdating(true)
    try {
      onUpdate(updates)
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
    } catch (error) {
      console.error('Error updating subscription:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePauseConfirm = async () => {
    await handleUpdate({ status: 'paused' })
    setShowPauseModal(false)
    trackCTA({
      ctaId: 'subscription.paused',
      event: 'subscription_paused',
      value: subscription.id,
      metadata: { productId: subscription.productId }
    })
  }

  const handleDeleteConfirm = async () => {
    onDelete()
    setShowDeleteModal(false)
    trackCTA({
      ctaId: 'subscription.cancelled',
      event: 'subscription_cancelled',
      value: subscription.id,
      metadata: { productId: subscription.productId }
    })
  }

  const handleSkipNext = async () => {
    // Calculate next delivery date (add frequency weeks)
    const currentNext = new Date(subscription.nextDelivery)
    const newNext = new Date(currentNext)
    newNext.setDate(newNext.getDate() + (subscription.frequency * 7))

    await handleUpdate({ nextDelivery: newNext.toISOString().split('T')[0] })
    trackCTA({
      ctaId: 'subscription.skipped',
      event: 'subscription_delivery_skipped',
      value: subscription.id
    })
  }

  const statusInfo = getStatusInfo()
  const deliveryInfo = getNextDeliveryInfo()
  const dosageInfo = getDosageInfo()

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-6">
          <div className="flex gap-4">
            {/* Product Image */}
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
              <img
                src={subscription.productImage || '/placeholder-product.jpg'}
                alt={subscription.productName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-product.jpg'
                }}
              />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {subscription.productName}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}
                    >
                      <statusInfo.icon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      {subscription.productBrand} • {subscription.formatSize} •{' '}
                      {dog ? `Per ${dog.name}` : 'Cane non specificato'}
                    </p>
                    <p>
                      Ogni {subscription.frequency} settiman{subscription.frequency > 1 ? 'e' : 'a'} •{' '}
                      {subscription.quantity} pezz{subscription.quantity > 1 ? 'i' : 'o'} •{' '}
                      {subscription.totalDeliveries} consegn{subscription.totalDeliveries > 1 ? 'e' : 'a'} effettuate
                    </p>
                  </div>

                  {/* Delivery Info */}
                  {deliveryInfo && (
                    <div className={`mt-2 flex items-center gap-2 text-sm ${
                      deliveryInfo.urgency === 'urgent' ? 'text-red-600' :
                      deliveryInfo.urgency === 'soon' ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      <Truck className="w-4 h-4" />
                      <span>{deliveryInfo.message}</span>
                    </div>
                  )}

                  {/* Dosage Info */}
                  {dosageInfo && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Dosaggio personalizzato</span>
                        {!dosageInfo.isOptimal && (
                          <Badge variant="destructive" className="text-xs">
                            Da rivedere
                          </Badge>
                        )}
                      </div>
                      <p className="text-blue-700">
                        {dosageInfo.dailyAmount}g/giorno • Durata: {dosageInfo.totalDays} giorni
                        {!dosageInfo.isOptimal && (
                          <span className="text-orange-600 ml-2">
                            (Potrebbe non coprire l'intero periodo)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Price and Actions */}
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="mb-3">
                    <div className="text-lg font-bold text-green-600">
                      €{(subscription.price * subscription.quantity).toFixed(2)}
                    </div>
                    {subscription.originalPrice > subscription.price && (
                      <div className="text-sm text-gray-500 line-through">
                        €{(subscription.originalPrice * subscription.quantity).toFixed(2)}
                      </div>
                    )}
                    <div className="text-xs text-green-600">
                      Risparmi €{(subscription.savings * subscription.quantity).toFixed(2)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {subscription.status === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleToggleStatus}
                          disabled={isUpdating}
                          className="w-full"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pausa
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSkipNext}
                          disabled={isUpdating}
                          className="w-full"
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Salta prossima
                        </Button>
                      </>
                    )}

                    {subscription.status === 'paused' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleToggleStatus}
                        disabled={isUpdating}
                        className="w-full"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Riprendi
                      </Button>
                    )}

                    {subscription.status !== 'cancelled' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEditModal(true)}
                          className="flex-1 p-2"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteModal(true)}
                          className="flex-1 p-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Savings Summary */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">
                      Totale risparmiato: <span className="font-medium text-green-600">
                        €{(subscription.savings * subscription.totalDeliveries).toFixed(2)}
                      </span>
                    </span>
                    {subscription.autoAdjust && (
                      <Badge variant="outline" className="text-xs">
                        <Settings className="w-3 h-3 mr-1" />
                        Auto-regolazione attiva
                      </Badge>
                    )}
                  </div>

                  {subscription.status === 'active' && deliveryInfo && (
                    <span className="text-gray-500">
                      Creato il {new Date(subscription.createdAt).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
              </div>

              {/* Recent Dosage Adjustments */}
              {subscription.personalizedDosage?.adjustmentHistory.length > 0 && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                  <p className="font-medium text-gray-700 mb-1">Ultimo aggiustamento:</p>
                  {subscription.personalizedDosage.adjustmentHistory.slice(-1).map((adjustment, index) => (
                    <p key={index} className="text-gray-600">
                      {new Date(adjustment.date).toLocaleDateString('it-IT')}: {adjustment.oldAmount}g → {adjustment.newAmount}g
                      <span className="text-gray-500 ml-1">({adjustment.reason})</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <SubscriptionEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        subscription={subscription}
        dog={dog}
        onUpdate={handleUpdate}
      />

      {/* Pause Confirmation */}
      <ConfirmationModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onConfirm={handlePauseConfirm}
        title="Metti in pausa abbonamento"
        message={`Sei sicuro di voler mettere in pausa l'abbonamento per ${subscription.productName}? Potrai riattivarlo in qualsiasi momento.`}
        confirmText="Metti in pausa"
        variant="warning"
        loading={isUpdating}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Cancella abbonamento"
        message={`Sei sicuro di voler cancellare definitivamente l'abbonamento per ${subscription.productName}? Questa azione non può essere annullata.`}
        confirmText="Cancella definitivamente"
        variant="danger"
        loading={isUpdating}
      />
    </>
  )
}
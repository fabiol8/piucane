'use client'

/**
 * SubscriptionEditModal - Modal for editing existing subscriptions
 * Features: Frequency adjustment, quantity changes, dosage updates, delivery scheduling
 */

import React, { useState, useEffect } from 'react'
import { Package, Calendar, Calculator, Settings, AlertTriangle, CheckCircle, Info, Clock, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trackCTA } from '@/analytics/ga4'

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

interface SubscriptionEditModalProps {
  isOpen: boolean
  onClose: () => void
  subscription: Subscription
  dog?: Dog
  onUpdate: (updates: Partial<Subscription>) => void
}

export function SubscriptionEditModal({
  isOpen,
  onClose,
  subscription,
  dog,
  onUpdate
}: SubscriptionEditModalProps) {
  const [tab, setTab] = useState<'schedule' | 'dosage' | 'delivery'>('schedule')
  const [isUpdating, setIsUpdating] = useState(false)

  // Schedule tab state
  const [newQuantity, setNewQuantity] = useState(subscription.quantity)
  const [newFrequency, setNewFrequency] = useState(subscription.frequency)
  const [autoAdjust, setAutoAdjust] = useState(subscription.autoAdjust)

  // Dosage tab state
  const [newDosage, setNewDosage] = useState(subscription.personalizedDosage?.dailyAmount || 0)
  const [dosageReason, setDosageReason] = useState('')

  // Delivery tab state
  const [newDeliveryDate, setNewDeliveryDate] = useState(subscription.nextDelivery)
  const [skipNext, setSkipNext] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset form values
      setNewQuantity(subscription.quantity)
      setNewFrequency(subscription.frequency)
      setAutoAdjust(subscription.autoAdjust)
      setNewDosage(subscription.personalizedDosage?.dailyAmount || 0)
      setDosageReason('')
      setNewDeliveryDate(subscription.nextDelivery)
      setSkipNext(false)
      setTab('schedule')

      trackCTA({
        ctaId: 'subscription.edit.modal.opened',
        event: 'modal_view',
        value: subscription.id,
        metadata: { productId: subscription.productId }
      })
    }
  }, [isOpen, subscription])

  const calculateDeliveryInfo = () => {
    if (!dog || !subscription.personalizedDosage) return null

    const dosage = newDosage || subscription.personalizedDosage.dailyAmount
    const formatWeight = parseFloat(subscription.formatSize.replace('kg', '')) || 1
    const daysPerPackage = Math.floor((formatWeight * 1000) / dosage)
    const totalDays = daysPerPackage * newQuantity
    const optimalFrequency = Math.ceil(totalDays / 7)

    return {
      dosage,
      daysPerPackage,
      totalDays,
      optimalFrequency,
      isOptimal: Math.abs(newFrequency - optimalFrequency) <= 1,
      weeklyGaps: newFrequency - optimalFrequency
    }
  }

  const calculateSavings = () => {
    const newItemPrice = subscription.originalPrice * newQuantity
    const newSubscriptionPrice = subscription.price * newQuantity
    const savings = newItemPrice - newSubscriptionPrice

    // Calculate frequency impact on monthly value
    const monthlyDeliveries = 4 / newFrequency // approximate monthly frequency
    const monthlyValue = newSubscriptionPrice * monthlyDeliveries

    return {
      perDelivery: savings,
      monthly: savings * monthlyDeliveries,
      newMonthlyValue: monthlyValue
    }
  }

  const hasChanges = () => {
    return (
      newQuantity !== subscription.quantity ||
      newFrequency !== subscription.frequency ||
      autoAdjust !== subscription.autoAdjust ||
      (subscription.personalizedDosage && newDosage !== subscription.personalizedDosage.dailyAmount) ||
      newDeliveryDate !== subscription.nextDelivery
    )
  }

  const handleSave = async () => {
    if (!hasChanges()) {
      onClose()
      return
    }

    setIsUpdating(true)

    try {
      const updates: Partial<Subscription> = {}

      // Schedule changes
      if (newQuantity !== subscription.quantity) {
        updates.quantity = newQuantity
      }

      if (newFrequency !== subscription.frequency) {
        updates.frequency = newFrequency
      }

      if (autoAdjust !== subscription.autoAdjust) {
        updates.autoAdjust = autoAdjust
      }

      // Dosage changes
      if (subscription.personalizedDosage && newDosage !== subscription.personalizedDosage.dailyAmount) {
        const adjustmentHistory = subscription.personalizedDosage.adjustmentHistory || []
        updates.personalizedDosage = {
          dailyAmount: newDosage,
          adjustmentHistory: [
            ...adjustmentHistory,
            {
              date: new Date().toISOString().split('T')[0],
              oldAmount: subscription.personalizedDosage.dailyAmount,
              newAmount: newDosage,
              reason: dosageReason || 'Aggiustamento manuale'
            }
          ]
        }
      }

      // Delivery date changes
      if (newDeliveryDate !== subscription.nextDelivery) {
        updates.nextDelivery = newDeliveryDate
      }

      // Skip next delivery
      if (skipNext) {
        const currentNext = new Date(subscription.nextDelivery)
        const skippedNext = new Date(currentNext)
        skippedNext.setDate(skippedNext.getDate() + (subscription.frequency * 7))
        updates.nextDelivery = skippedNext.toISOString().split('T')[0]
      }

      await onUpdate(updates)

      trackCTA({
        ctaId: 'subscription.updated',
        event: 'subscription_modified',
        value: subscription.id,
        metadata: {
          changes: Object.keys(updates),
          productId: subscription.productId
        }
      })

      onClose()
    } catch (error) {
      console.error('Error updating subscription:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const deliveryInfo = calculateDeliveryInfo()
  const savingsInfo = calculateSavings()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Modifica abbonamento: ${subscription.productName}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Product Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <img
                src={subscription.productImage || '/placeholder-product.jpg'}
                alt={subscription.productName}
                className="w-16 h-16 rounded-lg object-cover bg-gray-100"
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{subscription.productName}</h3>
                <p className="text-sm text-gray-600">
                  {subscription.productBrand} • {subscription.formatSize}
                  {dog && ` • Per ${dog.name}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={subscription.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {subscription.status === 'active' ? 'Attivo' :
                     subscription.status === 'paused' ? 'In pausa' : 'Cancellato'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {subscription.totalDeliveries} consegne effettuate
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'schedule', label: 'Programmazione', icon: Calendar },
              { id: 'dosage', label: 'Dosaggio', icon: Calculator, disabled: !subscription.isCustomizable },
              { id: 'delivery', label: 'Consegne', icon: Truck }
            ].map(tabInfo => (
              <button
                key={tabInfo.id}
                onClick={() => !tabInfo.disabled && setTab(tabInfo.id as any)}
                disabled={tabInfo.disabled}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  tab === tabInfo.id
                    ? 'border-blue-500 text-blue-600'
                    : tabInfo.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tabInfo.icon className="w-4 h-4" />
                {tabInfo.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* Schedule Tab */}
          {tab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Frequenza e quantità</h4>

                {/* Quantity */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantità per consegna
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setNewQuantity(Math.max(1, newQuantity - 1))}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">{newQuantity}</span>
                    <button
                      onClick={() => setNewQuantity(newQuantity + 1)}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-600 ml-2">
                      confezioni da {subscription.formatSize}
                    </span>
                  </div>
                </div>

                {/* Frequency */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequenza di consegna
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[2, 4, 6, 8, 10, 12].map(weeks => (
                      <button
                        key={weeks}
                        onClick={() => setNewFrequency(weeks)}
                        className={`p-3 text-sm border rounded-lg ${
                          newFrequency === weeks
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        Ogni {weeks} settiman{weeks > 1 ? 'e' : 'a'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-adjust */}
                <div className="flex items-center mb-6">
                  <input
                    type="checkbox"
                    id="autoAdjust"
                    checked={autoAdjust}
                    onChange={(e) => setAutoAdjust(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="autoAdjust" className="ml-2 text-sm text-gray-700">
                    Regola automaticamente in base alle esigenze di {dog?.name || 'il tuo cane'}
                  </label>
                </div>

                {/* Delivery Preview */}
                {deliveryInfo && (
                  <Card className={`${deliveryInfo.isOptimal ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {deliveryInfo.isOptimal ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className={`font-medium mb-2 ${
                            deliveryInfo.isOptimal ? 'text-green-800' : 'text-orange-800'
                          }`}>
                            Anteprima programmazione
                          </h4>
                          <div className="text-sm space-y-1">
                            <p>• {newQuantity} confezioni durano {deliveryInfo.totalDays} giorni</p>
                            <p>• Consegna ogni {newFrequency} settimane</p>
                            {!deliveryInfo.isOptimal && (
                              <p className={deliveryInfo.weeklyGaps > 0 ? 'text-orange-700' : 'text-blue-700'}>
                                • {deliveryInfo.weeklyGaps > 0
                                  ? `Potrebbero rimanere ${Math.abs(deliveryInfo.weeklyGaps)} settimane di cibo in più`
                                  : `Potrebbero mancare ${Math.abs(deliveryInfo.weeklyGaps)} settimane di cibo`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Price Preview */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Nuovo prezzo</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          €{(subscription.price * newQuantity).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">per consegna</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-green-600">
                          Risparmi €{savingsInfo.perDelivery.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ~€{savingsInfo.newMonthlyValue.toFixed(2)}/mese
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Dosage Tab */}
          {tab === 'dosage' && subscription.personalizedDosage && dog && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Dosaggio personalizzato</h4>

                {/* Current Dosage */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Dosaggio attuale</p>
                        <p className="text-sm text-gray-600">Per {dog.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {subscription.personalizedDosage.dailyAmount}g
                        </div>
                        <div className="text-sm text-gray-500">al giorno</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* New Dosage */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nuovo dosaggio giornaliero
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="number"
                      value={newDosage}
                      onChange={(e) => setNewDosage(parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                    />
                    <span className="text-sm text-gray-600">grammi al giorno</span>
                  </div>

                  {/* Quick adjustments */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button
                      onClick={() => setNewDosage(Math.round(subscription.personalizedDosage!.dailyAmount * 0.9))}
                      className="p-2 text-sm border border-gray-200 rounded hover:border-gray-300"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => setNewDosage(subscription.personalizedDosage!.dailyAmount)}
                      className="p-2 text-sm border border-gray-200 rounded hover:border-gray-300"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setNewDosage(Math.round(subscription.personalizedDosage!.dailyAmount * 1.1))}
                      className="p-2 text-sm border border-gray-200 rounded hover:border-gray-300"
                    >
                      +10%
                    </button>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo del cambiamento (opzionale)
                    </label>
                    <select
                      value={dosageReason}
                      onChange={(e) => setDosageReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Seleziona motivo...</option>
                      <option value="Cambiamento peso">Cambiamento di peso</option>
                      <option value="Livello attività">Cambiamento livello di attività</option>
                      <option value="Condizioni salute">Nuove condizioni di salute</option>
                      <option value="Preferenze alimentari">Preferenze alimentari</option>
                      <option value="Raccomandazione veterinario">Raccomandazione del veterinario</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </div>
                </div>

                {/* Dosage History */}
                {subscription.personalizedDosage.adjustmentHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Storico aggiustamenti</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {subscription.personalizedDosage.adjustmentHistory.slice(-5).reverse().map((adjustment, index) => (
                          <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium">
                                  {adjustment.oldAmount}g → {adjustment.newAmount}g
                                </span>
                                <p className="text-xs text-gray-600 mt-1">{adjustment.reason}</p>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(adjustment.date).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Delivery Tab */}
          {tab === 'delivery' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Gestione consegne</h4>

                {/* Next Delivery */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-gray-900">Prossima consegna</p>
                        <p className="text-sm text-gray-600">
                          Attualmente programmata per il {new Date(subscription.nextDelivery).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <Truck className="w-8 h-8 text-blue-600" />
                    </div>

                    {/* Change date */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cambia data di consegna
                        </label>
                        <input
                          type="date"
                          value={newDeliveryDate}
                          onChange={(e) => setNewDeliveryDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      {/* Skip next */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="skipNext"
                          checked={skipNext}
                          onChange={(e) => setSkipNext(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="skipNext" className="ml-2 text-sm text-gray-700">
                          Salta la prossima consegna (sposta alla successiva programmata)
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Storico consegne</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-3">
                      {/* Mock delivery history */}
                      {Array.from({ length: Math.min(subscription.totalDeliveries, 5) }, (_, i) => {
                        const deliveryDate = new Date()
                        deliveryDate.setDate(deliveryDate.getDate() - ((i + 1) * subscription.frequency * 7))

                        return (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Consegna #{subscription.totalDeliveries - i}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{deliveryDate.toLocaleDateString('it-IT')}</p>
                              <p className="text-xs text-gray-600">
                                {subscription.quantity} x {subscription.formatSize}
                              </p>
                            </div>
                          </div>
                        )
                      })}

                      {subscription.totalDeliveries === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>Nessuna consegna ancora effettuata</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>

          <div className="flex items-center gap-3">
            {hasChanges() && (
              <Badge variant="secondary" className="text-xs">
                Modifiche non salvate
              </Badge>
            )}
            <Button
              onClick={handleSave}
              loading={isUpdating}
              disabled={!hasChanges()}
            >
              {isUpdating ? 'Salvando...' : 'Salva modifiche'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
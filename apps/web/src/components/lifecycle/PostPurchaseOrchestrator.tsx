'use client'

/**
 * Post-Purchase Experience Orchestrator - PiùCane
 * Sistema completo per orchestrare l'esperienza post-acquisto del cliente
 */

import React, { useState, useEffect } from 'react'
import { Package, CheckCircle, Truck, MessageCircle, Star, Gift, Clock, MapPin, AlertTriangle, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PostDeliveryExperience } from '@/components/feedback/PostDeliveryExperience'
import { customerLifecycleManager, Customer, CustomerJourney } from '@/lib/customer-lifecycle'
import { trackCTA } from '@/analytics/ga4'

interface OrderStatus {
  id: string
  orderId: string
  status: 'confirmed' | 'preparing' | 'packaged' | 'shipped' | 'out_for_delivery' | 'delivered' | 'exception'
  timeline: Array<{
    status: string
    timestamp: string
    location?: string
    description: string
    completed: boolean
  }>
  estimatedDelivery: string
  trackingNumber?: string
  carrier: string
  nextAction?: {
    type: 'review' | 'subscribe' | 'reorder' | 'support'
    title: string
    description: string
    cta: string
    url: string
  }
}

interface PostPurchaseOrchestratorProps {
  orderId: string
  customer: Customer
  products: Array<{
    id: string
    name: string
    image: string
    category: string
    subscription?: boolean
  }>
}

export function PostPurchaseOrchestrator({ orderId, customer, products }: PostPurchaseOrchestratorProps) {
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [activeJourneys, setActiveJourneys] = useState<CustomerJourney[]>([])
  const [showDeliveryFeedback, setShowDeliveryFeedback] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<'confirmation' | 'preparation' | 'shipping' | 'delivery' | 'post_delivery'>('confirmation')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializePostPurchaseExperience()
  }, [orderId, customer.id])

  const initializePostPurchaseExperience = async () => {
    try {
      // 1. Carica stato ordine
      await loadOrderStatus()

      // 2. Inizia customer journey
      const journey = await customerLifecycleManager.startPostPurchaseJourney(
        customer,
        orderId,
        products.map(p => p.id),
        customer.dogs.map(d => d.id)
      )

      setActiveJourneys([journey])

      // 3. Invia conferma immediata
      await sendImmediateConfirmation()

      // 4. Assegna badge primo ordine se applicabile
      if (customer.totalOrders === 1) {
        await awardFirstOrderBadge()
      }

      // 5. Determina fase attuale
      determineCurrentPhase()

      trackCTA({
        ctaId: 'post_purchase.orchestrator.initialized',
        event: 'post_purchase_experience_started',
        value: 'experience_initialized',
        metadata: {
          orderId,
          customerId: customer.id,
          phase: currentPhase,
          isFirstOrder: customer.totalOrders === 1
        }
      })

    } catch (error) {
      console.error('Errore nell\'inizializzazione post-acquisto:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadOrderStatus = async () => {
    // Simula caricamento stato ordine con timeline
    const mockStatus: OrderStatus = {
      id: `status_${orderId}`,
      orderId,
      status: 'confirmed',
      timeline: [
        {
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          description: 'Ordine confermato e ricevuto',
          location: 'Centro PiùCane',
          completed: true
        },
        {
          status: 'preparing',
          timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          description: 'Ordine in preparazione',
          location: 'Centro Logistico Milano',
          completed: false
        },
        {
          status: 'packaged',
          timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          description: 'Prodotti imballati con cura',
          location: 'Centro Logistico Milano',
          completed: false
        },
        {
          status: 'shipped',
          timestamp: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
          description: 'Pacco spedito',
          location: 'Hub Corriere',
          completed: false
        },
        {
          status: 'out_for_delivery',
          timestamp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'In consegna nella tua zona',
          location: 'Filiale locale',
          completed: false
        },
        {
          status: 'delivered',
          timestamp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
          description: 'Consegnato',
          location: 'Indirizzo di consegna',
          completed: false
        }
      ],
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      carrier: 'Corriere Express',
      nextAction: {
        type: 'subscribe',
        title: 'Attiva Abbonamento',
        description: 'Non rimanere mai senza cibo per ' + customer.dogs[0]?.name,
        cta: 'Attiva Abbonamento',
        url: `/subscribe?products=${products.map(p => p.id).join(',')}`
      }
    }

    setOrderStatus(mockStatus)
  }

  const sendImmediateConfirmation = async () => {
    // Simula invio conferma immediata multi-canale
    const confirmationData = {
      orderId,
      customerName: customer.firstName,
      dogName: customer.dogs[0]?.name || 'il tuo cane',
      products: products.map(p => p.name).join(', '),
      estimatedDelivery: orderStatus?.estimatedDelivery
    }

    // Inbox message
    await sendInboxMessage('Ordine Confermato! 🎉',
      `Il tuo ordine #${orderId} è stato confermato. ${customer.dogs[0]?.name} riceverà presto i suoi prodotti premium!`)

    // Push notification se abilitata
    if (customer.preferences.pushNotifications) {
      await sendPushNotification('Ordine confermato!',
        `Ordine #${orderId} confermato per ${customer.dogs[0]?.name} 🐕`)
    }

    // Email sempre
    await sendConfirmationEmail(confirmationData)

    // WhatsApp se abilitato
    if (customer.preferences.whatsappNotifications) {
      await sendWhatsAppConfirmation(confirmationData)
    }

    trackCTA({
      ctaId: 'post_purchase.confirmation.sent',
      event: 'order_confirmation_sent',
      value: 'multi_channel',
      metadata: {
        orderId,
        customerId: customer.id,
        channels: ['inbox', 'email',
          customer.preferences.pushNotifications ? 'push' : null,
          customer.preferences.whatsappNotifications ? 'whatsapp' : null
        ].filter(Boolean)
      }
    })
  }

  const awardFirstOrderBadge = async () => {
    // Assegna badge primo ordine
    await grantBadge('first_order', 'Primo Cliente PiùCane!', 100)

    // Mostra celebrazione
    setTimeout(() => {
      showCelebration('Congratulazioni! 🎉', 'Hai guadagnato il badge "Primo Cliente PiùCane" e 100 punti!')
    }, 2000)
  }

  const determineCurrentPhase = () => {
    if (!orderStatus) return

    const currentStatus = orderStatus.status

    switch (currentStatus) {
      case 'confirmed':
      case 'preparing':
        setCurrentPhase('preparation')
        break
      case 'packaged':
      case 'shipped':
        setCurrentPhase('shipping')
        break
      case 'out_for_delivery':
        setCurrentPhase('delivery')
        break
      case 'delivered':
        setCurrentPhase('post_delivery')
        // Mostra feedback post-consegna dopo 2 ore dalla consegna
        setTimeout(() => setShowDeliveryFeedback(true), 2 * 60 * 60 * 1000)
        break
    }
  }

  const handleTrackOrder = () => {
    trackCTA({
      ctaId: 'post_purchase.track_order',
      event: 'order_tracking_viewed',
      value: 'timeline_viewed',
      metadata: { orderId, customerId: customer.id }
    })

    // Apri tracking dettagliato
    window.location.href = `/orders/${orderId}/tracking`
  }

  const handleActivateSubscription = () => {
    trackCTA({
      ctaId: 'post_purchase.activate_subscription',
      event: 'subscription_activation_started',
      value: 'from_order_confirmation',
      metadata: { orderId, customerId: customer.id, products: products.map(p => p.id) }
    })

    window.location.href = orderStatus?.nextAction?.url || '/subscriptions/create'
  }

  const handleWriteReview = () => {
    trackCTA({
      ctaId: 'post_purchase.write_review',
      event: 'review_process_started',
      value: 'from_order_confirmation',
      metadata: { orderId, customerId: customer.id }
    })

    window.location.href = `/orders/${orderId}/review`
  }

  const handleReportProblem = () => {
    trackCTA({
      ctaId: 'post_purchase.report_problem',
      event: 'problem_reporting_started',
      value: 'customer_initiated',
      metadata: { orderId, customerId: customer.id }
    })

    window.location.href = `/orders/${orderId}/report-problem`
  }

  const handleContactSupport = () => {
    trackCTA({
      ctaId: 'post_purchase.contact_support',
      event: 'support_contact_initiated',
      value: 'from_order_status',
      metadata: { orderId, customerId: customer.id }
    })

    window.location.href = `/chat?context=order_support&orderId=${orderId}`
  }

  // Utility functions per invio messaggi
  const sendInboxMessage = async (subject: string, content: string) => {
    console.log('📥 Inbox message:', { subject, content })
    // Implementazione invio a inbox
  }

  const sendPushNotification = async (title: string, body: string) => {
    console.log('🔔 Push notification:', { title, body })
    // Implementazione push notification
  }

  const sendConfirmationEmail = async (data: any) => {
    console.log('📧 Confirmation email:', data)
    // Implementazione email confirmation
  }

  const sendWhatsAppConfirmation = async (data: any) => {
    console.log('📱 WhatsApp confirmation:', data)
    // Implementazione WhatsApp
  }

  const grantBadge = async (badgeId: string, name: string, points: number) => {
    console.log('🏆 Badge granted:', { badgeId, name, points })
    // Implementazione sistema badge
  }

  const showCelebration = (title: string, message: string) => {
    console.log('🎉 Celebration:', { title, message })
    // Implementazione celebrazione UI
  }

  const getStatusIcon = (status: string, completed: boolean) => {
    if (completed) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }

    switch (status) {
      case 'confirmed':
      case 'preparing':
      case 'packaged':
        return <Package className="h-5 w-5 text-blue-600" />
      case 'shipped':
      case 'out_for_delivery':
        return <Truck className="h-5 w-5 text-blue-600" />
      case 'delivered':
        return <MapPin className="h-5 w-5 text-green-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getPhaseContent = () => {
    switch (currentPhase) {
      case 'confirmation':
        return {
          title: 'Ordine Confermato! 🎉',
          description: `Grazie ${customer.firstName}! ${customer.dogs[0]?.name} riceverà presto i suoi prodotti premium.`,
          emotion: 'rassicurazione immediata, sensazione di professionalità',
          actions: [
            { type: 'track', label: 'Vai ai miei ordini', action: handleTrackOrder },
            ...(orderStatus?.nextAction ? [{
              type: 'subscribe',
              label: orderStatus.nextAction.cta,
              action: handleActivateSubscription
            }] : [])
          ]
        }

      case 'preparation':
        return {
          title: 'Stiamo preparando il tuo ordine 📦',
          description: 'I nostri esperti stanno selezionando con cura ogni prodotto per il benessere di ' + customer.dogs[0]?.name,
          emotion: 'fiducia, controllo, riduzione ansia da consegna',
          actions: [
            { type: 'track', label: 'Segui la preparazione', action: handleTrackOrder }
          ]
        }

      case 'shipping':
        return {
          title: 'Il tuo ordine è in viaggio! 🚚',
          description: 'Stiamo portando a ' + customer.dogs[0]?.name + ' i suoi prodotti premium. Traccia la spedizione in tempo reale.',
          emotion: 'anticipazione positiva, controllo totale',
          actions: [
            { type: 'track', label: 'Traccia spedizione', action: handleTrackOrder },
            { type: 'support', label: 'Contatta supporto', action: handleContactSupport }
          ]
        }

      case 'delivery':
        return {
          title: 'In consegna oggi! 📍',
          description: 'Il tuo ordine sta arrivando! Assicurati di essere presente all\'indirizzo di consegna.',
          emotion: 'eccitazione, gratificazione imminente',
          actions: [
            { type: 'track', label: 'Tracking live', action: handleTrackOrder },
            { type: 'support', label: 'Problemi di consegna?', action: handleContactSupport }
          ]
        }

      case 'post_delivery':
        return {
          title: 'Ordine consegnato! 🎁',
          description: customer.dogs[0]?.name + ' ha ricevuto i suoi prodotti! Come sta andando?',
          emotion: 'gratificazione e sorpresa positiva',
          actions: [
            { type: 'review', label: 'Valuta il prodotto', action: handleWriteReview },
            { type: 'subscribe', label: 'Attiva abbonamento', action: handleActivateSubscription },
            { type: 'problem', label: 'Segnala problema', action: handleReportProblem }
          ]
        }

      default:
        return {
          title: 'Il tuo ordine',
          description: 'Seguiamo il tuo ordine passo dopo passo',
          emotion: 'controllo e trasparenza',
          actions: []
        }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-piucane-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento esperienza post-acquisto...</p>
        </div>
      </div>
    )
  }

  const phaseContent = getPhaseContent()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con stato emozionale */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{phaseContent.title}</h1>
          <p className="text-lg text-gray-600 mb-2">{phaseContent.description}</p>
          <p className="text-sm text-piucane-primary italic">👉 {phaseContent.emotion}</p>
        </div>

        {/* Order Timeline */}
        {orderStatus && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ordine #{orderStatus.orderId}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timeline */}
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  {orderStatus.timeline.map((step, index) => (
                    <div key={index} className="relative flex items-start gap-4 pb-6">
                      <div className={`
                        relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2
                        ${step.completed ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300'}
                      `}>
                        {getStatusIcon(step.status, step.completed)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-600'}`}>
                            {step.description}
                          </p>
                          <time className="text-sm text-gray-500">
                            {step.completed
                              ? new Date(step.timestamp).toLocaleDateString('it-IT', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : new Date(step.timestamp).toLocaleDateString('it-IT', {
                                  day: 'numeric',
                                  month: 'short'
                                })
                            }
                          </time>
                        </div>

                        {step.location && (
                          <p className="text-sm text-gray-600 mt-1">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {step.location}
                          </p>
                        )}

                        {step.status === orderStatus.status && !step.completed && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                            Stato attuale - aggiornamenti in tempo reale
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Estimated Delivery */}
                <div className="mt-6 p-4 bg-piucane-light rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Consegna stimata</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(orderStatus.estimatedDelivery).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })} entro le 18:00
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Corriere</p>
                      <p className="font-medium text-gray-900">{orderStatus.carrier}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Ordered */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Prodotti Ordinati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600">Per {customer.dogs[0]?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-600">Premium</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {phaseContent.actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              className="h-auto py-4 px-6 text-left"
              variant={index === 0 ? 'default' : 'outline'}
            >
              <div className="flex items-center gap-3">
                {action.type === 'track' && <Package className="h-5 w-5" />}
                {action.type === 'subscribe' && <Gift className="h-5 w-5" />}
                {action.type === 'review' && <Star className="h-5 w-5" />}
                {action.type === 'support' && <MessageCircle className="h-5 w-5" />}
                {action.type === 'problem' && <AlertTriangle className="h-5 w-5" />}
                <span>{action.label}</span>
              </div>
            </Button>
          ))}
        </div>

        {/* Customer Journey Progress */}
        {activeJourneys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Il Tuo Percorso con PiùCane</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeJourneys.map((journey) => (
                  <div key={journey.journeyId}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{journey.name}</h4>
                      <span className="text-sm text-gray-600">
                        Step {journey.currentStep + 1} di {journey.steps.length}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-piucane-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${((journey.currentStep + 1) / journey.steps.length) * 100}%`
                        }}
                      />
                    </div>

                    <p className="text-sm text-gray-600">{journey.description}</p>

                    {journey.currentStep < journey.steps.length && (
                      <div className="mt-3 p-3 bg-blue-50 rounded">
                        <p className="text-sm font-medium text-blue-900">
                          Prossimo: {journey.steps[journey.currentStep]?.name}
                        </p>
                        <p className="text-xs text-blue-700">
                          {journey.steps[journey.currentStep]?.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post-Delivery Feedback Modal */}
        {showDeliveryFeedback && (
          <PostDeliveryExperience
            orderId={orderId}
            isOpen={showDeliveryFeedback}
            onClose={() => setShowDeliveryFeedback(false)}
            onComplete={() => {
              setShowDeliveryFeedback(false)
              // Trigger next journey step or reward
            }}
          />
        )}
      </div>
    </div>
  )
}
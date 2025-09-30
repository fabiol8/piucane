'use client'

/**
 * Pagina di Conferma Ordine - Esperienza Post-Acquisto PiùCane
 * Con tracking, raccomandazioni follow-up e engagement
 */

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, Package, Truck, Calendar, Heart, Share2, Download, MessageCircle, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { trackCTA } from '@/analytics/ga4'

interface OrderDetails {
  id: string
  date: string
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered'
  items: Array<{
    productId: string
    name: string
    image: string
    quantity: number
    price: number
  }>
  total: number
  estimatedDelivery: string
  trackingNumber?: string
  loyaltyPointsEarned: number
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [showConfetti, setShowConfetti] = useState(true)
  const [feedbackStep, setFeedbackStep] = useState(0)

  const orderId = searchParams.get('order')

  useEffect(() => {
    if (!orderId) {
      router.push('/shop')
      return
    }

    // Track successful purchase
    trackCTA({
      ctaId: 'checkout.success.viewed',
      event: 'purchase_complete',
      value: 'success_page_loaded',
      metadata: { orderId }
    })

    // Simula caricamento dettagli ordine
    loadOrderDetails(orderId)

    // Nascondi confetti dopo 3 secondi
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [orderId])

  const loadOrderDetails = async (id: string) => {
    // Simula chiamata API
    const mockOrder: OrderDetails = {
      id: id,
      date: new Date().toISOString(),
      status: 'confirmed',
      items: [
        {
          productId: 'piucane-adult-chicken-rice',
          name: 'PiùCane Adult Pollo e Riso',
          image: '/products/piucane-adult-chicken-rice.jpg',
          quantity: 2,
          price: 29.90
        }
      ],
      total: 59.80,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      loyaltyPointsEarned: 598
    }

    setOrderDetails(mockOrder)
  }

  const shareOrder = async () => {
    trackCTA({
      ctaId: 'order.success.shared',
      event: 'share',
      value: 'order_shared',
      metadata: { orderId, platform: 'native' }
    })

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ho appena ordinato da PiùCane!',
          text: 'Prodotti premium per il benessere del mio cane 🐕',
          url: window.location.origin
        })
      } catch (error) {
        // Fallback per condivisione manuale
        navigator.clipboard.writeText(`Ho appena ordinato da PiùCane! ${window.location.origin}`)
        alert('Link copiato negli appunti!')
      }
    }
  }

  const downloadInvoice = () => {
    trackCTA({
      ctaId: 'order.invoice.downloaded',
      event: 'download',
      value: 'invoice',
      metadata: { orderId }
    })

    // Simula download fattura
    alert('Fattura scaricata! (funzionalità simulata)')
  }

  const startChat = () => {
    trackCTA({
      ctaId: 'order.support.chat',
      event: 'contact_support',
      value: 'chat_opened',
      metadata: { orderId, source: 'success_page' }
    })

    router.push('/chat?context=order_support&orderId=' + orderId)
  }

  const submitFeedback = (rating: number) => {
    trackCTA({
      ctaId: 'order.feedback.submitted',
      event: 'feedback',
      value: 'experience_rating',
      metadata: { orderId, rating, step: feedbackStep }
    })

    if (feedbackStep === 0) {
      setFeedbackStep(1)
    } else {
      alert('Grazie per il tuo feedback!')
      setFeedbackStep(2)
    }
  }

  const continueshopping = () => {
    trackCTA({
      ctaId: 'order.success.continue_shopping',
      event: 'navigation',
      value: 'continue_shopping',
      metadata: { orderId }
    })

    router.push('/shop')
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-piucane-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento dettagli ordine...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="confetti-animation">
            {/* CSS animation per confetti */}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ordine Confermato!</h1>
          <p className="text-lg text-gray-600 mb-4">
            Grazie per aver scelto PiùCane per il benessere del tuo cane
          </p>
          <p className="text-sm text-gray-500">
            Ordine #{orderDetails.id} • {new Date(orderDetails.date).toLocaleDateString('it-IT')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Stato dell'Ordine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Ordine Confermato</p>
                      <p className="text-sm text-gray-600">Stiamo preparando i tuoi prodotti</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">Ora</span>
                </div>

                <div className="flex items-center justify-between mb-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">In Preparazione</p>
                      <p className="text-sm text-gray-600">I prodotti vengono imballati</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">1-2 giorni</span>
                </div>

                <div className="flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Truck className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Spedito</p>
                      <p className="text-sm text-gray-600">In viaggio verso di te</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">3-5 giorni</span>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Prodotti Ordinati</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderDetails.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">Quantità: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">€{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between font-medium text-lg">
                    <span>Totale Ordine</span>
                    <span>€{orderDetails.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informazioni di Consegna
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Consegna stimata</p>
                    <p className="font-medium text-gray-900">
                      {new Date(orderDetails.estimatedDelivery).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {orderDetails.trackingNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Numero di tracciamento</p>
                      <p className="font-medium text-gray-900">{orderDetails.trackingNumber}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Ti invieremo aggiornamenti via email e notifiche push</p>
                    <Button variant="outline" size="sm">
                      <Truck className="h-4 w-4 mr-2" />
                      Traccia Spedizione
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Experience Feedback */}
            {feedbackStep < 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Come è stata la tua esperienza di acquisto?</CardTitle>
                </CardHeader>
                <CardContent>
                  {feedbackStep === 0 ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">Valuta la facilità di ordinazione</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => submitFeedback(rating)}
                            className="p-2 rounded hover:bg-gray-100"
                          >
                            <Star className="h-6 w-6 text-yellow-400 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">Quanto consiglieresti PiùCane?</p>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => submitFeedback(rating)}
                            className="p-3 text-center border rounded hover:bg-piucane-light"
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Azioni Rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={downloadInvoice} variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Fattura
                </Button>

                <Button onClick={shareOrder} variant="outline" className="w-full justify-start">
                  <Share2 className="h-4 w-4 mr-2" />
                  Condividi Acquisto
                </Button>

                <Button onClick={startChat} variant="outline" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contatta Supporto
                </Button>
              </CardContent>
            </Card>

            {/* Loyalty Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-piucane-primary" />
                  Punti Fedeltà
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-piucane-primary mb-2">
                    +{orderDetails.loyaltyPointsEarned}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">Punti guadagnati con questo ordine</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Vedi Ricompense
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Prossimi Passi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-piucane-primary rounded-full mt-2"></div>
                    <p>Riceverai una email di conferma entro 5 minuti</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <p>Ti invieremo il tracking quando spediremo</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <p>Prepareremo un piano alimentare personalizzato</p>
                  </div>
                </div>

                <Button onClick={continueShop} className="w-full mt-4">
                  Continua lo Shopping
                </Button>
              </CardContent>
            </Card>

            {/* Social Proof */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Ti sei unito a</p>
                  <p className="text-2xl font-bold text-piucane-primary mb-2">15,000+</p>
                  <p className="text-sm text-gray-600">proprietari di cani felici</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Thank You Message */}
        <div className="mt-12 text-center bg-piucane-light rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Grazie per aver scelto PiùCane!</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            La nostra missione è supportare la salute e la felicità del tuo cane.
            Il nostro team di esperti è sempre disponibile per consigli personalizzati
            e supporto durante tutto il percorso del tuo amico a quattro zampe.
          </p>
        </div>
      </div>

      <style jsx>{`
        .confetti-animation {
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24);
          background-size: 400% 400%;
          animation: confetti-fall 3s ease-out;
        }

        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(-100vh) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  )
}
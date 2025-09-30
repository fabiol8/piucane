'use client'

/**
 * Checkout Flow Completo PiùCane
 * Processo di acquisto con validazione, pagamenti Stripe e personalizzazione
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackCTA } from '@/analytics/ga4'
import { piuCaneProducts } from '@/lib/products-data'
import { useCart } from '@/hooks/useCart'
import { z } from 'zod'

// Validation schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'Nome richiesto'),
  lastName: z.string().min(2, 'Cognome richiesto'),
  email: z.string().email('Email non valida'),
  phone: z.string().min(10, 'Numero di telefono non valido')
})

const addressSchema = z.object({
  street: z.string().min(5, 'Indirizzo richiesto'),
  city: z.string().min(2, 'Città richiesta'),
  postalCode: z.string().regex(/^\d{5}$/, 'CAP non valido'),
  province: z.string().min(2, 'Provincia richiesta'),
  country: z.string().default('IT')
})

const paymentSchema = z.object({
  method: z.enum(['card', 'paypal', 'bank_transfer']),
  savePayment: z.boolean().default(false)
})

interface CheckoutStep {
  id: string
  title: string
  description: string
  isComplete: boolean
  isActive: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, itemCount, clearCart, isLoading } = useCart()
  const hasTrackedStart = useRef(false)

  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<any>({})

  // Form data
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    province: '',
    country: 'IT'
  })

  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    province: '',
    country: 'IT',
    sameAsShipping: true
  })

  const [paymentInfo, setPaymentInfo] = useState({
    method: 'card' as 'card' | 'paypal' | 'bank_transfer',
    savePayment: false
  })

  const [orderNotes, setOrderNotes] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)

  const steps: CheckoutStep[] = [
    {
      id: 'personal',
      title: 'Informazioni Personali',
      description: 'I tuoi dati di contatto',
      isComplete: false,
      isActive: currentStep === 0
    },
    {
      id: 'shipping',
      title: 'Indirizzo di Spedizione',
      description: 'Dove consegnare i prodotti',
      isComplete: false,
      isActive: currentStep === 1
    },
    {
      id: 'payment',
      title: 'Pagamento',
      description: 'Metodo di pagamento',
      isComplete: false,
      isActive: currentStep === 2
    },
    {
      id: 'review',
      title: 'Conferma Ordine',
      description: 'Rivedi il tuo ordine',
      isComplete: false,
      isActive: currentStep === 3
    }
  ]

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (items.length === 0) {
      router.push('/shop?source=checkout-empty')
      return
    }

    if (!hasTrackedStart.current) {
      const totals = calculateTotal()
      trackCTA({
        ctaId: 'checkout.started',
        event: 'begin_checkout',
        value: 'page_loaded',
        metadata: {
          item_count: itemCount,
          order_value: totals.total,
          items: items.map(item => ({
            item_id: item.productId,
            quantity: item.quantity,
            is_subscription: item.subscriptionFrequency !== 'none'
          }))
        }
      })
      hasTrackedStart.current = true
    }
  }, [isLoading, items, itemCount, router])

  const validateStep = (step: number): boolean => {
    setErrors({})

    try {
      switch (step) {
        case 0:
          personalInfoSchema.parse(personalInfo)
          return true

        case 1:
          addressSchema.parse(shippingAddress)
          return true

        case 2:
          paymentSchema.parse(paymentInfo)
          return true

        case 3:
          return true

        default:
          return false
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = {}
        error.errors.forEach(err => {
          fieldErrors[err.path[0]] = err.message
        })
        setErrors(fieldErrors)
      }
      return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const nextStepIndex = Math.min(currentStep + 1, steps.length - 1)
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))

      trackCTA({
        ctaId: 'checkout.step.next',
        event: 'checkout_step',
        value: steps[nextStepIndex].id,
        metadata: {
          from_step: currentStep,
          to_step: nextStepIndex,
          step_id: steps[currentStep].id
        }
      })
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const calculateTotal = () => {
    let subtotal = 0

    items.forEach(item => {
      const product = piuCaneProducts.find(p => p.id === item.productId)
      if (product) {
        const format = product.formats.find(f => f.id === item.formatId)
        if (format) {
          let price = format.price
          if (item.subscriptionFrequency !== 'none') {
            price *= 0.85 // 15% sconto abbonamento
          }
          subtotal += price * item.quantity
        }
      }
    })

    const shipping = subtotal >= 49 ? 0 : 7.99
    const total = subtotal + shipping

    return { subtotal, shipping, total }
  }

  const submitOrder = async () => {
    if (!validateStep(currentStep)) return

    setIsProcessing(true)

    try {
      // Simula chiamata API per creare ordine
      const totals = calculateTotal()
      const orderData = {
        personalInfo,
        shippingAddress,
        billingAddress: billingAddress.sameAsShipping ? shippingAddress : billingAddress,
        paymentInfo,
        items,
        totals,
        orderNotes,
        marketingConsent
      }

      trackCTA({
        ctaId: 'checkout.order.submitted',
        event: 'purchase',
        value: 'order_placed',
        metadata: {
          order_id: 'temp_order_id',
          total_value: totals.total,
          item_count: itemCount,
          payment_method: paymentInfo.method
        }
      })

      // Simula delay per processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Pulisci carrello e redirect a success
      clearCart()
      router.push('/checkout/success?order=temp_order_id')

    } catch (error) {
      console.error('Errore nell\'invio dell\'ordine:', error)
      alert('Errore nel processare l\'ordine. Riprova.')
    } finally {
      setIsProcessing(false)
    }
  }

  const { subtotal, shipping, total } = calculateTotal()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-5 w-5" />
              Torna al carrello
            </button>

            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">Checkout sicuro</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Steps */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                      ${currentStep > index ? 'bg-green-500 text-white' :
                        currentStep === index ? 'bg-piucane-primary text-white' : 'bg-gray-200 text-gray-500'}
                    `}>
                      {currentStep > index ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`
                        h-1 w-16 mx-2
                        ${currentStep > index ? 'bg-green-500' : 'bg-gray-200'}
                      `} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <h2 className="text-xl font-semibold text-gray-900">{steps[currentStep].title}</h2>
                <p className="text-gray-600">{steps[currentStep].description}</p>
              </div>
            </div>

            {/* Step Content */}
            <Card>
              <CardContent className="p-6">
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Informazioni di Contatto</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input
                          type="text"
                          value={personalInfo.firstName}
                          onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-md ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Il tuo nome"
                        />
                        {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                        <input
                          type="text"
                          value={personalInfo.lastName}
                          onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-md ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Il tuo cognome"
                        />
                        {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="tua@email.com"
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                      <input
                        type="tel"
                        value={personalInfo.phone}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="+39 333 123 4567"
                      />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Indirizzo di Spedizione</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                      <input
                        type="text"
                        value={shippingAddress.street}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md ${errors.street ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Via/Piazza e numero civico"
                      />
                      {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                        <input
                          type="text"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-md ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Roma"
                        />
                        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                        <input
                          type="text"
                          value={shippingAddress.postalCode}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-md ${errors.postalCode ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="00100"
                        />
                        {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                        <input
                          type="text"
                          value={shippingAddress.province}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, province: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-md ${errors.province ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="RM"
                        />
                        {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={billingAddress.sameAsShipping}
                          onChange={(e) => setBillingAddress(prev => ({ ...prev, sameAsShipping: e.target.checked }))}
                          className="text-piucane-primary"
                        />
                        <span className="text-sm text-gray-700">L'indirizzo di fatturazione è lo stesso</span>
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Metodo di Pagamento</h3>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="payment"
                          value="card"
                          checked={paymentInfo.method === 'card'}
                          onChange={(e) => setPaymentInfo(prev => ({ ...prev, method: e.target.value as any }))}
                          className="text-piucane-primary"
                        />
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">Carta di Credito/Debito</p>
                          <p className="text-sm text-gray-600">Visa, Mastercard, American Express</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="payment"
                          value="paypal"
                          checked={paymentInfo.method === 'paypal'}
                          onChange={(e) => setPaymentInfo(prev => ({ ...prev, method: e.target.value as any }))}
                          className="text-piucane-primary"
                        />
                        <div className="w-5 h-5 bg-blue-500 rounded text-white text-xs flex items-center justify-center">P</div>
                        <div>
                          <p className="font-medium text-gray-900">PayPal</p>
                          <p className="text-sm text-gray-600">Paga con il tuo account PayPal</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="payment"
                          value="bank_transfer"
                          checked={paymentInfo.method === 'bank_transfer'}
                          onChange={(e) => setPaymentInfo(prev => ({ ...prev, method: e.target.value as any }))}
                          className="text-piucane-primary"
                        />
                        <Package className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">Bonifico Bancario</p>
                          <p className="text-sm text-gray-600">Pagamento in 3-5 giorni lavorativi</p>
                        </div>
                      </label>
                    </div>

                    <div className="mt-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={paymentInfo.savePayment}
                          onChange={(e) => setPaymentInfo(prev => ({ ...prev, savePayment: e.target.checked }))}
                          className="text-piucane-primary"
                        />
                        <span className="text-sm text-gray-700">Salva questo metodo di pagamento per acquisti futuri</span>
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Conferma il tuo Ordine</h3>

                    {/* Order Summary */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Prodotti Ordinati</h4>
                      {items.map((item) => {
                        const product = piuCaneProducts.find(p => p.id === item.productId)
                        const format = product?.formats.find(f => f.id === item.formatId)

                        if (!product || !format) return null

                        return (
                          <div key={`${item.productId}-${item.formatId}`} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                            <img src={product.images[0]} alt={product.name} className="w-16 h-16 rounded object-cover" />
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{product.name}</h5>
                              <p className="text-sm text-gray-600">{format.size}</p>
                              <p className="text-sm text-gray-600">Quantità: {item.quantity}</p>
                              {item.subscriptionFrequency !== 'none' && (
                                <p className="text-xs text-piucane-primary">Abbonamento {item.subscriptionFrequency}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">€{(format.price * item.quantity * (item.subscriptionFrequency !== 'none' ? 0.85 : 1)).toFixed(2)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Order Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Note per l'ordine (opzionale)</label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Istruzioni speciali per la consegna..."
                      />
                    </div>

                    {/* Marketing Consent */}
                    <div>
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={marketingConsent}
                          onChange={(e) => setMarketingConsent(e.target.checked)}
                          className="text-piucane-primary mt-1"
                        />
                        <span className="text-sm text-gray-700">
                          Accetto di ricevere comunicazioni marketing e promozioni da PiùCane via email
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                  >
                    Indietro
                  </Button>

                  {currentStep < steps.length - 1 ? (
                    <Button onClick={nextStep}>
                      Continua
                    </Button>
                  ) : (
                    <Button
                      onClick={submitOrder}
                      disabled={isProcessing}
                      className="min-w-[120px]"
                    >
                      {isProcessing ? 'Elaborazione...' : 'Conferma Ordine'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Riepilogo Ordine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotale ({itemCount} prodotti)</span>
                    <span className="text-gray-900">€{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Spedizione</span>
                    <span className="text-gray-900">
                      {shipping === 0 ? 'Gratis' : `€${shipping.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between font-medium text-lg">
                      <span className="text-gray-900">Totale</span>
                      <span className="text-gray-900">€{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {shipping === 0 && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">Spedizione gratuita applicata!</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-piucane-primary">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">+{Math.floor(total * 10)} punti fedeltà</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1 mb-1">
                      <Shield className="h-3 w-3" />
                      <span>Pagamento sicuro e protetto</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      <span>Reso gratuito entro 30 giorni</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

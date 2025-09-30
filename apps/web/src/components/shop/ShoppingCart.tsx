'use client'

/**
 * Carrello Acquisti Intelligente PiùCane
 * Shopping cart con calcolo automatico prezzi, bundle optimization e raccomandazioni
 */

import React, { useState, useEffect } from 'react'
import { X, Plus, Minus, ShoppingBag, Package, CreditCard, Truck, Heart, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/hooks/useCart'
import { trackCTA } from '@/analytics/ga4'
import { piuCaneProducts, PiuCaneProduct } from '@/lib/products-data'
import { recommendationEngine } from '@/lib/recommendations'

interface CartItem {
  productId: string
  formatId: string
  quantity: number
  subscriptionFrequency?: 'none' | 'monthly' | 'bimonthly' | 'quarterly'
  personalizedDosage?: {
    dailyAmount: number
    duration: number
  }
  addedAt: string
}

interface ShoppingCartProps {
  isOpen: boolean
  onClose: () => void
  dogProfile?: any
}

export function ShoppingCart({ isOpen, onClose, dogProfile }: ShoppingCartProps) {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, itemCount } = useCart()
  const [bundleRecommendations, setBundleRecommendations] = useState<any[]>([])
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [shippingOptions, setShippingOptions] = useState([
    { id: 'standard', name: 'Spedizione Standard', price: 0, days: '3-5 giorni', threshold: 49 },
    { id: 'express', name: 'Spedizione Express', price: 7.99, days: '1-2 giorni' },
    { id: 'pickup', name: 'Ritiro in Negozio', price: 0, days: 'Oggi' }
  ])
  const [selectedShipping, setSelectedShipping] = useState('standard')
  const [promoCode, setPromoCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      trackCTA({
        ctaId: 'cart.opened',
        event: 'cart_view',
        value: 'opened',
        metadata: { itemCount, totalAmount }
      })

      // Genera raccomandazioni bundle intelligenti
      generateBundleRecommendations()

      // Calcola punti fedeltà
      calculateLoyaltyPoints()
    }
  }, [isOpen, items])

  const generateBundleRecommendations = async () => {
    if (items.length === 0 || !dogProfile) return

    const cartProductIds = items.map(item => item.productId)
    const complementaryProducts = piuCaneProducts.filter(product =>
      !cartProductIds.includes(product.id) &&
      isComplementaryProduct(product, cartProductIds)
    )

    setBundleRecommendations(complementaryProducts.slice(0, 3))
  }

  const isComplementaryProduct = (product: PiuCaneProduct, cartProductIds: string[]): boolean => {
    // Logic per determinare prodotti complementari
    const hasFood = cartProductIds.some(id => piuCaneProducts.find(p => p.id === id)?.category === 'food')
    const hasSupplements = cartProductIds.some(id => piuCaneProducts.find(p => p.id === id)?.category === 'health')

    if (hasFood && product.category === 'treats') return true
    if (hasFood && product.category === 'health' && !hasSupplements) return true
    if (product.tags.includes('bundle-recommended')) return true

    return false
  }

  const calculateLoyaltyPoints = () => {
    const points = Math.floor(totalAmount * 10) // 10 punti per euro speso
    setLoyaltyPoints(points)
  }

  const getProductDetails = (productId: string) => {
    return piuCaneProducts.find(p => p.id === productId)
  }

  const getFormatDetails = (product: PiuCaneProduct, formatId: string) => {
    return product.formats.find(f => f.id === formatId)
  }

  const calculateItemTotal = (item: CartItem) => {
    const product = getProductDetails(item.productId)
    const format = product ? getFormatDetails(product, item.formatId) : null

    if (!product || !format) return 0

    let basePrice = format.price

    // Sconto abbonamento
    if (item.subscriptionFrequency !== 'none') {
      basePrice *= 0.85 // 15% di sconto per abbonamenti
    }

    return basePrice * item.quantity
  }

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + calculateItemTotal(item), 0)
  }

  const calculateShipping = () => {
    const selectedOption = shippingOptions.find(option => option.id === selectedShipping)
    if (!selectedOption) return 0

    const subtotal = calculateSubtotal()
    if (selectedOption.threshold && subtotal >= selectedOption.threshold) {
      return 0 // Spedizione gratuita
    }

    return selectedOption.price
  }

  const calculateTotal = () => {
    let total = calculateSubtotal() + calculateShipping()

    if (appliedDiscount) {
      total *= (1 - appliedDiscount.percentage / 100)
    }

    return total
  }

  const applyPromoCode = () => {
    const promoCodes = {
      'NEWDOG': { percentage: 15, description: 'Sconto nuovo cliente' },
      'HEALTH10': { percentage: 10, description: 'Sconto prodotti salute' },
      'BUNDLE20': { percentage: 20, description: 'Sconto bundle', minItems: 3 }
    }

    const discount = promoCodes[promoCode.toUpperCase()]

    if (discount) {
      if (discount.minItems && items.length < discount.minItems) {
        alert(`Aggiungi almeno ${discount.minItems} prodotti per questo sconto`)
        return
      }

      setAppliedDiscount(discount)
      trackCTA({
        ctaId: 'cart.promo.applied',
        event: 'promo_code_applied',
        value: promoCode,
        metadata: { discount: discount.percentage }
      })
    } else {
      alert('Codice promozionale non valido')
    }
  }

  const addBundleProduct = (product: PiuCaneProduct) => {
    const defaultFormat = product.formats[0]

    trackCTA({
      ctaId: 'cart.bundle.added',
      event: 'add_to_cart',
      value: 'bundle_recommendation',
      metadata: { productId: product.id, source: 'cart_recommendation' }
    })

    // Implementa logica per aggiungere prodotto al carrello
  }

  const proceedToCheckout = () => {
    trackCTA({
      ctaId: 'cart.checkout.proceed',
      event: 'begin_checkout',
      value: 'cart',
      metadata: {
        itemCount: items.length,
        total: calculateTotal(),
        shippingMethod: selectedShipping
      }
    })

    // Redirect to checkout
    window.location.href = '/checkout'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-piucane-primary" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Il tuo carrello</h2>
              <p className="text-sm text-gray-600">{itemCount} prodotto{itemCount !== 1 ? 'i' : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {items.length === 0 ? (
          // Carrello vuoto
          <div className="flex flex-col items-center justify-center h-96 px-6">
            <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Il tuo carrello è vuoto</h3>
            <p className="text-gray-600 text-center mb-6">
              Scopri i nostri prodotti premium per il benessere del tuo cane
            </p>
            <Button onClick={onClose} className="w-full">
              Continua lo shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="px-6 py-4 space-y-4">
              {items.map((item) => {
                const product = getProductDetails(item.productId)
                const format = product ? getFormatDetails(product, item.formatId) : null

                if (!product || !format) return null

                return (
                  <Card key={`${item.productId}-${item.formatId}`} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                          <p className="text-sm text-gray-600">{format.size}</p>

                          {item.subscriptionFrequency !== 'none' && (
                            <div className="flex items-center gap-1 mt-1">
                              <Package className="h-3 w-3 text-piucane-primary" />
                              <span className="text-xs text-piucane-primary font-medium">
                                Abbonamento {item.subscriptionFrequency}
                              </span>
                            </div>
                          )}

                          {item.personalizedDosage && (
                            <p className="text-xs text-gray-500 mt-1">
                              Dosaggio: {item.personalizedDosage.dailyAmount}g/giorno
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.productId, item.formatId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.productId, item.formatId, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                €{calculateItemTotal(item).toFixed(2)}
                              </p>
                              {item.subscriptionFrequency !== 'none' && (
                                <p className="text-xs text-piucane-primary">-15% abbonamento</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productId, item.formatId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Bundle Recommendations */}
            {bundleRecommendations.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Prodotti consigliati per {dogProfile?.name}
                </h3>
                <div className="space-y-3">
                  {bundleRecommendations.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 p-3 bg-piucane-light rounded-lg">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-600">€{product.price.toFixed(2)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBundleProduct(product)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Aggiungi
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Code */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Codice promozionale"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <Button variant="outline" size="sm" onClick={applyPromoCode}>
                  Applica
                </Button>
              </div>
              {appliedDiscount && (
                <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                  {appliedDiscount.description} (-{appliedDiscount.percentage}%)
                </div>
              )}
            </div>

            {/* Shipping Options */}
            <div className="px-6 py-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Opzioni di consegna</h3>
              <div className="space-y-2">
                {shippingOptions.map((option) => (
                  <label key={option.id} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={selectedShipping === option.id}
                      onChange={() => setSelectedShipping(option.id)}
                      className="text-piucane-primary"
                    />
                    <Truck className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{option.name}</p>
                      <p className="text-xs text-gray-600">{option.days}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {option.price === 0 ? 'Gratis' : `€${option.price.toFixed(2)}`}
                    </p>
                  </label>
                ))}
              </div>

              {calculateSubtotal() < 49 && selectedShipping === 'standard' && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Aggiungi €{(49 - calculateSubtotal()).toFixed(2)} per la spedizione gratuita
                </div>
              )}
            </div>

            {/* Loyalty Points */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-piucane-primary" />
                  <span className="text-sm text-gray-700">Punti fedeltà guadagnati</span>
                </div>
                <span className="text-sm font-medium text-piucane-primary">+{loyaltyPoints} punti</span>
              </div>
            </div>

            {/* Summary */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotale</span>
                  <span className="text-gray-900">€{calculateSubtotal().toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Spedizione</span>
                  <span className="text-gray-900">
                    {calculateShipping() === 0 ? 'Gratis' : `€${calculateShipping().toFixed(2)}`}
                  </span>
                </div>

                {appliedDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>Sconto ({appliedDiscount.percentage}%)</span>
                    <span>-€{(calculateSubtotal() * appliedDiscount.percentage / 100).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-medium text-base pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Totale</span>
                  <span className="text-gray-900">€{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <Button
                onClick={proceedToCheckout}
                className="w-full"
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Procedi al checkout
              </Button>

              <p className="text-xs text-gray-500 text-center mt-2">
                Pagamento sicuro • Reso facile • Soddisfatti o rimborsati
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
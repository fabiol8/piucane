'use client'

/**
 * CreateSubscriptionModal - Modal for creating new subscriptions
 * Features: Dog selection, product selection, frequency setup, dosage calculation
 */

import React, { useState, useEffect } from 'react'
import { Search, Package, Calculator, Calendar, Dog, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trackCTA } from '@/analytics/ga4'
import { piuCaneProducts, ProductData, calculateCompatibilityScore } from '@/lib/products-data'

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
  frequency: number
  status: 'active' | 'paused' | 'cancelled'
  nextDelivery: string
  price: number
  originalPrice: number
  savings: number
  createdAt: string
  totalDeliveries: number
  isCustomizable: boolean
  autoAdjust: boolean
  personalizedDosage?: {
    dailyAmount: number
    adjustmentHistory: any[]
  }
}

interface CreateSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDog?: Dog | null
  dogs: Dog[]
  onSubscriptionCreated: (subscription: Subscription) => void
}

interface SelectedProduct {
  product: ProductData
  format: ProductData['formats'][0]
  compatibilityScore?: number
}

export function CreateSubscriptionModal({
  isOpen,
  onClose,
  selectedDog,
  dogs,
  onSubscriptionCreated
}: CreateSubscriptionModalProps) {
  const [step, setStep] = useState<'dog' | 'product' | 'configure' | 'review'>('dog')
  const [chosenDog, setChosenDog] = useState<Dog | null>(selectedDog || null)
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [productCategory, setProductCategory] = useState<string>('all')
  const [isCreating, setIsCreating] = useState(false)

  // Configuration
  const [quantity, setQuantity] = useState(1)
  const [frequency, setFrequency] = useState(4) // weeks
  const [autoAdjust, setAutoAdjust] = useState(true)
  const [personalizedDosage, setPersonalizedDosage] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setStep(selectedDog ? 'product' : 'dog')
      setChosenDog(selectedDog || null)
      setSelectedProduct(null)
      setSearchQuery('')
      setProductCategory('all')
      setQuantity(1)
      setFrequency(4)
      setAutoAdjust(true)
      setPersonalizedDosage(null)

      trackCTA({
        ctaId: 'subscription.create.modal.opened',
        event: 'modal_view',
        metadata: { dogId: selectedDog?.id }
      })
    }
  }, [isOpen, selectedDog])

  const getRecommendedProducts = () => {
    if (!chosenDog) return []

    return piuCaneProducts
      .filter(product => {
        // Basic category filter
        if (productCategory !== 'all' && product.category !== productCategory) return false

        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          const matchesSearch = product.name.toLowerCase().includes(query) ||
                              product.description.toLowerCase().includes(query) ||
                              product.tags.some(tag => tag.toLowerCase().includes(query))
          if (!matchesSearch) return false
        }

        // Must be subscription-compatible
        return product.subscriptionOptions.available
      })
      .map(product => ({
        product,
        compatibilityScore: calculateCompatibilityScore(product, chosenDog)
      }))
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 12) // Limit results
  }

  const calculateDosage = (product: ProductData, dog: Dog): number | null => {
    if (product.category !== 'food') return null

    const guideline = product.feedingGuidelines.find(g => dog.weight <= g.weight) ||
                     product.feedingGuidelines[product.feedingGuidelines.length - 1]

    if (!guideline) return null

    let amount = guideline.dailyAmount

    // Adjust for activity level
    switch (dog.activityLevel) {
      case 'low': amount *= 0.85; break
      case 'high': amount *= 1.15; break
    }

    return Math.round(amount)
  }

  const calculateDeliverySchedule = () => {
    if (!selectedProduct || !chosenDog) return null

    const dosage = personalizedDosage || calculateDosage(selectedProduct.product, chosenDog) || 0
    const formatWeight = selectedProduct.format.weight * 1000 // Convert to grams
    const daysPerPackage = formatWeight / dosage
    const totalDays = daysPerPackage * quantity
    const optimalFrequency = Math.ceil(totalDays / 7)

    return {
      dosage,
      daysPerPackage: Math.floor(daysPerPackage),
      totalDays: Math.floor(totalDays),
      optimalFrequency,
      isOptimal: Math.abs(frequency - optimalFrequency) <= 1
    }
  }

  const handleDogSelect = (dog: Dog) => {
    setChosenDog(dog)
    setStep('product')

    trackCTA({
      ctaId: 'subscription.create.dog.selected',
      event: 'dog_selected',
      value: dog.id,
      metadata: { dogName: dog.name, dogBreed: dog.breed }
    })
  }

  const handleProductSelect = (product: ProductData, format: ProductData['formats'][0], compatibilityScore: number) => {
    setSelectedProduct({ product, format, compatibilityScore })

    // Auto-calculate dosage if it's food
    if (chosenDog && product.category === 'food') {
      const dosage = calculateDosage(product, chosenDog)
      setPersonalizedDosage(dosage)
    }

    // Set recommended frequency
    if (product.subscriptionOptions.recommendedFrequency) {
      setFrequency(product.subscriptionOptions.recommendedFrequency)
    }

    setStep('configure')

    trackCTA({
      ctaId: 'subscription.create.product.selected',
      event: 'product_selected',
      value: product.id,
      metadata: {
        productName: product.name,
        compatibilityScore,
        dogId: chosenDog?.id
      }
    })
  }

  const handleCreateSubscription = async () => {
    if (!chosenDog || !selectedProduct) return

    setIsCreating(true)

    try {
      // Calculate next delivery date
      const nextDelivery = new Date()
      nextDelivery.setDate(nextDelivery.getDate() + (frequency * 7))

      const newSubscription: Subscription = {
        id: `sub-${Date.now()}`,
        dogId: chosenDog.id,
        productId: selectedProduct.product.id,
        productName: selectedProduct.product.name,
        productBrand: selectedProduct.product.brand,
        productImage: selectedProduct.product.images[0],
        formatId: selectedProduct.format.id,
        formatSize: selectedProduct.format.size,
        quantity,
        frequency,
        status: 'active',
        nextDelivery: nextDelivery.toISOString().split('T')[0],
        price: selectedProduct.format.subscriberPrice,
        originalPrice: selectedProduct.format.price,
        savings: selectedProduct.format.price - selectedProduct.format.subscriberPrice,
        createdAt: new Date().toISOString().split('T')[0],
        totalDeliveries: 0,
        isCustomizable: selectedProduct.product.category === 'food',
        autoAdjust,
        personalizedDosage: personalizedDosage ? {
          dailyAmount: personalizedDosage,
          adjustmentHistory: []
        } : undefined
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      onSubscriptionCreated(newSubscription)

      trackCTA({
        ctaId: 'subscription.created',
        event: 'subscription_created',
        value: newSubscription.id,
        metadata: {
          productId: selectedProduct.product.id,
          dogId: chosenDog.id,
          frequency,
          quantity,
          price: selectedProduct.format.subscriberPrice * quantity
        }
      })

    } catch (error) {
      console.error('Error creating subscription:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const recommendedProducts = getRecommendedProducts()
  const deliverySchedule = calculateDeliverySchedule()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crea nuovo abbonamento"
      size="lg"
      closeOnOverlay={false}
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[
            { id: 'dog', label: 'Cane', icon: Dog },
            { id: 'product', label: 'Prodotto', icon: Package },
            { id: 'configure', label: 'Configura', icon: Calculator },
            { id: 'review', label: 'Conferma', icon: CheckCircle }
          ].map((stepInfo, index) => {
            const isActive = stepInfo.id === step
            const isCompleted = ['dog', 'product', 'configure', 'review'].indexOf(stepInfo.id) < ['dog', 'product', 'configure', 'review'].indexOf(step)
            const StepIcon = stepInfo.icon

            return (
              <div key={stepInfo.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isActive ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  <StepIcon className="w-4 h-4" />
                </div>
                <span className={`ml-2 text-sm ${
                  isActive ? 'font-medium text-gray-900' : 'text-gray-600'
                }`}>
                  {stepInfo.label}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Dog Selection */}
          {step === 'dog' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Per quale cane vuoi creare l'abbonamento?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dogs.map(dog => (
                  <Card
                    key={dog.id}
                    className={`cursor-pointer transition-colors ${
                      chosenDog?.id === dog.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleDogSelect(dog)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <Dog className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{dog.name}</h4>
                          <p className="text-sm text-gray-600">
                            {dog.breed} • {dog.weight}kg • {Math.floor(dog.age / 12)} anni
                          </p>
                          {dog.allergies.length > 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                              Allergico a: {dog.allergies.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Product Selection */}
          {step === 'product' && chosenDog && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Scegli il prodotto per {chosenDog.name}
              </h3>

              {/* Search and Filters */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Cerca prodotti..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'all', label: 'Tutti' },
                    { value: 'food', label: 'Alimentazione' },
                    { value: 'treats', label: 'Snack' },
                    { value: 'health', label: 'Salute' }
                  ].map(category => (
                    <Button
                      key={category.value}
                      variant={productCategory === category.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProductCategory(category.value)}
                    >
                      {category.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                {recommendedProducts.map(({ product, compatibilityScore }) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 line-clamp-2 mb-1">
                            {product.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">{product.brand}</p>

                          {/* Compatibility */}
                          <div className="flex items-center gap-2 mb-2">
                            {compatibilityScore >= 0.8 && (
                              <Badge variant="default" className="bg-green-500 text-white text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Perfetto
                              </Badge>
                            )}
                            {compatibilityScore >= 0.6 && compatibilityScore < 0.8 && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Adatto
                              </Badge>
                            )}
                            {compatibilityScore < 0.6 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Attenzione
                              </Badge>
                            )}
                          </div>

                          {/* Formats */}
                          <div className="space-y-1">
                            {product.formats.slice(0, 2).map(format => (
                              <button
                                key={format.id}
                                onClick={() => handleProductSelect(product, format, compatibilityScore)}
                                className="w-full text-left p-2 border border-gray-200 rounded hover:border-blue-300 text-sm"
                              >
                                <div className="flex justify-between items-center">
                                  <span>{format.size}</span>
                                  <span className="font-medium text-green-600">
                                    €{format.subscriberPrice.toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Ogni {product.subscriptionOptions.recommendedFrequency} settimane
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {recommendedProducts.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600">Nessun prodotto trovato</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configuration */}
          {step === 'configure' && selectedProduct && chosenDog && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Configura il tuo abbonamento
              </h3>

              <div className="space-y-6">
                {/* Product Summary */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedProduct.product.images[0]}
                        alt={selectedProduct.product.name}
                        className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{selectedProduct.product.name}</h4>
                        <p className="text-sm text-gray-600">
                          {selectedProduct.format.size} • Per {chosenDog.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantità per consegna
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequenza di consegna
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[2, 4, 6, 8].map(weeks => (
                      <button
                        key={weeks}
                        onClick={() => setFrequency(weeks)}
                        className={`p-3 text-sm border rounded-lg ${
                          frequency === weeks
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        Ogni {weeks} settiman{weeks > 1 ? 'e' : 'a'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dosage (for food products) */}
                {selectedProduct.product.category === 'food' && personalizedDosage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dosaggio giornaliero personalizzato
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={personalizedDosage}
                        onChange={(e) => setPersonalizedDosage(parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                      />
                      <span className="text-sm text-gray-600">grammi al giorno</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Basato su peso ({chosenDog.weight}kg) e attività ({chosenDog.activityLevel})
                    </p>
                  </div>
                )}

                {/* Auto-adjust */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoAdjust"
                    checked={autoAdjust}
                    onChange={(e) => setAutoAdjust(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="autoAdjust" className="ml-2 text-sm text-gray-700">
                    Regola automaticamente in base alle esigenze di {chosenDog.name}
                  </label>
                </div>

                {/* Delivery Schedule Preview */}
                {deliverySchedule && (
                  <Card className={`${deliverySchedule.isOptimal ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {deliverySchedule.isOptimal ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className={`font-medium mb-2 ${
                            deliverySchedule.isOptimal ? 'text-green-800' : 'text-orange-800'
                          }`}>
                            Programmazione consegne
                          </h4>
                          <div className="text-sm space-y-1">
                            <p>
                              • {deliverySchedule.dosage}g al giorno per {chosenDog.name}
                            </p>
                            <p>
                              • Ogni confezione dura circa {deliverySchedule.daysPerPackage} giorni
                            </p>
                            <p>
                              • {quantity} confezioni durano {deliverySchedule.totalDays} giorni
                            </p>
                            {!deliverySchedule.isOptimal && (
                              <p className="text-orange-700 font-medium">
                                • Consigliamo una frequenza di {deliverySchedule.optimalFrequency} settimane
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep('product')}>
                  Indietro
                </Button>
                <Button onClick={() => setStep('review')}>
                  Continua
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && selectedProduct && chosenDog && deliverySchedule && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Riepilogo abbonamento
              </h3>

              <div className="space-y-4">
                {/* Summary Card */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <img
                        src={selectedProduct.product.images[0]}
                        alt={selectedProduct.product.name}
                        className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {selectedProduct.product.name}
                        </h4>
                        <p className="text-gray-600 mb-2">
                          {selectedProduct.format.size} • Per {chosenDog.name}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Quantità:</span>
                            <span className="ml-2 font-medium">{quantity} pezzi</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Frequenza:</span>
                            <span className="ml-2 font-medium">Ogni {frequency} settimane</span>
                          </div>
                          {personalizedDosage && (
                            <div>
                              <span className="text-gray-600">Dosaggio:</span>
                              <span className="ml-2 font-medium">{personalizedDosage}g/giorno</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Durata:</span>
                            <span className="ml-2 font-medium">{deliverySchedule.totalDays} giorni</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          €{(selectedProduct.format.subscriberPrice * quantity).toFixed(2)}
                        </div>
                        {selectedProduct.format.price > selectedProduct.format.subscriberPrice && (
                          <div className="text-sm text-gray-500 line-through">
                            €{(selectedProduct.format.price * quantity).toFixed(2)}
                          </div>
                        )}
                        <div className="text-sm text-green-600">
                          Risparmi €{((selectedProduct.format.price - selectedProduct.format.subscriberPrice) * quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Next Delivery */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Prima consegna</p>
                        <p className="text-sm text-gray-600">
                          {new Date(Date.now() + frequency * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Benefits */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Vantaggi del tuo abbonamento</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        15% di sconto su ogni consegna
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Spedizione sempre gratuita
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Gestione flessibile (pausa, modifica, cancella)
                      </li>
                      {autoAdjust && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Dosaggio automaticamente regolato per {chosenDog.name}
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep('configure')}>
                  Indietro
                </Button>
                <Button
                  onClick={handleCreateSubscription}
                  loading={isCreating}
                  className="min-w-32"
                >
                  {isCreating ? 'Creazione...' : 'Crea abbonamento'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
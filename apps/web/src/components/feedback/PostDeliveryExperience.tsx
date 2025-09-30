'use client'

/**
 * Esperienza Post-Consegna PiùCane
 * Sistema completo di feedback, recensioni e engagement post-delivery
 */

import React, { useState, useEffect } from 'react'
import { Star, Camera, Heart, Share2, Gift, MessageCircle, CheckCircle, Package, ThumbsUp, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { trackCTA } from '@/analytics/ga4'

interface DeliveryFeedback {
  orderId: string
  deliveredAt: string
  products: Array<{
    id: string
    name: string
    image: string
    rating?: number
    reviewed?: boolean
    dogReaction?: 'loves_it' | 'likes_it' | 'neutral' | 'dislikes_it'
  }>
  deliveryExperience: {
    rating?: number
    packaging?: number
    timing?: number
    condition?: number
  }
  loyaltyPointsEarned: number
  nextRecommendations?: any[]
}

interface PostDeliveryExperienceProps {
  orderId: string
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function PostDeliveryExperience({ orderId, isOpen, onClose, onComplete }: PostDeliveryExperienceProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [feedback, setFeedback] = useState<DeliveryFeedback | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCamera, setShowCamera] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])

  const steps = [
    { id: 'delivery', title: 'Esperienza di Consegna', description: 'Come è andata la consegna?' },
    { id: 'products', title: 'Valuta i Prodotti', description: 'Cosa ne pensa il tuo cane?' },
    { id: 'photos', title: 'Condividi Momenti', description: 'Scatta una foto del tuo cane felice!' },
    { id: 'social', title: 'Condividi & Guadagna', description: 'Condividi e ottieni punti bonus' },
    { id: 'complete', title: 'Completato!', description: 'Grazie per il tuo feedback' }
  ]

  useEffect(() => {
    if (isOpen) {
      loadDeliveryData()
      trackCTA({
        ctaId: 'delivery.feedback.opened',
        event: 'feedback_flow_start',
        value: 'post_delivery',
        metadata: { orderId }
      })
    }
  }, [isOpen, orderId])

  const loadDeliveryData = async () => {
    try {
      // Simula caricamento dati consegna
      const mockFeedback: DeliveryFeedback = {
        orderId,
        deliveredAt: new Date().toISOString(),
        products: [
          {
            id: 'piucane-adult-chicken-rice',
            name: 'PiùCane Adult Pollo e Riso',
            image: '/products/piucane-adult-chicken-rice.jpg'
          }
        ],
        deliveryExperience: {},
        loyaltyPointsEarned: 150
      }

      setFeedback(mockFeedback)
    } catch (error) {
      console.error('Errore nel caricamento dati consegna:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    const newStep = Math.min(currentStep + 1, steps.length - 1)
    setCurrentStep(newStep)

    trackCTA({
      ctaId: 'delivery.feedback.step_next',
      event: 'feedback_step_progress',
      value: steps[newStep].id,
      metadata: { orderId, fromStep: currentStep, toStep: newStep }
    })

    if (newStep === steps.length - 1) {
      // Ultimo step - completa feedback
      setTimeout(() => {
        onComplete()
        onClose()
      }, 3000)
    }
  }

  const rateDeliveryAspect = (aspect: keyof DeliveryFeedback['deliveryExperience'], rating: number) => {
    if (!feedback) return

    setFeedback(prev => ({
      ...prev!,
      deliveryExperience: {
        ...prev!.deliveryExperience,
        [aspect]: rating
      }
    }))

    trackCTA({
      ctaId: 'delivery.feedback.aspect_rated',
      event: 'delivery_aspect_rating',
      value: aspect,
      metadata: { orderId, rating, aspect }
    })
  }

  const rateProduct = (productId: string, rating: number) => {
    if (!feedback) return

    setFeedback(prev => ({
      ...prev!,
      products: prev!.products.map(product =>
        product.id === productId ? { ...product, rating } : product
      )
    }))

    trackCTA({
      ctaId: 'delivery.feedback.product_rated',
      event: 'product_rating',
      value: productId,
      metadata: { orderId, productId, rating }
    })
  }

  const setDogReaction = (productId: string, reaction: 'loves_it' | 'likes_it' | 'neutral' | 'dislikes_it') => {
    if (!feedback) return

    setFeedback(prev => ({
      ...prev!,
      products: prev!.products.map(product =>
        product.id === productId ? { ...product, dogReaction: reaction } : product
      )
    }))

    trackCTA({
      ctaId: 'delivery.feedback.dog_reaction',
      event: 'dog_product_reaction',
      value: reaction,
      metadata: { orderId, productId, reaction }
    })
  }

  const takePhoto = () => {
    setShowCamera(true)
    trackCTA({
      ctaId: 'delivery.feedback.photo_start',
      event: 'photo_capture_start',
      value: 'camera_opened',
      metadata: { orderId }
    })
  }

  const shareExperience = async (platform: string) => {
    trackCTA({
      ctaId: 'delivery.feedback.shared',
      event: 'experience_shared',
      value: platform,
      metadata: { orderId, platform }
    })

    const shareText = `Il mio cane adora i prodotti PiùCane! 🐕❤️ #PiùCane #DogLove`

    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'PiùCane - Il mio cane è felice!',
          text: shareText,
          url: window.location.origin
        })
      } catch (error) {
        // Fallback
        navigator.clipboard.writeText(shareText + ' ' + window.location.origin)
        alert('Testo copiato negli appunti!')
      }
    } else {
      // Apri social network specifico
      let url = ''
      switch (platform) {
        case 'instagram':
          url = `https://www.instagram.com/create/story/`
          break
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(shareText)}`
          break
        case 'twitter':
          url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.origin)}`
          break
      }
      if (url) window.open(url, '_blank')
    }
  }

  const renderStarRating = (rating: number, onRate: (rating: number) => void, label: string) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(star)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <Star
              className={`h-6 w-6 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>
    </div>
  )

  const renderReactionButtons = (productId: string, currentReaction?: string) => {
    const reactions = [
      { id: 'loves_it', label: 'Lo adora!', emoji: '😍', color: 'bg-green-100 text-green-700' },
      { id: 'likes_it', label: 'Gli piace', emoji: '😊', color: 'bg-blue-100 text-blue-700' },
      { id: 'neutral', label: 'Neutrale', emoji: '😐', color: 'bg-gray-100 text-gray-700' },
      { id: 'dislikes_it', label: 'Non gradisce', emoji: '😔', color: 'bg-red-100 text-red-700' }
    ]

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Reazione del tuo cane</p>
        <div className="grid grid-cols-2 gap-2">
          {reactions.map((reaction) => (
            <button
              key={reaction.id}
              onClick={() => setDogReaction(productId, reaction.id as any)}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                currentReaction === reaction.id
                  ? reaction.color + ' border-current'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">{reaction.emoji}</span>
              {reaction.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!isOpen || isLoading) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{steps[currentStep].title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`h-2 flex-1 rounded ${
                  index <= currentStep ? 'bg-piucane-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">{steps[currentStep].description}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 0 && feedback && (
            <div className="space-y-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ordine Consegnato! 🎉
                </h3>
                <p className="text-gray-600">
                  Consegnato il {new Date(feedback.deliveredAt).toLocaleDateString('it-IT')}
                </p>
              </div>

              <div className="space-y-4">
                {renderStarRating(
                  feedback.deliveryExperience.rating || 0,
                  (rating) => rateDeliveryAspect('rating', rating),
                  'Valutazione complessiva della consegna'
                )}

                {renderStarRating(
                  feedback.deliveryExperience.packaging || 0,
                  (rating) => rateDeliveryAspect('packaging', rating),
                  'Qualità del packaging'
                )}

                {renderStarRating(
                  feedback.deliveryExperience.timing || 0,
                  (rating) => rateDeliveryAspect('timing', rating),
                  'Puntualità della consegna'
                )}

                {renderStarRating(
                  feedback.deliveryExperience.condition || 0,
                  (rating) => rateDeliveryAspect('condition', rating),
                  'Condizioni del prodotto'
                )}
              </div>
            </div>
          )}

          {currentStep === 1 && feedback && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Come sono i prodotti?
                </h3>
                <p className="text-gray-600">Aiutaci a capire cosa pensa il tuo cane</p>
              </div>

              {feedback.products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                    </div>

                    <div className="space-y-4">
                      {renderStarRating(
                        product.rating || 0,
                        (rating) => rateProduct(product.id, rating),
                        'Valutazione del prodotto'
                      )}

                      {renderReactionButtons(product.id, product.dogReaction)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 text-center">
              <Camera className="h-12 w-12 text-blue-500 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900">
                Immortala questo momento!
              </h3>
              <p className="text-gray-600">
                Scatta una foto del tuo cane che gusta i prodotti PiùCane
              </p>

              <div className="space-y-4">
                <Button onClick={takePhoto} className="w-full">
                  <Camera className="h-5 w-5 mr-2" />
                  Scatta Foto
                </Button>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                    ))}
                  </div>
                )}

                <Button variant="outline" onClick={nextStep}>
                  Salta questo step
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && feedback && (
            <div className="space-y-6 text-center">
              <Share2 className="h-12 w-12 text-purple-500 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900">
                Condividi la gioia! 🎁
              </h3>
              <p className="text-gray-600">
                Condividi la tua esperienza e guadagna <span className="font-semibold text-piucane-primary">+{feedback.loyaltyPointsEarned} punti</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => shareExperience('instagram')}
                  className="flex-1"
                >
                  Instagram
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareExperience('facebook')}
                  className="flex-1"
                >
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareExperience('twitter')}
                  className="flex-1"
                >
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareExperience('native')}
                  className="flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Altro
                </Button>
              </div>

              <Button variant="outline" onClick={nextStep}>
                Salta questo step
              </Button>
            </div>
          )}

          {currentStep === 4 && feedback && (
            <div className="space-y-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-2xl font-bold text-gray-900">Grazie! 🎉</h3>
              <p className="text-gray-600">
                Il tuo feedback ci aiuta a migliorare l'esperienza per tutti i cani
              </p>

              <div className="bg-piucane-light rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="h-5 w-5 text-piucane-primary" />
                  <span className="font-medium text-piucane-primary">
                    +{feedback.loyaltyPointsEarned} punti guadagnati!
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Usa i tuoi punti per sconti sui prossimi ordini
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => window.location.href = '/shop'}
                  className="w-full"
                >
                  Continua lo Shopping
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/chat'}
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Parla con un Esperto
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep < steps.length - 1 && (
          <div className="p-6 border-t border-gray-200 flex justify-between">
            <Button variant="ghost" onClick={onClose}>
              Chiudi
            </Button>
            <Button onClick={nextStep}>
              {currentStep === steps.length - 2 ? 'Completa' : 'Continua'}
            </Button>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-60 bg-black flex items-center justify-center">
          <div className="text-center text-white">
            <Camera className="h-16 w-16 mx-auto mb-4" />
            <p className="mb-4">Funzionalità fotocamera in sviluppo</p>
            <Button
              variant="outline"
              onClick={() => {
                setShowCamera(false)
                setPhotos(prev => [...prev, '/placeholder-dog-photo.jpg'])
                trackCTA({
                  ctaId: 'delivery.feedback.photo_taken',
                  event: 'photo_captured',
                  value: 'photo_added',
                  metadata: { orderId }
                })
              }}
            >
              Simula Foto Scattata
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
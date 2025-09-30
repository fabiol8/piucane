'use client'

/**
 * Sistema di Recensioni PiùCane
 * Sistema completo per gestire recensioni e feedback dei prodotti
 */

import React, { useState, useEffect } from 'react'
import { Star, ThumbsUp, ThumbsDown, Flag, Camera, Heart, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { trackCTA } from '@/analytics/ga4'

interface Review {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  productId: string
  orderId: string
  rating: number
  title: string
  content: string
  photos: string[]
  dogInfo: {
    name: string
    breed: string
    age: number
    weight: number
  }
  verified: boolean
  helpful: number
  notHelpful: number
  userVote?: 'helpful' | 'not_helpful'
  flagged: boolean
  createdAt: string
  response?: {
    content: string
    createdAt: string
    author: string
  }
}

interface ReviewStats {
  averageRating: number
  totalReviews: number
  ratingDistribution: { [key: number]: number }
  verifiedPercentage: number
}

interface ReviewSystemProps {
  productId: string
  canReview?: boolean
  orderId?: string
}

export function ReviewSystem({ productId, canReview = false, orderId }: ReviewSystemProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [filterBy, setFilterBy] = useState('all')

  useEffect(() => {
    loadReviews()
  }, [productId, sortBy, filterBy])

  const loadReviews = async () => {
    try {
      // Simula caricamento recensioni
      const mockReviews: Review[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'Marco B.',
          productId,
          orderId: 'ord-123',
          rating: 5,
          title: 'Il mio Golden Retriever lo adora!',
          content: 'Dopo 2 settimane di utilizzo posso dire che questo prodotto è fantastico. Il mio cane di 3 anni ha sempre avuto problemi digestivi, ma da quando mangia PiùCane è completamente cambiato. Pelo più lucido, più energia e niente più problemi di stomaco. Consigliatissimo!',
          photos: ['/reviews/photo1.jpg', '/reviews/photo2.jpg'],
          dogInfo: {
            name: 'Rex',
            breed: 'Golden Retriever',
            age: 36,
            weight: 28
          },
          verified: true,
          helpful: 23,
          notHelpful: 1,
          flagged: false,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          response: {
            content: 'Grazie Marco per la tua recensione! Siamo felici che Rex stia così bene con i nostri prodotti. Continua così!',
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            author: 'Team PiùCane'
          }
        },
        {
          id: '2',
          userId: 'user2',
          userName: 'Sara L.',
          productId,
          orderId: 'ord-124',
          rating: 4,
          title: 'Ottimo prodotto, ma prezzo alto',
          content: 'La qualità è indubbia, ingredienti naturali e il mio Beagle lo gradisce molto. Unica pecca il prezzo un po\' sopra la media, ma considerando la qualità vale la pena.',
          photos: [],
          dogInfo: {
            name: 'Luna',
            breed: 'Beagle',
            age: 18,
            weight: 12
          },
          verified: true,
          helpful: 15,
          notHelpful: 3,
          flagged: false,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          userId: 'user3',
          userName: 'Giulia M.',
          productId,
          orderId: 'ord-125',
          rating: 5,
          title: 'Perfetto per cani senior',
          content: 'Il mio pastore tedesco di 9 anni ha ritrovato vitalità con questo cibo. Facile da digerire e molto appetitoso.',
          photos: ['/reviews/photo3.jpg'],
          dogInfo: {
            name: 'Max',
            breed: 'Pastore Tedesco',
            age: 108,
            weight: 35
          },
          verified: true,
          helpful: 8,
          notHelpful: 0,
          flagged: false,
          createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      const mockStats: ReviewStats = {
        averageRating: 4.7,
        totalReviews: mockReviews.length,
        ratingDistribution: {
          5: 2,
          4: 1,
          3: 0,
          2: 0,
          1: 0
        },
        verifiedPercentage: 100
      }

      // Applica filtri e ordinamento
      let filteredReviews = mockReviews

      if (filterBy !== 'all') {
        filteredReviews = mockReviews.filter(review => {
          switch (filterBy) {
            case 'verified': return review.verified
            case 'photos': return review.photos.length > 0
            case '5star': return review.rating === 5
            case '4star': return review.rating === 4
            case '3star': return review.rating === 3
            case '2star': return review.rating === 2
            case '1star': return review.rating === 1
            default: return true
          }
        })
      }

      filteredReviews.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          case 'rating_high':
            return b.rating - a.rating
          case 'rating_low':
            return a.rating - b.rating
          case 'helpful':
            return b.helpful - a.helpful
          default:
            return 0
        }
      })

      setReviews(filteredReviews)
      setStats(mockStats)

      trackCTA({
        ctaId: 'reviews.loaded',
        event: 'reviews_viewed',
        value: 'reviews_loaded',
        metadata: { productId, reviewCount: filteredReviews.length }
      })

    } catch (error) {
      console.error('Errore nel caricamento recensioni:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const voteReview = async (reviewId: string, vote: 'helpful' | 'not_helpful') => {
    trackCTA({
      ctaId: 'reviews.vote',
      event: 'review_vote',
      value: vote,
      metadata: { productId, reviewId, vote }
    })

    setReviews(prev => prev.map(review => {
      if (review.id === reviewId) {
        const currentVote = review.userVote
        let helpful = review.helpful
        let notHelpful = review.notHelpful

        // Rimuovi voto precedente
        if (currentVote === 'helpful') helpful--
        if (currentVote === 'not_helpful') notHelpful--

        // Aggiungi nuovo voto se diverso
        if (currentVote !== vote) {
          if (vote === 'helpful') helpful++
          if (vote === 'not_helpful') notHelpful++
          return { ...review, helpful, notHelpful, userVote: vote }
        } else {
          return { ...review, helpful, notHelpful, userVote: undefined }
        }
      }
      return review
    }))
  }

  const flagReview = async (reviewId: string) => {
    trackCTA({
      ctaId: 'reviews.flag',
      event: 'review_flagged',
      value: 'content_reported',
      metadata: { productId, reviewId }
    })

    alert('Recensione segnalata. Grazie per aver contribuito alla qualità delle recensioni.')
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }

    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const renderRatingDistribution = () => {
    if (!stats) return null

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center gap-2 text-sm">
            <span className="w-8">{rating}</span>
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full"
                style={{
                  width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[rating] / stats.totalReviews) * 100 : 0}%`
                }}
              />
            </div>
            <span className="w-8 text-gray-600">{stats.ratingDistribution[rating]}</span>
          </div>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Reviews Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Recensioni Clienti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {stats.averageRating.toFixed(1)}
                </div>
                {renderStars(Math.round(stats.averageRating), 'lg')}
                <p className="text-sm text-gray-600 mt-2">
                  {stats.totalReviews} recensioni • {stats.verifiedPercentage}% verificate
                </p>
              </div>

              <div>
                {renderRatingDistribution()}
              </div>
            </div>

            {canReview && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => setShowWriteReview(true)}
                  className="w-full md:w-auto"
                >
                  Scrivi una recensione
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Tutte le recensioni</option>
            <option value="verified">Solo verificate</option>
            <option value="photos">Con foto</option>
            <option value="5star">5 stelle</option>
            <option value="4star">4 stelle</option>
            <option value="3star">3 stelle</option>
            <option value="2star">2 stelle</option>
            <option value="1star">1 stella</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="newest">Più recenti</option>
            <option value="oldest">Più vecchie</option>
            <option value="rating_high">Voto più alto</option>
            <option value="rating_low">Voto più basso</option>
            <option value="helpful">Più utili</option>
          </select>
        </div>

        <p className="text-sm text-gray-600">
          {reviews.length} di {stats?.totalReviews} recensioni
        </p>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessuna recensione trovata
              </h3>
              <p className="text-gray-600">
                {canReview ? 'Sii il primo a recensire questo prodotto!' : 'Prova a modificare i filtri'}
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {review.userAvatar ? (
                        <img src={review.userAvatar} alt={review.userName} className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="font-medium text-gray-600">
                          {review.userName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{review.userName}</span>
                        {review.verified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {renderStars(review.rating, 'sm')}
                        <span>•</span>
                        <span>{new Date(review.createdAt).toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => flagReview(review.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                  <p className="text-gray-700 leading-relaxed">{review.content}</p>
                </div>

                {/* Dog Info */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Heart className="h-4 w-4" />
                    <span className="font-medium">Informazioni sul cane:</span>
                    <span>
                      {review.dogInfo.name} • {review.dogInfo.breed} • {Math.floor(review.dogInfo.age / 12)} anni • {review.dogInfo.weight}kg
                    </span>
                  </div>
                </div>

                {/* Photos */}
                {review.photos.length > 0 && (
                  <div className="mb-4">
                    <div className="flex gap-2 overflow-x-auto">
                      {review.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Foto recensione ${index + 1}`}
                          className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand Response */}
                {review.response && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-piucane-primary">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-piucane-primary">{review.response.author}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(review.response.createdAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    <p className="text-gray-700">{review.response.content}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => voteReview(review.id, 'helpful')}
                      className={`flex items-center gap-1 text-sm rounded px-2 py-1 transition-colors ${
                        review.userVote === 'helpful'
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      Utile ({review.helpful})
                    </button>

                    <button
                      onClick={() => voteReview(review.id, 'not_helpful')}
                      className={`flex items-center gap-1 text-sm rounded px-2 py-1 transition-colors ${
                        review.userVote === 'not_helpful'
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ThumbsDown className="h-3 w-3" />
                      Non utile ({review.notHelpful})
                    </button>
                  </div>

                  {review.verified && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Acquisto verificato
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Write Review Modal */}
      {showWriteReview && (
        <WriteReviewModal
          productId={productId}
          orderId={orderId}
          isOpen={showWriteReview}
          onClose={() => setShowWriteReview(false)}
          onSubmit={(reviewData) => {
            // Add new review to list
            const newReview: Review = {
              id: Date.now().toString(),
              userId: 'current-user',
              userName: 'Tu',
              productId,
              orderId: orderId || '',
              ...reviewData,
              photos: [],
              verified: true,
              helpful: 0,
              notHelpful: 0,
              flagged: false,
              createdAt: new Date().toISOString()
            }

            setReviews(prev => [newReview, ...prev])
            setShowWriteReview(false)

            trackCTA({
              ctaId: 'reviews.submitted',
              event: 'review_submitted',
              value: 'review_created',
              metadata: { productId, rating: reviewData.rating }
            })
          }}
        />
      )}
    </div>
  )
}

interface WriteReviewModalProps {
  productId: string
  orderId?: string
  isOpen: boolean
  onClose: () => void
  onSubmit: (reviewData: any) => void
}

function WriteReviewModal({ productId, orderId, isOpen, onClose, onSubmit }: WriteReviewModalProps) {
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    content: '',
    dogInfo: {
      name: '',
      breed: '',
      age: 0,
      weight: 0
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Scrivi una recensione</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valutazione complessiva
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titolo della recensione
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Riassumi la tua esperienza"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              La tua recensione
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Descrivi la tua esperienza con questo prodotto..."
              required
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Informazioni sul tuo cane</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.dogInfo.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    dogInfo: { ...prev.dogInfo, name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Nome del cane"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Razza</label>
                <input
                  type="text"
                  value={formData.dogInfo.breed}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    dogInfo: { ...prev.dogInfo, breed: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Razza"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Età (mesi)</label>
                <input
                  type="number"
                  value={formData.dogInfo.age}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    dogInfo: { ...prev.dogInfo, age: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Età in mesi"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  value={formData.dogInfo.weight}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    dogInfo: { ...prev.dogInfo, weight: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Peso in kg"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={!formData.rating || !formData.title.trim() || !formData.content.trim()}
            >
              Pubblica recensione
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
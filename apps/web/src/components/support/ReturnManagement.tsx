'use client'

/**
 * Sistema di Gestione Resi e Problemi - PiùCane
 * Gestione automatica di resi, rimborsi e risoluzione problemi
 */

import React, { useState, useEffect } from 'react'
import { AlertTriangle, Camera, Upload, CheckCircle, Clock, RefreshCw, MessageCircle, Package, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { trackCTA } from '@/analytics/ga4'

interface ProblemCategory {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  autoResolution?: boolean
  estimatedTime: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

interface ReturnRequest {
  id: string
  orderId: string
  type: 'return' | 'refund' | 'exchange' | 'complaint'
  category: string
  reason: string
  description: string
  photos: string[]
  videos: string[]
  preferredResolution: 'refund' | 'replacement' | 'store_credit'
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'processing' | 'completed'
  timeline: Array<{
    status: string
    timestamp: string
    description: string
    automated: boolean
  }>
  customerServiceNotes?: string
  resolutionDetails?: {
    type: 'refund' | 'replacement' | 'store_credit' | 'partial_refund'
    amount?: number
    trackingNumber?: string
    estimatedArrival?: string
  }
  createdAt: string
  updatedAt: string
}

interface ReturnManagementProps {
  orderId: string
  products: Array<{
    id: string
    name: string
    image: string
    price: number
    quantity: number
  }>
  onRequestSubmitted: (request: ReturnRequest) => void
}

export function ReturnManagement({ orderId, products, onRequestSubmitted }: ReturnManagementProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [problemDescription, setProblemDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [preferredResolution, setPreferredResolution] = useState<'refund' | 'replacement' | 'store_credit'>('replacement')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const problemCategories: ProblemCategory[] = [
    {
      id: 'missing_items',
      name: 'Articoli mancanti',
      description: 'Uno o più prodotti non sono stati consegnati',
      icon: Package,
      autoResolution: true,
      estimatedTime: '24 ore',
      priority: 'high'
    },
    {
      id: 'damaged_package',
      name: 'Pacco danneggiato',
      description: 'La confezione è arrivata danneggiata o rovinata',
      icon: AlertTriangle,
      autoResolution: false,
      estimatedTime: '2-3 giorni',
      priority: 'medium'
    },
    {
      id: 'wrong_product',
      name: 'Prodotto sbagliato',
      description: 'È arrivato un prodotto diverso da quello ordinato',
      icon: RefreshCw,
      autoResolution: true,
      estimatedTime: '48 ore',
      priority: 'high'
    },
    {
      id: 'quality_issue',
      name: 'Problema di qualità',
      description: 'Il prodotto presenta difetti o problemi di qualità',
      icon: AlertTriangle,
      autoResolution: false,
      estimatedTime: '3-5 giorni',
      priority: 'medium'
    },
    {
      id: 'dog_reaction',
      name: 'Reazione del cane',
      description: 'Il cane ha avuto una reazione negativa al prodotto',
      icon: AlertTriangle,
      autoResolution: false,
      estimatedTime: '24-48 ore',
      priority: 'urgent'
    },
    {
      id: 'delivery_issue',
      name: 'Problema di consegna',
      description: 'Problemi con tempistiche o modalità di consegna',
      icon: Clock,
      autoResolution: true,
      estimatedTime: '24 ore',
      priority: 'medium'
    },
    {
      id: 'billing_issue',
      name: 'Problema di fatturazione',
      description: 'Errori nell\'importo addebitato o nella fattura',
      icon: CreditCard,
      autoResolution: true,
      estimatedTime: '2-4 ore',
      priority: 'high'
    }
  ]

  const steps = [
    { id: 'category', title: 'Tipo di problema', description: 'Seleziona la categoria che descrive meglio il tuo problema' },
    { id: 'products', title: 'Prodotti coinvolti', description: 'Quali prodotti sono interessati dal problema?' },
    { id: 'details', title: 'Dettagli del problema', description: 'Descrivi il problema in dettaglio' },
    { id: 'evidence', title: 'Documentazione', description: 'Aggiungi foto o video del problema (opzionale)' },
    { id: 'resolution', title: 'Risoluzione preferita', description: 'Come preferisci che risolviamo il problema?' },
    { id: 'review', title: 'Conferma', description: 'Rivedi e invia la tua richiesta' }
  ]

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setPhotos(prev => [...prev, ...files].slice(0, 5)) // Max 5 foto

    trackCTA({
      ctaId: 'returns.photos.uploaded',
      event: 'return_evidence_uploaded',
      value: 'photos',
      metadata: { orderId, photoCount: files.length }
    })
  }

  const handleSubmitRequest = async () => {
    if (!selectedCategory || selectedProducts.length === 0 || !problemDescription.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      const category = problemCategories.find(c => c.id === selectedCategory)!

      const returnRequest: ReturnRequest = {
        id: `return_${Date.now()}`,
        orderId,
        type: selectedCategory === 'billing_issue' ? 'complaint' : 'return',
        category: selectedCategory,
        reason: category.name,
        description: problemDescription,
        photos: photos.map(photo => URL.createObjectURL(photo)), // In produzione: upload su CDN
        videos: [],
        preferredResolution,
        status: 'submitted',
        timeline: [
          {
            status: 'submitted',
            timestamp: new Date().toISOString(),
            description: 'Richiesta inviata e ricevuta',
            automated: true
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Simula logica di auto-risoluzione per alcune categorie
      if (category.autoResolution) {
        await handleAutoResolution(returnRequest)
      } else {
        // Invia a customer service
        returnRequest.timeline.push({
          status: 'reviewing',
          timestamp: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          description: 'In revisione dal nostro team di esperti',
          automated: true
        })
      }

      onRequestSubmitted(returnRequest)

      trackCTA({
        ctaId: 'returns.request.submitted',
        event: 'return_request_submitted',
        value: selectedCategory,
        metadata: {
          orderId,
          category: selectedCategory,
          productsCount: selectedProducts.length,
          hasPhotos: photos.length > 0,
          resolution: preferredResolution,
          autoResolution: category.autoResolution
        }
      })

      // Mostra conferma
      alert('Richiesta inviata con successo! Riceverai aggiornamenti via email e nella tua inbox.')

    } catch (error) {
      console.error('Errore nell\'invio della richiesta:', error)
      alert('Errore nell\'invio della richiesta. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAutoResolution = async (request: ReturnRequest) => {
    // Logica di auto-risoluzione basata sulla categoria
    switch (request.category) {
      case 'missing_items':
        request.timeline.push(
          {
            status: 'approved',
            timestamp: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            description: 'Richiesta approvata automaticamente',
            automated: true
          },
          {
            status: 'processing',
            timestamp: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            description: 'Spedizione sostitutiva in preparazione',
            automated: true
          }
        )
        request.status = 'approved'
        request.resolutionDetails = {
          type: 'replacement',
          trackingNumber: 'PC' + Math.random().toString(36).substr(2, 8).toUpperCase(),
          estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }
        break

      case 'wrong_product':
        request.timeline.push(
          {
            status: 'approved',
            timestamp: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            description: 'Richiesta approvata - prodotto corretto in spedizione',
            automated: true
          }
        )
        request.status = 'approved'
        request.resolutionDetails = {
          type: 'replacement',
          trackingNumber: 'PC' + Math.random().toString(36).substr(2, 8).toUpperCase(),
          estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }
        break

      case 'delivery_issue':
        request.timeline.push(
          {
            status: 'approved',
            timestamp: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
            description: 'Credito di spedizione applicato al tuo account',
            automated: true
          }
        )
        request.status = 'completed'
        request.resolutionDetails = {
          type: 'store_credit',
          amount: 7.99 // Costo spedizione standard
        }
        break

      case 'billing_issue':
        const refundAmount = products.reduce((total, product) =>
          selectedProducts.includes(product.id) ? total + (product.price * product.quantity) : total, 0
        )

        request.timeline.push(
          {
            status: 'approved',
            timestamp: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
            description: 'Rimborso approvato e in elaborazione',
            automated: true
          }
        )
        request.status = 'processing'
        request.resolutionDetails = {
          type: 'refund',
          amount: refundAmount
        }
        break
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)

      trackCTA({
        ctaId: 'returns.step.next',
        event: 'return_flow_progress',
        value: steps[currentStep + 1].id,
        metadata: { orderId, fromStep: currentStep, toStep: currentStep + 1 }
      })
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedCategory !== ''
      case 1: return selectedProducts.length > 0
      case 2: return problemDescription.trim().length > 10
      case 3: return true // Photos opzionali
      case 4: return preferredResolution !== ''
      case 5: return true
      default: return false
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Segnala un Problema</h1>
        <p className="text-gray-600">Ti aiutiamo a risolvere velocemente qualsiasi problema con il tuo ordine</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${currentStep > index ? 'bg-green-500 text-white' :
                  currentStep === index ? 'bg-piucane-primary text-white' : 'bg-gray-200 text-gray-500'}
              `}>
                {currentStep > index ? <CheckCircle className="h-4 w-4" /> : index + 1}
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
      <Card className="mb-8">
        <CardContent className="p-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Che tipo di problema hai riscontrato?</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {problemCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      p-4 border rounded-lg text-left transition-all hover:shadow-md
                      ${selectedCategory === category.id
                        ? 'border-piucane-primary bg-piucane-light'
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <category.icon className={`h-6 w-6 mt-1 ${
                        category.priority === 'urgent' ? 'text-red-500' :
                        category.priority === 'high' ? 'text-orange-500' :
                        category.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{category.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>⏱️ {category.estimatedTime}</span>
                          {category.autoResolution && (
                            <span className="text-green-600">🤖 Risoluzione automatica</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedCategory && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Come procediamo</h4>
                  <p className="text-sm text-blue-700">
                    {problemCategories.find(c => c.id === selectedCategory)?.autoResolution
                      ? 'Questo tipo di problema può essere risolto automaticamente. Riceverai una soluzione immediata dopo aver completato la segnalazione.'
                      : 'Il nostro team di esperti esaminerà la tua segnalazione e ti contatterà entro 24 ore con una soluzione personalizzata.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quali prodotti sono interessati dal problema?</h3>

              <div className="space-y-3">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(prev => [...prev, product.id])
                        } else {
                          setSelectedProducts(prev => prev.filter(id => id !== product.id))
                        }
                      }}
                      className="text-piucane-primary"
                    />
                    <img src={product.image} alt={product.name} className="w-16 h-16 rounded object-cover" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-600">Quantità: {product.quantity} • €{product.price.toFixed(2)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Descrivi il problema in dettaglio</h3>

              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-piucane-primary focus:border-transparent"
                placeholder="Descrivi cosa è successo, quando hai notato il problema e qualsiasi altro dettaglio che possa aiutarci a risolverlo..."
              />

              <div className="text-sm text-gray-500">
                <p>💡 <strong>Suggerimenti:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Fornisci più dettagli possibile</li>
                  <li>Indica quando hai notato il problema</li>
                  <li>Descrivi l'impatto sul tuo cane (se applicabile)</li>
                </ul>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Aggiungi foto o video (opzionale)</h3>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/*,video/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Clicca per caricare foto o video</p>
                  <p className="text-sm text-gray-500">Max 5 file, fino a 10MB ciascuno</p>
                </label>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Perché le foto aiutano:</strong> Le immagini ci permettono di capire meglio il problema e di fornirti una soluzione più accurata e veloce.
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Come preferisci che risolviamo il problema?</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="resolution"
                    value="replacement"
                    checked={preferredResolution === 'replacement'}
                    onChange={(e) => setPreferredResolution(e.target.value as any)}
                    className="text-piucane-primary"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">Sostituzione prodotto</h4>
                    <p className="text-sm text-gray-600">Ricevi un prodotto sostitutivo (consigliato)</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="resolution"
                    value="refund"
                    checked={preferredResolution === 'refund'}
                    onChange={(e) => setPreferredResolution(e.target.value as any)}
                    className="text-piucane-primary"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">Rimborso completo</h4>
                    <p className="text-sm text-gray-600">Ricevi il rimborso sul metodo di pagamento originale</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="resolution"
                    value="store_credit"
                    checked={preferredResolution === 'store_credit'}
                    onChange={(e) => setPreferredResolution(e.target.value as any)}
                    className="text-piucane-primary"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">Credito negozio</h4>
                    <p className="text-sm text-gray-600">Ricevi un credito da utilizzare per acquisti futuri (+5% bonus)</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Conferma i dettagli della tua richiesta</h3>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Tipo di problema</h4>
                  <p className="text-gray-600">{problemCategories.find(c => c.id === selectedCategory)?.name}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Prodotti interessati</h4>
                  <div className="space-y-2">
                    {selectedProducts.map(productId => {
                      const product = products.find(p => p.id === productId)!
                      return (
                        <div key={productId} className="flex items-center gap-2">
                          <img src={product.image} alt={product.name} className="w-8 h-8 rounded object-cover" />
                          <span className="text-gray-600">{product.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Risoluzione preferita</h4>
                  <p className="text-gray-600">
                    {preferredResolution === 'replacement' && 'Sostituzione prodotto'}
                    {preferredResolution === 'refund' && 'Rimborso completo'}
                    {preferredResolution === 'store_credit' && 'Credito negozio (+5% bonus)'}
                  </p>
                </div>

                {photos.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Documentazione allegata</h4>
                    <p className="text-gray-600">{photos.length} foto/video caricati</p>
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Cosa succede ora</h4>
                    <p className="text-sm text-green-700 mt-1">
                      {problemCategories.find(c => c.id === selectedCategory)?.autoResolution
                        ? 'Riceverai una soluzione immediata dopo aver inviato la richiesta. Tempo stimato: ' +
                          problemCategories.find(c => c.id === selectedCategory)?.estimatedTime
                        : 'Il nostro team di esperti esaminerà la tua richiesta e ti contatterà entro 24 ore con una soluzione.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          Indietro
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Continua
          </Button>
        ) : (
          <Button
            onClick={handleSubmitRequest}
            disabled={!canProceed() || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Invio...' : 'Invia Richiesta'}
          </Button>
        )}
      </div>

      {/* Sicurezza e note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>🔒 Le tue informazioni sono protette e utilizzate solo per risolvere il problema</p>
        <p>Hai domande? <button className="text-piucane-primary hover:underline">Contatta il supporto</button></p>
      </div>
    </div>
  )
}
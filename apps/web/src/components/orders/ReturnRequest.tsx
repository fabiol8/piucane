'use client'

/**
 * Return Request Component - Comprehensive return request management
 * Features item selection, reason input, photo upload, and return options
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  RotateCcw,
  Camera,
  Package,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Minus,
  Upload,
  FileImage,
  Trash2,
  Save,
  ArrowLeft,
  CreditCard,
  Gift,
  RefreshCw,
  Truck,
  Home,
  Building,
  Info,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackCTA } from '@/analytics/ga4'
import type {
  Order,
  ReturnRequestForm,
  ReturnReason,
  ReturnItem
} from '@/types/orders'

interface ReturnRequestProps {
  orderId: string
  onClose: () => void
  onSubmit: (returnData: ReturnRequestForm) => Promise<void>
  initialOrder?: Order
}

const returnReasons: Array<{
  value: ReturnReason
  label: string
  description: string
  requiresPhotos: boolean
}> = [
  {
    value: 'defective',
    label: 'Prodotto difettoso',
    description: 'Il prodotto presenta difetti di fabbricazione',
    requiresPhotos: true
  },
  {
    value: 'wrong_item',
    label: 'Prodotto sbagliato',
    description: 'Ho ricevuto un prodotto diverso da quello ordinato',
    requiresPhotos: false
  },
  {
    value: 'wrong_size',
    label: 'Taglia sbagliata',
    description: 'La taglia del prodotto non è quella ordinata',
    requiresPhotos: false
  },
  {
    value: 'not_as_described',
    label: 'Non conforme alla descrizione',
    description: 'Il prodotto non corrisponde alla descrizione online',
    requiresPhotos: true
  },
  {
    value: 'changed_mind',
    label: 'Ho cambiato idea',
    description: 'Non sono più interessato al prodotto',
    requiresPhotos: false
  },
  {
    value: 'damaged_shipping',
    label: 'Danneggiato durante la spedizione',
    description: 'Il prodotto è stato danneggiato durante il trasporto',
    requiresPhotos: true
  },
  {
    value: 'expired',
    label: 'Prodotto scaduto',
    description: 'Il prodotto è arrivato scaduto o vicino alla scadenza',
    requiresPhotos: true
  },
  {
    value: 'allergic_reaction',
    label: 'Reazione allergica',
    description: 'Il mio cane ha avuto una reazione allergica',
    requiresPhotos: false
  },
  {
    value: 'other',
    label: 'Altro motivo',
    description: 'Specifica il motivo nella descrizione',
    requiresPhotos: false
  }
]

const conditionOptions = [
  { value: 'new', label: 'Come nuovo', description: 'Prodotto mai aperto/utilizzato' },
  { value: 'used', label: 'Utilizzato', description: 'Prodotto utilizzato ma in buone condizioni' },
  { value: 'damaged', label: 'Danneggiato', description: 'Prodotto danneggiato' },
  { value: 'defective', label: 'Difettoso', description: 'Prodotto con difetti' }
]

// Mock order data - in a real app this would come from an API
const mockOrder: Order = {
  id: 'ORD-12345',
  userId: 'user-123',
  orderNumber: 'PC2024010123',
  status: 'delivered',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      variantId: 'var-1',
      name: 'Royal Canin Medium Adult',
      description: 'Cibo secco per cani adulti di taglia media (15kg)',
      image: '/api/placeholder/80/80',
      quantity: 2,
      unitPrice: 59.90,
      totalPrice: 119.80,
      status: 'delivered'
    },
    {
      id: 'item-2',
      productId: 'prod-2',
      variantId: 'var-2',
      name: 'Kong Classic Large',
      description: 'Giocattolo resistente per cani di grossa taglia',
      image: '/api/placeholder/80/80',
      quantity: 1,
      unitPrice: 24.99,
      totalPrice: 24.99,
      status: 'delivered'
    },
    {
      id: 'item-3',
      productId: 'prod-3',
      variantId: 'var-3',
      name: 'Frontline Spot On',
      description: 'Antiparassitario per cani 20-40kg (6 pipette)',
      image: '/api/placeholder/80/80',
      quantity: 1,
      unitPrice: 45.50,
      totalPrice: 45.50,
      status: 'delivered'
    }
  ],
  pricing: {
    subtotal: 190.29,
    discount: 0,
    shipping: 0,
    tax: 38.06,
    total: 228.35,
    currency: 'EUR'
  },
  shipping: {
    method: 'standard',
    carrier: 'SDA',
    trackingNumber: 'SDA123456789IT',
    estimatedDelivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    actualDelivery: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    address: {
      firstName: 'Mario',
      lastName: 'Rossi',
      street: 'Via Roma',
      streetNumber: '123',
      city: 'Milano',
      province: 'MI',
      zipCode: '20121',
      country: 'Italia',
      isResidential: true
    },
    signatureRequired: false,
    insurance: true,
    weight: 15.2
  },
  payment: {
    method: 'credit_card',
    provider: 'Stripe',
    transactionId: 'ch_1234567890',
    amount: 228.35,
    currency: 'EUR',
    status: 'completed',
    paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    billingAddress: {
      firstName: 'Mario',
      lastName: 'Rossi',
      street: 'Via Roma',
      streetNumber: '123',
      city: 'Milano',
      province: 'MI',
      zipCode: '20121',
      country: 'Italia',
      isResidential: true
    }
  },
  customer: {
    userId: 'user-123',
    email: 'mario.rossi@example.com',
    firstName: 'Mario',
    lastName: 'Rossi',
    loyaltyTier: 'silver',
    isFirstOrder: false
  },
  timeline: [],
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
}

export function ReturnRequest({ orderId, onClose, onSubmit, initialOrder }: ReturnRequestProps) {
  const [order, setOrder] = useState<Order>(initialOrder || mockOrder)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'items' | 'details' | 'photos' | 'shipping' | 'review'>('items')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [returnForm, setReturnForm] = useState<ReturnRequestForm>({
    orderId,
    items: [],
    reason: 'defective',
    description: '',
    photos: [],
    returnMethod: 'pickup',
    refundMethod: 'original'
  })

  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{
    file: File
    preview: string
    id: string
  }>>([])

  useEffect(() => {
    if (!initialOrder) {
      // In a real app, you would fetch the order data
      setOrder(mockOrder)
    }
  }, [orderId, initialOrder])

  useEffect(() => {
    trackCTA({
      ctaId: 'return.request.started',
      event: 'return_request_start',
      value: orderId,
      metadata: { step }
    })
  }, [orderId, step])

  const selectedReason = returnReasons.find(r => r.value === returnForm.reason)
  const requiresPhotos = selectedReason?.requiresPhotos || false

  const handleItemToggle = (itemId: string) => {
    const existingIndex = returnForm.items.findIndex(item => item.orderItemId === itemId)
    const orderItem = order.items.find(item => item.id === itemId)

    if (!orderItem) return

    if (existingIndex >= 0) {
      // Remove item
      setReturnForm(prev => ({
        ...prev,
        items: prev.items.filter(item => item.orderItemId !== itemId)
      }))
    } else {
      // Add item
      setReturnForm(prev => ({
        ...prev,
        items: [...prev.items, {
          orderItemId: itemId,
          productId: orderItem.productId,
          name: orderItem.name,
          quantity: 1,
          reason: returnForm.reason,
          condition: 'new'
        }]
      }))
    }
  }

  const handleItemQuantityChange = (itemId: string, quantity: number) => {
    const orderItem = order.items.find(item => item.id === itemId)
    if (!orderItem || quantity <= 0 || quantity > orderItem.quantity) return

    setReturnForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.orderItemId === itemId ? { ...item, quantity } : item
      )
    }))
  }

  const handlePhotoUpload = (files: FileList) => {
    const maxPhotos = 5
    const maxFileSize = 10 * 1024 * 1024 // 10MB

    if (uploadedPhotos.length >= maxPhotos) {
      setErrors({ photos: `Massimo ${maxPhotos} foto consentite` })
      return
    }

    Array.from(files).forEach(file => {
      if (file.size > maxFileSize) {
        setErrors({ photos: 'Le foto devono essere inferiori a 10MB' })
        return
      }

      if (!file.type.startsWith('image/')) {
        setErrors({ photos: 'Solo file immagine sono consentiti' })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const id = Date.now().toString() + Math.random().toString(36)
        setUploadedPhotos(prev => [...prev, {
          file,
          preview: e.target?.result as string,
          id
        }])

        setReturnForm(prev => ({
          ...prev,
          photos: [...(prev.photos || []), file]
        }))
      }
      reader.readAsDataURL(file)
    })

    // Clear errors if upload is successful
    if (!errors.photos?.includes('Massimo') && !errors.photos?.includes('10MB')) {
      setErrors(prev => ({ ...prev, photos: '' }))
    }
  }

  const removePhoto = (photoId: string) => {
    const photoToRemove = uploadedPhotos.find(p => p.id === photoId)
    if (!photoToRemove) return

    setUploadedPhotos(prev => prev.filter(p => p.id !== photoId))
    setReturnForm(prev => ({
      ...prev,
      photos: prev.photos?.filter(f => f !== photoToRemove.file) || []
    }))
  }

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 'items':
        if (returnForm.items.length === 0) {
          newErrors.items = 'Seleziona almeno un prodotto da restituire'
        }
        break

      case 'details':
        if (!returnForm.reason) {
          newErrors.reason = 'Seleziona un motivo per il reso'
        }
        if (!returnForm.description.trim()) {
          newErrors.description = 'Fornisci una descrizione del problema'
        }
        break

      case 'photos':
        if (requiresPhotos && uploadedPhotos.length === 0) {
          newErrors.photos = 'Le foto sono obbligatorie per questo tipo di reso'
        }
        break

      case 'shipping':
        if (!returnForm.returnMethod) {
          newErrors.returnMethod = 'Seleziona un metodo di reso'
        }
        if (!returnForm.refundMethod) {
          newErrors.refundMethod = 'Seleziona un metodo di rimborso'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (!validateStep()) return

    const stepOrder: typeof step[] = ['items', 'details', 'photos', 'shipping', 'review']
    const currentIndex = stepOrder.indexOf(step)

    // Skip photos step if not required
    if (step === 'details' && !requiresPhotos) {
      setStep('shipping')
    } else if (currentIndex < stepOrder.length - 1) {
      setStep(stepOrder[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const stepOrder: typeof step[] = ['items', 'details', 'photos', 'shipping', 'review']
    const currentIndex = stepOrder.indexOf(step)

    // Skip photos step if not required when going back
    if (step === 'shipping' && !requiresPhotos) {
      setStep('details')
    } else if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1])
    }
  }

  const handleSubmit = async () => {
    if (!validateStep()) return

    setLoading(true)
    try {
      await onSubmit(returnForm)

      trackCTA({
        ctaId: 'return.request.submitted',
        event: 'return_request_submit',
        value: orderId,
        metadata: {
          reason: returnForm.reason,
          itemCount: returnForm.items.length,
          hasPhotos: uploadedPhotos.length > 0,
          returnMethod: returnForm.returnMethod,
          refundMethod: returnForm.refundMethod
        }
      })
    } catch (error) {
      console.error('Return request submission failed:', error)
      setErrors({ submit: 'Errore nell\'invio della richiesta. Riprova.' })
    } finally {
      setLoading(false)
    }
  }

  const calculateRefundAmount = () => {
    return returnForm.items.reduce((total, item) => {
      const orderItem = order.items.find(oi => oi.id === item.orderItemId)
      return total + (orderItem ? orderItem.unitPrice * item.quantity : 0)
    }, 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStepTitle = () => {
    switch (step) {
      case 'items': return 'Seleziona prodotti'
      case 'details': return 'Motivo del reso'
      case 'photos': return 'Carica foto'
      case 'shipping': return 'Modalità di reso'
      case 'review': return 'Conferma richiesta'
      default: return 'Richiesta reso'
    }
  }

  const canReturn = (orderItem: typeof order.items[0]): boolean => {
    // Check if item was delivered more than 30 days ago
    if (order.shipping.actualDelivery) {
      const daysSinceDelivery = (Date.now() - new Date(order.shipping.actualDelivery).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceDelivery <= 30
    }
    return true
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  {getStepTitle()}
                </CardTitle>
                <p className="text-gray-600">Ordine #{order.orderNumber}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-4">
            {['items', 'details', 'photos', 'shipping', 'review'].map((stepName, index) => {
              const stepOrder = ['items', 'details', ...(requiresPhotos ? ['photos'] : []), 'shipping', 'review']
              const currentIndex = stepOrder.indexOf(step)
              const isActive = stepName === step
              const isCompleted = stepOrder.indexOf(stepName) < currentIndex
              const isEnabled = stepOrder.includes(stepName)

              if (!isEnabled) return null

              return (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive ? 'bg-piucane-primary text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < stepOrder.filter(s => stepOrder.includes(s)).length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {step === 'items' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Seleziona i prodotti da restituire</h3>
                <p className="text-sm text-gray-600">
                  Puoi restituire i prodotti entro 30 giorni dalla consegna.
                  Consegnato il {order.shipping.actualDelivery ? formatDate(order.shipping.actualDelivery) : 'N/A'}.
                </p>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => {
                  const isSelected = returnForm.items.some(ri => ri.orderItemId === item.id)
                  const selectedItem = returnForm.items.find(ri => ri.orderItemId === item.id)
                  const canReturnItem = canReturn(item)

                  return (
                    <div key={item.id} className={`border rounded-lg p-4 ${
                      !canReturnItem ? 'opacity-50 bg-gray-50' :
                      isSelected ? 'border-piucane-primary bg-piucane-light' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleItemToggle(item.id)}
                          disabled={!canReturnItem}
                          className="rounded text-piucane-primary focus:ring-piucane-primary"
                        />

                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />

                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-gray-600">
                              Quantità ordinata: {item.quantity}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              €{item.unitPrice.toFixed(2)} cad.
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Quantità:</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleItemQuantityChange(item.id, (selectedItem?.quantity || 1) - 1)}
                              disabled={(selectedItem?.quantity || 1) <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {selectedItem?.quantity || 1}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleItemQuantityChange(item.id, (selectedItem?.quantity || 1) + 1)}
                              disabled={(selectedItem?.quantity || 1) >= item.quantity}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {!canReturnItem && (
                          <div className="text-sm text-red-600">
                            Non restituibile<br />
                            <span className="text-xs">(oltre 30 giorni)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {errors.items && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <p className="text-red-800 text-sm">{errors.items}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Motivo del reso</h3>
                <div className="grid grid-cols-1 gap-3">
                  {returnReasons.map((reason) => (
                    <label
                      key={reason.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        returnForm.reason === reason.value
                          ? 'border-piucane-primary bg-piucane-light'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason.value}
                        checked={returnForm.reason === reason.value}
                        onChange={(e) => setReturnForm(prev => ({ ...prev, reason: e.target.value as ReturnReason }))}
                        className="mt-1 text-piucane-primary focus:ring-piucane-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{reason.label}</p>
                          {reason.requiresPhotos && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                              Foto richieste
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{reason.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione dettagliata *
                </label>
                <textarea
                  rows={4}
                  value={returnForm.description}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Spiega nel dettaglio il problema riscontrato..."
                />
                {errors.description && (
                  <p className="text-red-600 text-xs mt-1">{errors.description}</p>
                )}
              </div>

              {/* Item Conditions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Condizione prodotti</h4>
                <div className="space-y-3">
                  {returnForm.items.map((item) => {
                    const orderItem = order.items.find(oi => oi.id === item.orderItemId)
                    if (!orderItem) return null

                    return (
                      <div key={item.orderItemId} className="flex items-center gap-4 p-3 border rounded-lg">
                        <img
                          src={orderItem.image}
                          alt={orderItem.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{orderItem.name}</p>
                          <p className="text-sm text-gray-600">Quantità: {item.quantity}</p>
                        </div>
                        <select
                          value={item.condition}
                          onChange={(e) => {
                            setReturnForm(prev => ({
                              ...prev,
                              items: prev.items.map(i =>
                                i.orderItemId === item.orderItemId
                                  ? { ...i, condition: e.target.value }
                                  : i
                              )
                            }))
                          }}
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
                        >
                          {conditionOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 'photos' && requiresPhotos && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Carica foto</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Per questo tipo di reso sono richieste delle foto che documentino il problema.
                  Puoi caricare fino a 5 foto (max 10MB ciascuna).
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-piucane-primary hover:bg-piucane-light transition-colors"
                >
                  <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-2">Clicca per caricare le foto</p>
                  <p className="text-xs text-gray-500">PNG, JPG fino a 10MB</p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Photo Preview */}
              {uploadedPhotos.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Foto caricate</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedPhotos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.preview}
                          alt="Foto prodotto"
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {(photo.file.size / 1024 / 1024).toFixed(1)}MB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.photos && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <p className="text-red-800 text-sm">{errors.photos}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'shipping' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Modalità di reso</h3>
                <div className="space-y-3">
                  {[
                    {
                      value: 'pickup' as const,
                      label: 'Ritiro a domicilio',
                      description: 'Il corriere ritirerà il pacco al tuo indirizzo',
                      icon: Truck,
                      price: 'Gratuito',
                      estimatedTime: '2-3 giorni lavorativi'
                    },
                    {
                      value: 'drop_off' as const,
                      label: 'Consegna in punto di ritiro',
                      description: 'Porta il pacco presso un punto di ritiro autorizzato',
                      icon: Building,
                      price: 'Gratuito',
                      estimatedTime: 'Immediato'
                    },
                    {
                      value: 'mail' as const,
                      label: 'Spedizione postale',
                      description: 'Invia il pacco tramite servizio postale',
                      icon: Package,
                      price: 'A tuo carico',
                      estimatedTime: '3-5 giorni lavorativi'
                    }
                  ].map((method) => (
                    <label
                      key={method.value}
                      className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                        returnForm.returnMethod === method.value
                          ? 'border-piucane-primary bg-piucane-light'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="returnMethod"
                        value={method.value}
                        checked={returnForm.returnMethod === method.value}
                        onChange={(e) => setReturnForm(prev => ({ ...prev, returnMethod: e.target.value as any }))}
                        className="text-piucane-primary focus:ring-piucane-primary"
                      />
                      <method.icon className="w-8 h-8 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-900">{method.label}</p>
                          <span className={`text-sm font-medium ${
                            method.price === 'Gratuito' ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {method.price}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{method.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Tempo stimato: {method.estimatedTime}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Modalità di rimborso</h3>
                <div className="space-y-3">
                  {[
                    {
                      value: 'original' as const,
                      label: 'Metodo di pagamento originale',
                      description: `Rimborso su ${order.payment.method === 'credit_card' ? 'carta di credito' : 'metodo originale'}`,
                      icon: CreditCard,
                      estimatedTime: '3-5 giorni lavorativi'
                    },
                    {
                      value: 'store_credit' as const,
                      label: 'Credito negozio',
                      description: 'Ricevi un credito da utilizzare per futuri acquisti',
                      icon: Gift,
                      estimatedTime: 'Immediato',
                      bonus: '+5% bonus'
                    },
                    {
                      value: 'exchange' as const,
                      label: 'Cambio prodotto',
                      description: 'Sostituisci con un prodotto diverso',
                      icon: RefreshCw,
                      estimatedTime: '2-3 giorni lavorativi'
                    }
                  ].map((method) => (
                    <label
                      key={method.value}
                      className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                        returnForm.refundMethod === method.value
                          ? 'border-piucane-primary bg-piucane-light'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refundMethod"
                        value={method.value}
                        checked={returnForm.refundMethod === method.value}
                        onChange={(e) => setReturnForm(prev => ({ ...prev, refundMethod: e.target.value as any }))}
                        className="text-piucane-primary focus:ring-piucane-primary"
                      />
                      <method.icon className="w-8 h-8 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900">{method.label}</p>
                          {method.bonus && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {method.bonus}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{method.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Tempo stimato: {method.estimatedTime}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {(errors.returnMethod || errors.refundMethod) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <p className="text-red-800 text-sm">
                      {errors.returnMethod || errors.refundMethod}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Riepilogo richiesta reso</h3>
              </div>

              {/* Items Summary */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Prodotti da restituire</h4>
                <div className="space-y-3">
                  {returnForm.items.map((item) => {
                    const orderItem = order.items.find(oi => oi.id === item.orderItemId)
                    if (!orderItem) return null

                    return (
                      <div key={item.orderItemId} className="flex items-center gap-4 p-3 border rounded-lg">
                        <img
                          src={orderItem.image}
                          alt={orderItem.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{orderItem.name}</p>
                          <p className="text-sm text-gray-600">
                            Quantità: {item.quantity} • Condizione: {conditionOptions.find(c => c.value === item.condition)?.label}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          €{(orderItem.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Importo totale da rimborsare:</span>
                    <span className="text-lg font-bold text-piucane-primary">
                      €{calculateRefundAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Return Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Dettagli reso</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Motivo:</span>
                      <span className="text-gray-900">{returnReasons.find(r => r.value === returnForm.reason)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Modalità reso:</span>
                      <span className="text-gray-900">
                        {returnForm.returnMethod === 'pickup' ? 'Ritiro a domicilio' :
                         returnForm.returnMethod === 'drop_off' ? 'Punto di ritiro' :
                         'Spedizione postale'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Modalità rimborso:</span>
                      <span className="text-gray-900">
                        {returnForm.refundMethod === 'original' ? 'Metodo originale' :
                         returnForm.refundMethod === 'store_credit' ? 'Credito negozio' :
                         'Cambio prodotto'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Tempi stimati</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">Approvazione: <strong>Entro 24 ore</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600">Ritiro: <strong>2-3 giorni lavorativi</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-500" />
                      <span className="text-gray-600">Rimborso: <strong>3-5 giorni lavorativi</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {returnForm.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Descrizione</h4>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    {returnForm.description}
                  </p>
                </div>
              )}

              {/* Photos */}
              {uploadedPhotos.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Foto allegate ({uploadedPhotos.length})</h4>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {uploadedPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.preview}
                        alt="Foto prodotto"
                        className="w-full h-20 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Condizioni di reso</p>
                    <ul className="text-blue-800 space-y-1">
                      <li>• I prodotti devono essere nelle condizioni originali</li>
                      <li>• Il reso deve essere effettuato entro 30 giorni dalla consegna</li>
                      <li>• Alcuni prodotti (alimenti aperti, farmaci) non sono restituibili</li>
                      <li>• Il rimborso sarà processato dopo l'ispezione dei prodotti</li>
                    </ul>
                    <Button variant="link" size="sm" className="p-0 h-auto text-blue-600">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Leggi le condizioni complete
                    </Button>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <p className="text-red-800 text-sm">{errors.submit}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 'items'}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Indietro
        </Button>

        {step !== 'review' ? (
          <Button onClick={nextStep}>
            Continua
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={loading}
            className="min-w-32"
          >
            <Save className="w-4 h-4 mr-2" />
            Invia richiesta
          </Button>
        )}
      </div>
    </div>
  )
}
'use client'

/**
 * Order Card Component - Individual order display with full details
 * Features collapsible design, status indicators, and action buttons
 */

import React, { useState } from 'react'
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Star,
  MessageCircle,
  RotateCcw,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Download,
  Heart,
  ShoppingCart
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Order, OrderStatus } from '@/types/orders'

interface OrderCardProps {
  order: Order
  isExpanded: boolean
  onToggleExpand: () => void
  onTrackOrder?: () => void
  onReturnOrder?: () => void
  onReorder?: () => void
  onWriteReview?: (itemId: string) => void
  onContactSupport?: () => void
  onDownloadInvoice?: () => void
}

const statusConfig = {
  pending: { label: 'In elaborazione', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-800', borderColor: 'border-yellow-200', icon: Clock },
  confirmed: { label: 'Confermato', color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-800', borderColor: 'border-blue-200', icon: CheckCircle },
  processing: { label: 'In lavorazione', color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-800', borderColor: 'border-blue-200', icon: Package },
  shipped: { label: 'Spedito', color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-800', borderColor: 'border-purple-200', icon: Truck },
  out_for_delivery: { label: 'In consegna', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-800', borderColor: 'border-orange-200', icon: MapPin },
  delivered: { label: 'Consegnato', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-800', borderColor: 'border-green-200', icon: CheckCircle },
  cancelled: { label: 'Annullato', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-800', borderColor: 'border-red-200', icon: X },
  refunded: { label: 'Rimborsato', color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-200', icon: RotateCcw },
  partially_refunded: { label: 'Rimborso parziale', color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-200', icon: RotateCcw },
  returned: { label: 'Reso', color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-200', icon: RotateCcw },
  exchange_requested: { label: 'Cambio richiesto', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-800', borderColor: 'border-orange-200', icon: RefreshCw }
}

const paymentMethodLabels = {
  credit_card: 'Carta di credito',
  debit_card: 'Carta di debito',
  paypal: 'PayPal',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  bank_transfer: 'Bonifico bancario',
  stripe: 'Stripe',
  klarna: 'Klarna'
}

const shippingMethodLabels = {
  standard: 'Spedizione standard',
  express: 'Spedizione express',
  overnight: 'Consegna il giorno dopo',
  pickup: 'Ritiro in negozio',
  same_day: 'Consegna in giornata'
}

export function OrderCard({
  order,
  isExpanded,
  onToggleExpand,
  onTrackOrder,
  onReturnOrder,
  onReorder,
  onWriteReview,
  onContactSupport,
  onDownloadInvoice
}: OrderCardProps) {
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false)
  const statusInfo = statusConfig[order.status]
  const StatusIcon = statusInfo.icon

  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber)
      setCopiedOrderNumber(true)
      setTimeout(() => setCopiedOrderNumber(false), 2000)
    } catch (error) {
      console.error('Failed to copy order number:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDeliveryEstimate = () => {
    if (order.shipping.actualDelivery) {
      return formatDate(order.shipping.actualDelivery)
    }
    if (order.shipping.estimatedDelivery) {
      return formatDate(order.shipping.estimatedDelivery)
    }
    return 'Non disponibile'
  }

  const canWriteReview = (itemStatus: string) => {
    return order.status === 'delivered' && itemStatus === 'delivered'
  }

  const getProgressPercentage = (): number => {
    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']
    const currentIndex = statusOrder.indexOf(order.status)
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0
  }

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'}`}>
      {/* Header - Always Visible */}
      <CardContent className="p-0">
        <div
          onClick={onToggleExpand}
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Order Status Indicator */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor} border`}>
                <StatusIcon className="w-4 h-4" />
                {statusInfo.label}
              </div>

              {/* Order Number and Date */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">#{order.orderNumber}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyOrderNumber()
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedOrderNumber ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Order Total */}
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">€{order.pricing.total.toFixed(2)}</p>
                <p className="text-sm text-gray-600">{order.items.length} prodotto{order.items.length !== 1 ? 'i' : ''}</p>
              </div>

              {/* Expand/Collapse Icon */}
              <div className="text-gray-400">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>

          {/* Quick Info Bar */}
          <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Truck className="w-4 h-4" />
                {shippingMethodLabels[order.shipping.method]}
              </span>
              {order.shipping.trackingNumber && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {order.shipping.trackingNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-4 h-4" />
              {paymentMethodLabels[order.payment.method]}
            </div>
          </div>

          {/* Progress Bar for Active Orders */}
          {!['delivered', 'cancelled', 'refunded', 'returned'].includes(order.status) && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    statusInfo.color === 'green' ? 'bg-green-600' :
                    statusInfo.color === 'blue' ? 'bg-blue-600' :
                    statusInfo.color === 'purple' ? 'bg-purple-600' :
                    statusInfo.color === 'orange' ? 'bg-orange-600' :
                    'bg-gray-600'
                  }`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t bg-gray-50">
            {/* Action Buttons */}
            <div className="p-4 border-b bg-white">
              <div className="flex flex-wrap gap-2">
                {onTrackOrder && (
                  <Button variant="outline" size="sm" onClick={onTrackOrder}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Traccia spedizione
                  </Button>
                )}
                {onReturnOrder && (
                  <Button variant="outline" size="sm" onClick={onReturnOrder}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Richiedi reso
                  </Button>
                )}
                {onReorder && (
                  <Button variant="outline" size="sm" onClick={onReorder}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Riordina
                  </Button>
                )}
                {onContactSupport && (
                  <Button variant="outline" size="sm" onClick={onContactSupport}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Assistenza
                  </Button>
                )}
                {onDownloadInvoice && (
                  <Button variant="outline" size="sm" onClick={onDownloadInvoice}>
                    <Download className="w-4 h-4 mr-2" />
                    Fattura
                  </Button>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Prodotti ordinati</h4>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 truncate">{item.name}</h5>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">Quantità: {item.quantity}</span>
                        <span className="text-sm font-medium text-gray-900">
                          €{item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                      {item.subscription && (
                        <div className="flex items-center gap-1 mt-1">
                          <Package className="w-3 h-3 text-piucane-primary" />
                          <span className="text-xs text-piucane-primary font-medium">
                            Abbonamento {item.subscription.frequency}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        statusConfig[item.status]?.bgColor || 'bg-gray-50'
                      } ${statusConfig[item.status]?.textColor || 'text-gray-800'}`}>
                        {statusConfig[item.status]?.label || item.status}
                      </span>
                      {canWriteReview(item.status) && onWriteReview && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onWriteReview!(item.id)}
                          className="text-xs"
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Recensione
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Details Grid */}
            <div className="p-4 bg-white border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipping Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Informazioni spedizione
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Metodo:</span>
                      <span className="text-gray-900">{shippingMethodLabels[order.shipping.method]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Corriere:</span>
                      <span className="text-gray-900">{order.shipping.carrier}</span>
                    </div>
                    {order.shipping.trackingNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tracking:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-900 font-mono text-xs">
                            {order.shipping.trackingNumber}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(order.shipping.trackingNumber!)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Consegna prevista:</span>
                      <span className="text-gray-900">{getDeliveryEstimate()}</span>
                    </div>
                    {order.shipping.instructions && (
                      <div className="pt-2 border-t">
                        <p className="text-gray-600 text-xs">Istruzioni: {order.shipping.instructions}</p>
                      </div>
                    )}
                  </div>

                  {/* Shipping Address */}
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Indirizzo di spedizione</h5>
                    <div className="text-sm text-gray-600 leading-relaxed">
                      <p>{order.shipping.address.firstName} {order.shipping.address.lastName}</p>
                      {order.shipping.address.company && <p>{order.shipping.address.company}</p>}
                      <p>{order.shipping.address.street} {order.shipping.address.streetNumber}</p>
                      {order.shipping.address.apartment && <p>{order.shipping.address.apartment}</p>}
                      <p>{order.shipping.address.zipCode} {order.shipping.address.city} ({order.shipping.address.province})</p>
                      <p>{order.shipping.address.country}</p>
                      {order.shipping.address.phone && <p>Tel: {order.shipping.address.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Payment and Pricing */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Informazioni pagamento
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Metodo:</span>
                      <span className="text-gray-900">{paymentMethodLabels[order.payment.method]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provider:</span>
                      <span className="text-gray-900">{order.payment.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID transazione:</span>
                      <span className="text-gray-900 font-mono text-xs">{order.payment.transactionId}</span>
                    </div>
                    {order.payment.paidAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pagato il:</span>
                        <span className="text-gray-900">{formatDate(order.payment.paidAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Riepilogo prezzi</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotale:</span>
                        <span className="text-gray-900">€{order.pricing.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Spedizione:</span>
                        <span className="text-gray-900">€{order.pricing.shipping.toFixed(2)}</span>
                      </div>
                      {order.pricing.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Sconto{order.pricing.discountCode ? ` (${order.pricing.discountCode})` : ''}:</span>
                          <span>-€{order.pricing.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">IVA:</span>
                        <span className="text-gray-900">€{order.pricing.tax.toFixed(2)}</span>
                      </div>
                      {order.pricing.loyaltyPointsUsed && order.pricing.loyaltyPointsUsed > 0 && (
                        <div className="flex justify-between text-piucane-primary">
                          <span>Punti fedeltà utilizzati:</span>
                          <span>-{order.pricing.loyaltyPointsUsed} punti</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>Totale:</span>
                        <span>€{order.pricing.total.toFixed(2)}</span>
                      </div>
                      {order.pricing.loyaltyPointsEarned && order.pricing.loyaltyPointsEarned > 0 && (
                        <div className="flex justify-between items-center text-piucane-primary">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            Punti guadagnati:
                          </span>
                          <span className="font-medium">+{order.pricing.loyaltyPointsEarned} punti</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            {order.timeline && order.timeline.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Cronologia ordine
                </h4>
                <div className="space-y-3">
                  {order.timeline
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((event) => {
                      const eventStatusInfo = statusConfig[event.status] || statusConfig.pending
                      const EventIcon = eventStatusInfo.icon

                      return (
                        <div key={event.id} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${eventStatusInfo.bgColor}`}>
                            <EventIcon className={`w-4 h-4 ${eventStatusInfo.textColor}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900">{event.message}</p>
                              <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
                            </div>
                            {event.details && (
                              <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                            )}
                            {event.location && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
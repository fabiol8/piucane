'use client'

/**
 * Order History Component - Comprehensive order management and tracking
 * Features order listing, filtering, search, and detailed tracking
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Package,
  Search,
  Filter,
  Calendar,
  Euro,
  Truck,
  MapPin,
  Eye,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Star,
  MessageCircle,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackCTA } from '@/analytics/ga4'
import { OrderCard } from './OrderCard'
import { OrderTracking } from './OrderTracking'
import { ReturnRequest } from './ReturnRequest'
import type {
  Order,
  OrderStatus,
  OrderFilters,
  OrderSearchParams,
  PaymentMethod,
  ShippingMethod,
  OrderStats
} from '@/types/orders'

interface OrderHistoryProps {
  userId: string
  initialOrders?: Order[]
  onLoadMore?: (params: OrderSearchParams) => Promise<Order[]>
  onOrderUpdate?: (orderId: string, updates: Partial<Order>) => Promise<void>
  onReturnRequest?: (orderId: string) => void
}

const statusConfig = {
  pending: { label: 'In elaborazione', color: 'yellow', icon: Clock },
  confirmed: { label: 'Confermato', color: 'blue', icon: CheckCircle },
  processing: { label: 'In lavorazione', color: 'blue', icon: Package },
  shipped: { label: 'Spedito', color: 'purple', icon: Truck },
  out_for_delivery: { label: 'In consegna', color: 'orange', icon: MapPin },
  delivered: { label: 'Consegnato', color: 'green', icon: CheckCircle },
  cancelled: { label: 'Annullato', color: 'red', icon: X },
  refunded: { label: 'Rimborsato', color: 'gray', icon: RotateCcw },
  partially_refunded: { label: 'Rimborso parziale', color: 'gray', icon: RotateCcw },
  returned: { label: 'Reso', color: 'gray', icon: RotateCcw },
  exchange_requested: { label: 'Cambio richiesto', color: 'orange', icon: RefreshCw }
}

export function OrderHistory({
  userId,
  initialOrders = [],
  onLoadMore,
  onOrderUpdate,
  onReturnRequest
}: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [showTracking, setShowTracking] = useState<string | null>(null)
  const [showReturnForm, setShowReturnForm] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [filters, setFilters] = useState<OrderFilters>({
    status: [],
    dateFrom: '',
    dateTo: '',
    minAmount: undefined,
    maxAmount: undefined,
    paymentMethod: [],
    shippingMethod: [],
    hasReturns: false
  })

  // Mock order stats - in a real app this would come from an API
  const orderStats: OrderStats = {
    userId,
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + order.pricing.total, 0),
    averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.pricing.total, 0) / orders.length : 0,
    ordersByStatus: orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<OrderStatus, number>),
    ordersByMonth: [],
    favoriteProducts: [],
    returnsRate: 0,
    loyaltyPointsEarned: orders.reduce((sum, order) => sum + (order.pricing.loyaltyPointsEarned || 0), 0),
    subscriptionCount: 0,
    lastOrderDate: orders.length > 0 ? orders[0].createdAt : undefined
  }

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query)) ||
        order.customer.email.toLowerCase().includes(query)
      )
    }

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      result = result.filter(order => filters.status!.includes(order.status))
    }

    if (filters.dateFrom) {
      result = result.filter(order => new Date(order.createdAt) >= new Date(filters.dateFrom!))
    }

    if (filters.dateTo) {
      result = result.filter(order => new Date(order.createdAt) <= new Date(filters.dateTo!))
    }

    if (filters.minAmount !== undefined) {
      result = result.filter(order => order.pricing.total >= filters.minAmount!)
    }

    if (filters.maxAmount !== undefined) {
      result = result.filter(order => order.pricing.total <= filters.maxAmount!)
    }

    if (filters.paymentMethod && filters.paymentMethod.length > 0) {
      result = result.filter(order => filters.paymentMethod!.includes(order.payment.method))
    }

    if (filters.shippingMethod && filters.shippingMethod.length > 0) {
      result = result.filter(order => filters.shippingMethod!.includes(order.shipping.method))
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'amount':
          comparison = a.pricing.total - b.pricing.total
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [orders, searchQuery, filters, sortBy, sortOrder])

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      status: [],
      dateFrom: '',
      dateTo: '',
      minAmount: undefined,
      maxAmount: undefined,
      paymentMethod: [],
      shippingMethod: [],
      hasReturns: false
    })
    setSearchQuery('')
  }

  const handleOrderClick = (orderId: string) => {
    setSelectedOrder(selectedOrder === orderId ? null : orderId)
    trackCTA({
      ctaId: 'order.details.viewed',
      event: 'order_view',
      value: orderId,
      metadata: { source: 'history' }
    })
  }

  const handleTrackingClick = (orderId: string) => {
    setShowTracking(orderId)
    trackCTA({
      ctaId: 'order.tracking.viewed',
      event: 'tracking_view',
      value: orderId,
      metadata: { source: 'history' }
    })
  }

  const handleReturnClick = (orderId: string) => {
    setShowReturnForm(orderId)
    trackCTA({
      ctaId: 'order.return.initiated',
      event: 'return_request_start',
      value: orderId,
      metadata: { source: 'history' }
    })
  }

  const getFilterCount = () => {
    let count = 0
    if (filters.status && filters.status.length > 0) count++
    if (filters.dateFrom || filters.dateTo) count++
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) count++
    if (filters.paymentMethod && filters.paymentMethod.length > 0) count++
    if (filters.shippingMethod && filters.shippingMethod.length > 0) count++
    if (filters.hasReturns) count++
    return count
  }

  const canReturnOrder = (order: Order): boolean => {
    const daysSinceDelivery = order.shipping.actualDelivery
      ? (Date.now() - new Date(order.shipping.actualDelivery).getTime()) / (1000 * 60 * 60 * 24)
      : 0

    return order.status === 'delivered' && daysSinceDelivery <= 30
  }

  const canTrackOrder = (order: Order): boolean => {
    return ['confirmed', 'processing', 'shipped', 'out_for_delivery'].includes(order.status) &&
           order.shipping.trackingNumber !== undefined
  }

  useEffect(() => {
    trackCTA({
      ctaId: 'order.history.viewed',
      event: 'page_view',
      value: 'order_history',
      metadata: {
        orderCount: orders.length,
        hasFilters: getFilterCount() > 0
      }
    })
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-6 h-6" />
                I tuoi ordini
              </CardTitle>
              <p className="text-gray-600 mt-1">
                {orderStats.totalOrders} ordini • €{orderStats.totalSpent.toFixed(2)} totale
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-piucane-primary">
                {orderStats.loyaltyPointsEarned}
              </p>
              <p className="text-sm text-gray-600">punti guadagnati</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(orderStats.ordersByStatus).map(([status, count]) => {
              const config = statusConfig[status as OrderStatus]
              const Icon = config.icon

              return (
                <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${
                    config.color === 'green' ? 'text-green-600' :
                    config.color === 'blue' ? 'text-blue-600' :
                    config.color === 'yellow' ? 'text-yellow-600' :
                    config.color === 'purple' ? 'text-purple-600' :
                    config.color === 'orange' ? 'text-orange-600' :
                    config.color === 'red' ? 'text-red-600' :
                    'text-gray-600'
                  }`} />
                  <p className="text-xl font-semibold">{count}</p>
                  <p className="text-sm text-gray-600">{config.label}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca per numero ordine, prodotto o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-piucane-primary"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-piucane-primary"
              >
                <option value="date">Data</option>
                <option value="amount">Importo</option>
                <option value="status">Stato</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtri
              {getFilterCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-piucane-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {getFilterCount()}
                </span>
              )}
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <label key={status} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.status?.includes(status as OrderStatus) || false}
                          onChange={(e) => {
                            const newStatus = e.target.checked
                              ? [...(filters.status || []), status as OrderStatus]
                              : filters.status?.filter(s => s !== status) || []
                            handleFilterChange('status', newStatus)
                          }}
                          className="rounded text-piucane-primary focus:ring-piucane-primary"
                        />
                        <span className="text-sm">{config.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Periodo
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Da"
                    />
                    <input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="A"
                    />
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Euro className="w-4 h-4 inline mr-1" />
                    Importo
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.minAmount || ''}
                      onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Min €"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.maxAmount || ''}
                      onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Max €"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Cancella filtri
                </Button>
                <p className="text-sm text-gray-600">
                  {filteredOrders.length} ordini trovati
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">Caricamento ordini...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {getFilterCount() > 0 || searchQuery ? 'Nessun ordine trovato' : 'Non hai ancora effettuato ordini'}
              </h3>
              <p className="text-gray-600 mb-4">
                {getFilterCount() > 0 || searchQuery
                  ? 'Prova a modificare i filtri di ricerca'
                  : 'Esplora i nostri prodotti e fai il tuo primo ordine'
                }
              </p>
              {getFilterCount() > 0 || searchQuery ? (
                <Button variant="outline" onClick={clearFilters}>
                  Cancella filtri
                </Button>
              ) : (
                <Button>
                  Vai al negozio
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={selectedOrder === order.id}
              onToggleExpand={() => handleOrderClick(order.id)}
              onTrackOrder={canTrackOrder(order) ? () => handleTrackingClick(order.id) : undefined}
              onReturnOrder={canReturnOrder(order) ? () => handleReturnClick(order.id) : undefined}
              onReorder={() => {
                trackCTA({
                  ctaId: 'order.reorder',
                  event: 'add_to_cart',
                  value: 'reorder',
                  metadata: { orderId: order.id, itemCount: order.items.length }
                })
              }}
              onWriteReview={(itemId) => {
                trackCTA({
                  ctaId: 'order.review.start',
                  event: 'review_start',
                  value: itemId,
                  metadata: { orderId: order.id }
                })
              }}
              onContactSupport={() => {
                trackCTA({
                  ctaId: 'order.support.contact',
                  event: 'support_contact',
                  value: 'order_inquiry',
                  metadata: { orderId: order.id }
                })
              }}
            />
          ))
        )}
      </div>

      {/* Load More */}
      {onLoadMore && filteredOrders.length >= 20 && (
        <div className="text-center">
          <Button variant="outline" onClick={() => onLoadMore({ query: searchQuery, filters })}>
            Carica altri ordini
          </Button>
        </div>
      )}

      {/* Modals */}
      {showTracking && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tracciamento ordine</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowTracking(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <OrderTracking
                orderId={showTracking}
                onClose={() => setShowTracking(null)}
              />
            </div>
          </div>
        </div>
      )}

      {showReturnForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Richiesta reso</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowReturnForm(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <ReturnRequest
                orderId={showReturnForm}
                onClose={() => setShowReturnForm(null)}
                onSubmit={(returnData) => {
                  setShowReturnForm(null)
                  trackCTA({
                    ctaId: 'order.return.submitted',
                    event: 'return_request_submit',
                    value: showReturnForm,
                    metadata: { reason: returnData.reason, itemCount: returnData.items.length }
                  })
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
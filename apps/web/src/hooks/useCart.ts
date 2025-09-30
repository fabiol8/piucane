'use client'

/**
 * Hook per gestione carrello intelligente
 * Con persistenza locale, sincronizzazione e analytics
 */

import { useState, useEffect } from 'react'
import { trackCTA } from '@/analytics/ga4'

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

interface CartState {
  items: CartItem[]
  lastUpdated: string
}

const CART_STORAGE_KEY = 'piucane_cart'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Carica carrello dal localStorage all'inizializzazione
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)
    if (savedCart) {
      try {
        const cartState: CartState = JSON.parse(savedCart)
        setItems(cartState.items)
      } catch (error) {
        console.error('Errore nel caricamento del carrello:', error)
      }
    }
    setIsLoading(false)
  }, [])

  // Salva carrello nel localStorage quando cambia
  useEffect(() => {
    if (!isLoading) {
      const cartState: CartState = {
        items,
        lastUpdated: new Date().toISOString()
      }
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState))
    }
  }, [items, isLoading])

  const addItem = (
    productId: string,
    formatId: string,
    quantity: number = 1,
    options?: {
      subscriptionFrequency?: 'none' | 'monthly' | 'bimonthly' | 'quarterly'
      personalizedDosage?: { dailyAmount: number; duration: number }
    }
  ) => {
    setItems(currentItems => {
      const existingItemIndex = currentItems.findIndex(
        item => item.productId === productId && item.formatId === formatId
      )

      if (existingItemIndex > -1) {
        // Aggiorna quantità prodotto esistente
        const updatedItems = [...currentItems]
        updatedItems[existingItemIndex].quantity += quantity

        trackCTA({
          ctaId: 'cart.item.updated',
          event: 'add_to_cart',
          value: 'quantity_updated',
          metadata: {
            product_id: productId,
            format_id: formatId,
            new_quantity: updatedItems[existingItemIndex].quantity
          }
        })

        return updatedItems
      } else {
        // Aggiungi nuovo prodotto
        const newItem: CartItem = {
          productId,
          formatId,
          quantity,
          subscriptionFrequency: options?.subscriptionFrequency || 'none',
          personalizedDosage: options?.personalizedDosage,
          addedAt: new Date().toISOString()
        }

        trackCTA({
          ctaId: 'cart.item.added',
          event: 'add_to_cart',
          value: 'new_item',
          metadata: {
            product_id: productId,
            format_id: formatId,
            quantity,
            is_subscription: newItem.subscriptionFrequency !== 'none'
          }
        })

        return [...currentItems, newItem]
      }
    })
  }

  const updateQuantity = (productId: string, formatId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId, formatId)
      return
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.productId === productId && item.formatId === formatId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )

    trackCTA({
      ctaId: 'cart.quantity.updated',
      event: 'cart_update',
      value: 'quantity_changed',
      metadata: {
        product_id: productId,
        format_id: formatId,
        new_quantity: newQuantity
      }
    })
  }

  const removeItem = (productId: string, formatId: string) => {
    setItems(currentItems =>
      currentItems.filter(item =>
        !(item.productId === productId && item.formatId === formatId)
      )
    )

    trackCTA({
      ctaId: 'cart.item.removed',
      event: 'remove_from_cart',
      value: 'item_removed',
      metadata: { product_id: productId, format_id: formatId }
    })
  }

  const clearCart = () => {
    const itemCount = items.length
    setItems([])

    trackCTA({
      ctaId: 'cart.cleared',
      event: 'cart_clear',
      value: 'all_items_removed',
      metadata: { previous_item_count: itemCount }
    })
  }

  const updateSubscription = (
    productId: string,
    formatId: string,
    subscriptionFrequency: 'none' | 'monthly' | 'bimonthly' | 'quarterly'
  ) => {
    setItems(currentItems =>
      currentItems.map(item =>
        item.productId === productId && item.formatId === formatId
          ? { ...item, subscriptionFrequency }
          : item
      )
    )

    trackCTA({
      ctaId: 'cart.subscription.updated',
      event: 'subscription_change',
      value: subscriptionFrequency,
      metadata: {
        product_id: productId,
        format_id: formatId,
        subscription_frequency: subscriptionFrequency
      }
    })
  }

  const updateDosage = (
    productId: string,
    formatId: string,
    dosage: { dailyAmount: number; duration: number }
  ) => {
    setItems(currentItems =>
      currentItems.map(item =>
        item.productId === productId && item.formatId === formatId
          ? { ...item, personalizedDosage: dosage }
          : item
      )
    )

    trackCTA({
      ctaId: 'cart.dosage.updated',
      event: 'dosage_personalized',
      value: 'dosage_changed',
      metadata: {
        product_id: productId,
        format_id: formatId,
        daily_amount: dosage.dailyAmount,
        duration_days: dosage.duration
      }
    })
  }

  // Computed properties
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  const totalAmount = items.reduce((total, item) => {
    // Qui dovresti calcolare il prezzo basato sui dati reali del prodotto
    // Per ora restituisco un calcolo approssimativo
    const basePrice = 25 // Prezzo base stimato
    const subscription = item.subscriptionFrequency !== 'none' ? 0.85 : 1 // 15% sconto abbonamento
    return total + (basePrice * item.quantity * subscription)
  }, 0)

  const hasSubscriptionItems = items.some(item => item.subscriptionFrequency !== 'none')

  const getUniqueProductCount = () => {
    const uniqueProducts = new Set(items.map(item => item.productId))
    return uniqueProducts.size
  }

  const getItemsByCategory = () => {
    // Raggruppa prodotti per categoria
    // Implementazione semplificata
    return {
      food: items.filter(item => item.productId.includes('food') || item.productId.includes('adult') || item.productId.includes('puppy')),
      health: items.filter(item => item.productId.includes('supplement') || item.productId.includes('health')),
      treats: items.filter(item => item.productId.includes('treats')),
      other: items.filter(item => !item.productId.includes('food') && !item.productId.includes('supplement') && !item.productId.includes('treats'))
    }
  }

  // Analytics per eventi carrello
  const trackCartAnalytics = (action: string, metadata?: any) => {
    trackCTA({
      ctaId: `cart.${action}`,
      event: 'cart_interaction',
      value: action,
      metadata: {
        item_count: itemCount,
        total_amount: totalAmount,
        unique_products: getUniqueProductCount(),
        has_subscriptions: hasSubscriptionItems,
        ...metadata
      }
    })
  }

  return {
    items,
    itemCount,
    totalAmount,
    hasSubscriptionItems,
    isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    updateSubscription,
    updateDosage,
    getUniqueProductCount,
    getItemsByCategory,
    trackCartAnalytics
  }
}

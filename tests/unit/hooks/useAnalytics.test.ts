import { renderHook, act } from '@testing-library/react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { mockGtag, expectAnalyticsEvent } from '../../utils/test-utils'

describe('useAnalytics Hook', () => {
  beforeEach(() => {
    mockGtag.mockClear()
    global.gtag = mockGtag
  })

  it('should track page views', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackPageView('/test-page', 'Test Page')
    })

    expectAnalyticsEvent('page_view', {
      page_title: 'Test Page',
      page_location: '/test-page',
    })
  })

  it('should track custom events', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackEvent('test_event', {
        category: 'test',
        value: 123,
      })
    })

    expectAnalyticsEvent('test_event', {
      category: 'test',
      value: 123,
    })
  })

  it('should track ecommerce events', () => {
    const { result } = renderHook(() => useAnalytics())

    const items = [
      {
        item_id: 'product-1',
        item_name: 'Test Product',
        category: 'food',
        price: 29.99,
        quantity: 2,
      },
    ]

    act(() => {
      result.current.trackPurchase('order-123', 64.97, 'EUR', items)
    })

    expectAnalyticsEvent('purchase', {
      transaction_id: 'order-123',
      value: 64.97,
      currency: 'EUR',
      items,
    })
  })

  it('should track conversion events', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackConversion('newsletter_signup', 1)
    })

    expectAnalyticsEvent('conversion', {
      send_to: 'newsletter_signup',
      value: 1,
    })
  })

  it('should track user engagement', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackEngagement('video_play', 30)
    })

    expectAnalyticsEvent('engagement', {
      engagement_type: 'video_play',
      engagement_time_msec: 30000,
    })
  })

  it('should handle consent changes', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.updateConsent({
        analytics_storage: 'granted',
        ad_storage: 'denied',
      })
    })

    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
    })
  })

  it('should set user properties', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.setUserProperties({
        user_id: 'user-123',
        customer_lifetime_value: 299.99,
        preferred_language: 'it',
      })
    })

    expect(mockGtag).toHaveBeenCalledWith('config', expect.any(String), {
      user_id: 'user-123',
      customer_lifetime_value: 299.99,
      preferred_language: 'it',
    })
  })

  it('should track dog-specific events', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackDogEvent('weight_updated', {
        dog_id: 'dog-123',
        dog_breed: 'labrador',
        weight_kg: 28.5,
      })
    })

    expectAnalyticsEvent('weight_updated', {
      dog_id: 'dog-123',
      dog_breed: 'labrador',
      weight_kg: 28.5,
    })
  })

  it('should track gamification events', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackAchievement('first_order', {
        achievement_id: 'first_order',
        character: 'user-123',
      })
    })

    expectAnalyticsEvent('earn_achievement', {
      achievement_id: 'first_order',
      character: 'user-123',
    })
  })

  it('should not track when analytics is disabled', () => {
    // Simulate analytics disabled
    delete global.gtag

    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackEvent('test_event', { test: true })
    })

    expect(mockGtag).not.toHaveBeenCalled()
  })

  it('should handle tracking errors gracefully', () => {
    // Mock gtag to throw error
    mockGtag.mockImplementation(() => {
      throw new Error('Tracking error')
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackEvent('test_event', { test: true })
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'Analytics tracking error:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should batch events when configured', () => {
    const { result } = renderHook(() =>
      useAnalytics({ batchEvents: true, batchTimeout: 100 })
    )

    act(() => {
      result.current.trackEvent('event1', { value: 1 })
      result.current.trackEvent('event2', { value: 2 })
      result.current.trackEvent('event3', { value: 3 })
    })

    // Should not have tracked individual events yet
    expect(mockGtag).not.toHaveBeenCalled()

    // Wait for batch timeout
    act(() => {
      jest.advanceTimersByTime(150)
    })

    // Should have batched events
    expect(mockGtag).toHaveBeenCalledWith('event', 'batch_events', {
      events: [
        { name: 'event1', parameters: { value: 1 } },
        { name: 'event2', parameters: { value: 2 } },
        { name: 'event3', parameters: { value: 3 } },
      ],
    })
  })

  it('should track form interactions', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackFormInteraction('contact_form', 'submit', {
        form_step: 3,
        form_completion_time: 120,
      })
    })

    expectAnalyticsEvent('form_submit', {
      form_id: 'contact_form',
      form_step: 3,
      form_completion_time: 120,
    })
  })

  it('should track search events', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackSearch('crocchette', {
        search_term: 'crocchette',
        results_count: 15,
        search_location: 'header',
      })
    })

    expectAnalyticsEvent('search', {
      search_term: 'crocchette',
      results_count: 15,
      search_location: 'header',
    })
  })

  it('should track social interactions', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackSocialInteraction('share', 'facebook', '/products/123')
    })

    expectAnalyticsEvent('share', {
      method: 'facebook',
      content_type: 'product',
      item_id: '/products/123',
    })
  })

  it('should track exceptions', () => {
    const { result } = renderHook(() => useAnalytics())

    act(() => {
      result.current.trackException('JavaScript Error', false)
    })

    expectAnalyticsEvent('exception', {
      description: 'JavaScript Error',
      fatal: false,
    })
  })
})
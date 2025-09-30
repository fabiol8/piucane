import { render, screen, userEvent, waitFor, runAxeTest, expectAnalyticsEvent, mockGtag, mockLocalStorage } from '../../../utils/test-utils'
import { ConsentBanner } from '@/components/privacy/ConsentBanner'

const mockLocalStorageFns = mockLocalStorage()

describe('ConsentBanner Component', () => {
  beforeEach(() => {
    mockGtag.mockClear()
    mockLocalStorageFns.clear()
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorageFns,
      writable: true
    })

    // Mock window.gtag
    Object.defineProperty(window, 'gtag', {
      value: mockGtag,
      writable: true
    })
  })

  it('shows banner for first-time visitors after delay', async () => {
    render(<ConsentBanner />)

    // Should not be visible initially
    expect(screen.queryByText('Rispettiamo la tua privacy')).not.toBeInTheDocument()

    // Wait for banner to appear after delay
    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('does not show banner if consent already given and recent', () => {
    const recentDate = new Date()
    recentDate.setMonth(recentDate.getMonth() - 6) // 6 months ago

    mockLocalStorageFns.getItem.mockImplementation((key: string) => {
      if (key === 'piucane_consent') {
        return JSON.stringify({
          necessary: true,
          analytics: true,
          marketing: false,
          personalization: true,
          functional: true
        })
      }
      if (key === 'piucane_consent_timestamp') {
        return recentDate.toISOString()
      }
      return null
    })

    render(<ConsentBanner />)

    expect(screen.queryByText('Rispettiamo la tua privacy')).not.toBeInTheDocument()
  })

  it('shows banner if consent is older than 13 months', () => {
    const oldDate = new Date()
    oldDate.setMonth(oldDate.getMonth() - 14) // 14 months ago

    mockLocalStorageFns.getItem.mockImplementation((key: string) => {
      if (key === 'piucane_consent') {
        return JSON.stringify({
          necessary: true,
          analytics: true,
          marketing: false,
          personalization: true,
          functional: true
        })
      }
      if (key === 'piucane_consent_timestamp') {
        return oldDate.toISOString()
      }
      return null
    })

    render(<ConsentBanner />)

    expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
  })

  it('handles accept all correctly', async () => {
    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    const acceptButton = screen.getByText('Accetta tutto')
    await userEvent.click(acceptButton)

    // Should save consent to localStorage
    expect(mockLocalStorageFns.setItem).toHaveBeenCalledWith(
      'piucane_consent',
      JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: true,
        personalization: true,
        functional: true
      })
    )

    // Should save timestamp
    expect(mockLocalStorageFns.setItem).toHaveBeenCalledWith(
      'piucane_consent_timestamp',
      expect.any(String)
    )

    // Should update gtag consent
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage': 'granted',
      'ad_user_data': 'granted',
      'ad_personalization': 'granted',
      'functionality_storage': 'granted',
      'personalization_storage': 'granted'
    })

    // Should track analytics event
    expectAnalyticsEvent('consent_accept_all', {
      event_category: 'privacy',
      event_label: 'banner'
    })

    // Banner should disappear
    expect(screen.queryByText('Rispettiamo la tua privacy')).not.toBeInTheDocument()
  })

  it('handles reject all correctly', async () => {
    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    const rejectButton = screen.getByText('Rifiuta tutto')
    await userEvent.click(rejectButton)

    // Should save only necessary consent
    expect(mockLocalStorageFns.setItem).toHaveBeenCalledWith(
      'piucane_consent',
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false,
        functional: false
      })
    )

    // Should update gtag consent to denied
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'functionality_storage': 'denied',
      'personalization_storage': 'denied'
    })

    // Should track analytics event
    expectAnalyticsEvent('consent_reject_all', {
      event_category: 'privacy',
      event_label: 'banner'
    })
  })

  it('shows details when requested', async () => {
    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    const showDetailsButton = screen.getByText('Mostra dettagli')
    await userEvent.click(showDetailsButton)

    expect(screen.getByText('Cookie Necessari')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('Personalizzazione')).toBeInTheDocument()
  })

  it('opens settings panel correctly', async () => {
    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    const customizeButton = screen.getByText('Personalizza')
    await userEvent.click(customizeButton)

    expect(screen.getByText('Impostazioni Privacy')).toBeInTheDocument()
    expect(screen.getByText('Cookie Necessari')).toBeInTheDocument()
    expect(screen.getByText('Sempre attivi')).toBeInTheDocument()
  })

  it('handles custom preferences correctly', async () => {
    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    // Open settings
    const customizeButton = screen.getByText('Personalizza')
    await userEvent.click(customizeButton)

    // Toggle analytics switch
    const analyticsSwitch = screen.getAllByRole('switch')[1] // First is necessary (disabled)
    await userEvent.click(analyticsSwitch)

    // Save preferences
    const saveButton = screen.getByText('Salva preferenze')
    await userEvent.click(saveButton)

    // Should save custom preferences
    expect(mockLocalStorageFns.setItem).toHaveBeenCalledWith(
      'piucane_consent',
      expect.stringContaining('"analytics":true')
    )

    // Should track custom consent event
    expectAnalyticsEvent('consent_custom', {
      event_category: 'privacy',
      event_label: 'settings',
      custom_parameters: expect.objectContaining({
        analytics: true
      })
    })
  })

  it('dispatches custom event on consent update', async () => {
    const eventListener = jest.fn()
    window.addEventListener('piucane_consent_updated', eventListener)

    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    const acceptButton = screen.getByText('Accetta tutto')
    await userEvent.click(acceptButton)

    expect(eventListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'piucane_consent_updated',
        detail: {
          necessary: true,
          analytics: true,
          marketing: true,
          personalization: true,
          functional: true
        }
      })
    )

    window.removeEventListener('piucane_consent_updated', eventListener)
  })

  it('allows closing banner without consent', async () => {
    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /chiudi banner/i })
    await userEvent.click(closeButton)

    expect(screen.queryByText('Rispettiamo la tua privacy')).not.toBeInTheDocument()
  })

  it('meets accessibility standards', async () => {
    const { container } = render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    await runAxeTest(container)
  })

  it('supports keyboard navigation', async () => {
    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    // Tab through interactive elements
    await userEvent.tab()
    expect(screen.getByText('Mostra dettagli')).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByText('Rifiuta tutto')).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByText('Personalizza')).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByText('Accetta tutto')).toHaveFocus()

    // Should be able to activate with Enter
    await userEvent.keyboard('{Enter}')
    expect(screen.queryByText('Rispettiamo la tua privacy')).not.toBeInTheDocument()
  })

  it('handles consent expiration correctly', () => {
    const expiredDate = new Date()
    expiredDate.setMonth(expiredDate.getMonth() - 15) // 15 months ago

    mockLocalStorageFns.getItem.mockImplementation((key: string) => {
      if (key === 'piucane_consent') {
        return JSON.stringify({
          necessary: true,
          analytics: true,
          marketing: false,
          personalization: true,
          functional: true
        })
      }
      if (key === 'piucane_consent_timestamp') {
        return expiredDate.toISOString()
      }
      return null
    })

    render(<ConsentBanner />)

    // Should show banner for expired consent
    expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
  })

  it('preserves user selections in settings panel', async () => {
    render(<ConsentBanner />)

    await waitFor(() => {
      expect(screen.getByText('Rispettiamo la tua privacy')).toBeInTheDocument()
    })

    // Open settings
    const customizeButton = screen.getByText('Personalizza')
    await userEvent.click(customizeButton)

    // Toggle some switches
    const switches = screen.getAllByRole('switch')
    const analyticsSwitch = switches[1] // Analytics
    const marketingSwitch = switches[2] // Marketing

    await userEvent.click(analyticsSwitch)
    await userEvent.click(marketingSwitch)

    // Close and reopen settings
    const closeSettingsButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg') // Close icon
    )
    await userEvent.click(closeSettingsButton!)

    await userEvent.click(screen.getByText('Personalizza'))

    // Settings should be preserved
    const newSwitches = screen.getAllByRole('switch')
    expect(newSwitches[1]).toBeChecked() // Analytics should be checked
    expect(newSwitches[2]).toBeChecked() // Marketing should be checked
  })
})
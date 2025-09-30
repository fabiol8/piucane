'use client'

/**
 * Advanced Consent Management System - PiùCane
 * Sistema avanzato per gestione consensi GDPR con granularità completa
 */

import React, { useState, useEffect } from 'react'
import { Shield, Info, Check, X, Settings, Eye, Download, Trash2, Clock, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { dataProtectionManager, ConsentRecord, PrivacySettings } from '@/lib/security/data-protection'
import { trackCTA } from '@/analytics/ga4'

interface ConsentCategory {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  required: boolean
  purposes: Array<{
    id: string
    name: string
    description: string
    lawfulBasis: string
    retention: string
    consequences: string
  }>
  dataTypes: string[]
  thirdParties?: Array<{
    name: string
    purpose: string
    country: string
    safeguards: string
  }>
}

interface ConsentManagerProps {
  userId: string
  mode: 'onboarding' | 'settings' | 'cookie_banner'
  onConsentChange?: (consents: Record<string, boolean>) => void
  onComplete?: () => void
}

export function ConsentManager({ userId, mode, onConsentChange, onComplete }: ConsentManagerProps) {
  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const [consentHistory, setConsentHistory] = useState<ConsentRecord[]>([])
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const consentCategories: ConsentCategory[] = [
    {
      id: 'essential',
      name: 'Funzionalità Essenziali',
      description: 'Necessarie per il funzionamento base della piattaforma',
      icon: Shield,
      required: true,
      purposes: [
        {
          id: 'authentication',
          name: 'Autenticazione',
          description: 'Gestione login e sessioni utente',
          lawfulBasis: 'Contratto',
          retention: '2 anni dalla chiusura account',
          consequences: 'Impossibile utilizzare il servizio senza'
        },
        {
          id: 'security',
          name: 'Sicurezza',
          description: 'Prevenzione frodi e protezione account',
          lawfulBasis: 'Interesse legittimo',
          retention: '1 anno',
          consequences: 'Rischi di sicurezza aumentati'
        }
      ],
      dataTypes: ['credenziali_accesso', 'sessioni', 'log_sicurezza']
    },
    {
      id: 'functional',
      name: 'Funzionalità Avanzate',
      description: 'Migliorano l\'esperienza d\'uso ma non sono strettamente necessarie',
      icon: Settings,
      required: false,
      purposes: [
        {
          id: 'preferences',
          name: 'Personalizzazione',
          description: 'Salvataggio preferenze e impostazioni',
          lawfulBasis: 'Consenso',
          retention: 'Fino alla revoca del consenso',
          consequences: 'Esperienza meno personalizzata'
        },
        {
          id: 'recommendations',
          name: 'Raccomandazioni',
          description: 'Suggerimenti prodotti basati su profilo cane',
          lawfulBasis: 'Consenso',
          retention: '2 anni',
          consequences: 'Nessuna raccomandazione personalizzata'
        }
      ],
      dataTypes: ['preferenze_utente', 'cronologia_navigazione', 'profilo_cane']
    },
    {
      id: 'analytics',
      name: 'Analytics e Miglioramenti',
      description: 'Ci aiutano a capire come migliorare il servizio',
      icon: Eye,
      required: false,
      purposes: [
        {
          id: 'usage_analytics',
          name: 'Analytics Utilizzo',
          description: 'Analisi anonima di come usi la piattaforma',
          lawfulBasis: 'Interesse legittimo',
          retention: '26 mesi',
          consequences: 'Difficoltà nel migliorare il servizio'
        },
        {
          id: 'performance',
          name: 'Performance',
          description: 'Monitoraggio prestazioni e errori',
          lawfulBasis: 'Interesse legittimo',
          retention: '90 giorni',
          consequences: 'Possibili problemi tecnici non risolti'
        }
      ],
      dataTypes: ['eventi_utilizzo', 'metriche_performance', 'crash_reports'],
      thirdParties: [
        {
          name: 'Google Analytics',
          purpose: 'Analisi comportamento utenti',
          country: 'USA',
          safeguards: 'Standard Contractual Clauses'
        }
      ]
    },
    {
      id: 'marketing',
      name: 'Marketing e Comunicazioni',
      description: 'Per inviarti comunicazioni personalizzate',
      icon: Info,
      required: false,
      purposes: [
        {
          id: 'email_marketing',
          name: 'Email Marketing',
          description: 'Newsletter, promozioni e consigli per il tuo cane',
          lawfulBasis: 'Consenso',
          retention: 'Fino alla revoca del consenso',
          consequences: 'Non riceverai le nostre comunicazioni'
        },
        {
          id: 'personalized_ads',
          name: 'Pubblicità Personalizzata',
          description: 'Annunci mirati basati sui tuoi interessi',
          lawfulBasis: 'Consenso',
          retention: '13 mesi',
          consequences: 'Pubblicità meno rilevante'
        }
      ],
      dataTypes: ['email', 'cronologia_acquisti', 'interessi_prodotti'],
      thirdParties: [
        {
          name: 'Mailchimp',
          purpose: 'Invio newsletter',
          country: 'USA',
          safeguards: 'Privacy Shield e SCC'
        }
      ]
    },
    {
      id: 'research',
      name: 'Ricerca e Sviluppo',
      description: 'Per sviluppare nuovi prodotti e servizi',
      icon: AlertTriangle,
      required: false,
      purposes: [
        {
          id: 'product_research',
          name: 'Ricerca Prodotti',
          description: 'Sviluppo nuovi prodotti alimentari',
          lawfulBasis: 'Consenso',
          retention: '5 anni',
          consequences: 'Meno innovazione nei prodotti'
        },
        {
          id: 'health_research',
          name: 'Ricerca Salute',
          description: 'Studi anonimi su salute e benessere canino',
          lawfulBasis: 'Consenso',
          retention: '10 anni (anonimizzati)',
          consequences: 'Meno progressi nella ricerca veterinaria'
        }
      ],
      dataTypes: ['dati_salute_cane', 'comportamenti_alimentari', 'reazioni_prodotti'],
      thirdParties: [
        {
          name: 'Università Partner',
          purpose: 'Ricerca veterinaria',
          country: 'EU',
          safeguards: 'Accordi di ricerca GDPR-compliant'
        }
      ]
    }
  ]

  useEffect(() => {
    loadConsentData()
  }, [userId])

  const loadConsentData = async () => {
    try {
      // Carica consensi esistenti e impostazioni privacy
      // In produzione: chiamate API per caricare dati

      // Simula caricamento dati
      const mockConsents = {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false,
        research: false
      }

      setConsents(mockConsents)

      // Carica cronologia consensi per transparency
      const mockHistory: ConsentRecord[] = [
        {
          id: 'consent_1',
          userId,
          type: 'marketing',
          purpose: 'Email marketing',
          granted: false,
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          method: 'explicit',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          version: '1.0'
        }
      ]

      setConsentHistory(mockHistory)

    } catch (error) {
      console.error('Errore nel caricamento consensi:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConsentChange = async (categoryId: string, granted: boolean) => {
    const newConsents = { ...consents, [categoryId]: granted }
    setConsents(newConsents)

    // Registra il consenso
    await dataProtectionManager.recordConsent(
      userId,
      categoryId as any,
      `${categoryId} consent`,
      granted,
      'explicit',
      '127.0.0.1', // In produzione: IP reale
      navigator.userAgent
    )

    // Notifica parent component
    onConsentChange?.(newConsents)

    trackCTA({
      ctaId: 'privacy.consent.changed',
      event: 'consent_updated',
      value: categoryId,
      metadata: {
        userId,
        category: categoryId,
        granted,
        mode
      }
    })

    // Aggiorna Google Consent Mode se in cookie banner
    if (mode === 'cookie_banner') {
      dataProtectionManager.manageCookieConsent(userId, [categoryId], granted)
    }
  }

  const handleAcceptAll = async () => {
    const allConsents = {}
    consentCategories.forEach(category => {
      allConsents[category.id] = true
    })

    for (const [categoryId, granted] of Object.entries(allConsents)) {
      await handleConsentChange(categoryId, granted as boolean)
    }

    trackCTA({
      ctaId: 'privacy.consent.accept_all',
      event: 'consent_accept_all',
      value: 'all_categories',
      metadata: { userId, mode }
    })

    onComplete?.()
  }

  const handleRejectAll = async () => {
    const minimalConsents = {}
    consentCategories.forEach(category => {
      minimalConsents[category.id] = category.required
    })

    for (const [categoryId, granted] of Object.entries(minimalConsents)) {
      await handleConsentChange(categoryId, granted as boolean)
    }

    trackCTA({
      ctaId: 'privacy.consent.reject_all',
      event: 'consent_reject_all',
      value: 'essential_only',
      metadata: { userId, mode }
    })

    onComplete?.()
  }

  const exportConsentData = async () => {
    const consentData = {
      consents: consents,
      history: consentHistory,
      exportedAt: new Date().toISOString(),
      userId
    }

    const blob = new Blob([JSON.stringify(consentData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `piucane-consent-data-${userId}.json`
    a.click()

    trackCTA({
      ctaId: 'privacy.consent.exported',
      event: 'consent_data_exported',
      value: 'user_request',
      metadata: { userId }
    })
  }

  const renderConsentCategory = (category: ConsentCategory) => (
    <Card key={category.id} className={`mb-4 ${category.required ? 'border-blue-200 bg-blue-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <category.icon className={`h-5 w-5 mt-1 ${category.required ? 'text-blue-600' : 'text-gray-600'}`} />
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {category.name}
                {category.required && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Obbligatorio</span>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(showDetails === category.id ? null : category.id)}
            >
              <Info className="h-4 w-4" />
            </Button>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={consents[category.id] || false}
                onChange={(e) => handleConsentChange(category.id, e.target.checked)}
                disabled={category.required}
                className="sr-only peer"
              />
              <div className={`
                relative w-11 h-6 rounded-full transition-colors
                ${consents[category.id] ? 'bg-piucane-primary' : 'bg-gray-200'}
                ${category.required ? 'opacity-50' : 'peer-focus:ring-2 peer-focus:ring-piucane-primary peer-focus:ring-offset-2'}
              `}>
                <div className={`
                  absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform
                  ${consents[category.id] ? 'translate-x-5' : 'translate-x-0'}
                `} />
              </div>
            </label>
          </div>
        </div>
      </CardHeader>

      {showDetails === category.id && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Purposes */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Finalità del trattamento:</h4>
              <div className="space-y-2">
                {category.purposes.map((purpose) => (
                  <div key={purpose.id} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-medium text-sm">{purpose.name}</h5>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                        {purpose.lawfulBasis}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{purpose.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">Conservazione:</span> {purpose.retention}
                      </div>
                      <div>
                        <span className="font-medium">Conseguenze rifiuto:</span> {purpose.consequences}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Types */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tipi di dati trattati:</h4>
              <div className="flex flex-wrap gap-2">
                {category.dataTypes.map((dataType) => (
                  <span key={dataType} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {dataType.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Third Parties */}
            {category.thirdParties && category.thirdParties.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Terze parti coinvolte:</h4>
                <div className="space-y-2">
                  {category.thirdParties.map((party, index) => (
                    <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-medium text-sm">{party.name}</h5>
                        <span className="text-xs text-gray-500">{party.country}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{party.purpose}</p>
                      <p className="text-xs text-gray-500">
                        <strong>Garanzie:</strong> {party.safeguards}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-piucane-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {mode === 'cookie_banner' && (
        <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">🍪 Rispettiamo la tua privacy</h3>
                <p className="text-sm text-gray-600">
                  Utilizziamo cookies e tecnologie simili per migliorare la tua esperienza.
                  Puoi gestire le tue preferenze qui sotto.
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" onClick={handleRejectAll}>
                  Solo Essenziali
                </Button>
                <Button size="sm" onClick={handleAcceptAll}>
                  Accetta Tutto
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails('settings')}>
                  Personalizza
                </Button>
              </div>
            </div>

            {showDetails === 'settings' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {consentCategories.filter(c => !c.required).map(category => (
                    <label key={category.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={consents[category.id] || false}
                        onChange={(e) => handleConsentChange(category.id, e.target.checked)}
                        className="text-piucane-primary"
                      />
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-gray-600">{category.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode !== 'cookie_banner' && (
        <>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'onboarding' ? 'Le tue preferenze sulla privacy' : 'Gestione Consensi'}
            </h1>
            <p className="text-gray-600">
              Hai il controllo completo sui tuoi dati. Scegli cosa condividere per personalizzare la tua esperienza.
            </p>
          </div>

          {/* Quick Actions */}
          {mode === 'settings' && (
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <Button onClick={handleAcceptAll} size="sm">
                  Accetta Tutto
                </Button>
                <Button onClick={handleRejectAll} variant="outline" size="sm">
                  Solo Essenziali
                </Button>
              </div>

              <div className="flex gap-2">
                <Button onClick={exportConsentData} variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Dati
                </Button>
              </div>
            </div>
          )}

          {/* Consent Categories */}
          <div className="space-y-4">
            {consentCategories.map(renderConsentCategory)}
          </div>

          {/* Consent History */}
          {mode === 'settings' && consentHistory.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Cronologia Consensi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {consentHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{record.purpose}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(record.timestamp).toLocaleDateString('it-IT')} via {record.method}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.granted ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {record.granted ? 'Concesso' : 'Negato'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {mode === 'onboarding' && (
            <div className="flex justify-center mt-8">
              <Button onClick={onComplete} size="lg">
                Continua con queste impostazioni
              </Button>
            </div>
          )}

          {/* Legal Info */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="mb-2">
              🛡️ <strong>I tuoi diritti:</strong> Puoi modificare questi consensi in qualsiasi momento.
              Hai diritto all'accesso, alla portabilità, alla rettifica e alla cancellazione dei tuoi dati.
            </p>
            <p>
              📧 Per esercitare i tuoi diritti o per domande sulla privacy, contattaci a{' '}
              <a href="mailto:privacy@piucane.com" className="text-piucane-primary hover:underline">
                privacy@piucane.com
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
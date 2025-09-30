'use client'

/**
 * Privacy Settings Component - GDPR compliant privacy management
 * Handles data processing consents, privacy preferences, and cookie settings
 */

import React, { useState } from 'react'
import {
  Shield,
  Eye,
  Database,
  Cookie,
  Users,
  FileText,
  AlertTriangle,
  Check,
  X,
  Info,
  ExternalLink,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackCTA } from '@/analytics/ga4'
import type { UserProfile, PrivacySettings as PrivacySettingsType } from '@/types/account'

interface PrivacySettingsProps {
  user: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
  loading: boolean
}

interface ConsentItem {
  key: keyof PrivacySettingsType['dataProcessing']
  title: string
  description: string
  required: boolean
  benefits: string[]
  risks: string[]
}

export function PrivacySettings({ user, onUpdate, loading }: PrivacySettingsProps) {
  const [localSettings, setLocalSettings] = useState<PrivacySettingsType>(user.preferences.privacy)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)

  const dataProcessingItems: ConsentItem[] = [
    {
      key: 'essential',
      title: 'Elaborazione dati essenziali',
      description: 'Dati necessari per il funzionamento del servizio e l\'erogazione degli ordini',
      required: true,
      benefits: [
        'Gestione account e autenticazione',
        'Elaborazione ordini e pagamenti',
        'Assistenza clienti'
      ],
      risks: [
        'Senza questi dati non possiamo fornirti il servizio'
      ]
    },
    {
      key: 'analytics',
      title: 'Analitiche e miglioramento servizio',
      description: 'Raccolta dati aggregati per migliorare l\'esperienza utente',
      required: false,
      benefits: [
        'Miglioramento performance del sito',
        'Identificazione problemi tecnici',
        'Ottimizzazione dell\'esperienza utente'
      ],
      risks: [
        'Tracciamento delle tue attività sul sito',
        'Creazione di profili comportamentali anonimi'
      ]
    },
    {
      key: 'marketing',
      title: 'Marketing e comunicazione',
      description: 'Invio di offerte personalizzate e comunicazioni commerciali',
      required: false,
      benefits: [
        'Offerte personalizzate per i tuoi cani',
        'Sconti esclusivi e promozioni',
        'Consigli nutrizionali mirati'
      ],
      risks: [
        'Ricezione di email promozionali',
        'Profilazione per scopi commerciali',
        'Possibile condivisione con partner commerciali'
      ]
    },
    {
      key: 'personalization',
      title: 'Personalizzazione',
      description: 'Adattamento dell\'esperienza in base alle tue preferenze',
      required: false,
      benefits: [
        'Raccomandazioni prodotti personalizzate',
        'Contenuti mirati per i tuoi cani',
        'Interfaccia adattata alle tue abitudini'
      ],
      risks: [
        'Creazione di profili dettagliati',
        'Tracciamento comportamento di navigazione',
        'Possibile effetto "bolla filtro"'
      ]
    },
    {
      key: 'thirdParty',
      title: 'Condivisione con terze parti',
      description: 'Condivisione limitata di dati con partner selezionati',
      required: false,
      benefits: [
        'Accesso a servizi integrati (veterinari, assicurazioni)',
        'Offerte da partner qualificati',
        'Servizi di logistica ottimizzati'
      ],
      risks: [
        'I tuoi dati potrebbero essere processati da aziende esterne',
        'Minore controllo sui tuoi dati',
        'Possibili comunicazioni commerciali da partner'
      ]
    }
  ]

  const retentionOptions = [
    { value: 'indefinite', label: 'Indefinito', description: 'Finché mantieni l\'account attivo' },
    { value: '1year', label: '1 anno', description: 'I dati vengono eliminati dopo 1 anno' },
    { value: '3years', label: '3 anni', description: 'I dati vengono eliminati dopo 3 anni' },
    { value: '5years', label: '5 anni', description: 'I dati vengono eliminati dopo 5 anni' }
  ]

  const handleConsentChange = (key: keyof PrivacySettingsType['dataProcessing'], value: boolean) => {
    if (key === 'essential') return // Cannot change essential processing

    const newSettings = {
      ...localSettings,
      dataProcessing: {
        ...localSettings.dataProcessing,
        [key]: value
      }
    }

    setLocalSettings(newSettings)
    setHasChanges(true)

    trackCTA({
      ctaId: `privacy.consent.${key}`,
      event: 'privacy_consent_change',
      value: value ? 'granted' : 'revoked',
      metadata: { consentType: key }
    })
  }

  const handleRetentionChange = (
    category: keyof PrivacySettingsType['dataRetention'],
    value: string
  ) => {
    const newSettings = {
      ...localSettings,
      dataRetention: {
        ...localSettings.dataRetention,
        [category]: value
      }
    }

    setLocalSettings(newSettings)
    setHasChanges(true)
  }

  const handleSaveSettings = async () => {
    try {
      await onUpdate({
        preferences: {
          ...user.preferences,
          privacy: localSettings
        }
      })

      setHasChanges(false)
      trackCTA({
        ctaId: 'privacy.settings.saved',
        event: 'privacy_settings_update',
        value: 'success',
        metadata: {
          settings: Object.keys(localSettings.dataProcessing).filter(
            key => localSettings.dataProcessing[key as keyof typeof localSettings.dataProcessing]
          )
        }
      })
    } catch (error) {
      console.error('Privacy settings update failed:', error)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy e protezione dati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">I tuoi diritti sulla privacy</h3>
                <p className="text-sm text-blue-800 mb-2">
                  In conformità al GDPR, hai il controllo completo sui tuoi dati personali.
                  Puoi modificare le tue preferenze in qualsiasi momento.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Privacy Policy
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    Cookie Policy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Processing Consents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Consensi per l'elaborazione dati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataProcessingItems.map((item) => (
            <div key={item.key} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    {item.required && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Obbligatorio
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection(item.key)}
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.dataProcessing[item.key]}
                      onChange={(e) => handleConsentChange(item.key, e.target.checked)}
                      disabled={item.required}
                      className="sr-only peer"
                    />
                    <div className={`relative w-11 h-6 rounded-full peer transition-colors ${
                      localSettings.dataProcessing[item.key]
                        ? 'bg-piucane-primary'
                        : 'bg-gray-200'
                    } ${item.required ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                        localSettings.dataProcessing[item.key] ? 'translate-x-5' : ''
                      }`} />
                    </div>
                  </label>
                </div>
              </div>

              {expandedSections.has(item.key) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <h4 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Vantaggi
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {item.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Considerazioni
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {item.risks.map((risk, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cookie Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="w-5 h-5" />
            Impostazioni Cookie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'essential' as const,
                title: 'Cookie essenziali',
                description: 'Necessari per il funzionamento del sito',
                required: true
              },
              {
                key: 'analytics' as const,
                title: 'Cookie analitici',
                description: 'Per migliorare le performance del sito',
                required: false
              },
              {
                key: 'marketing' as const,
                title: 'Cookie marketing',
                description: 'Per personalizzare annunci e contenuti',
                required: false
              },
              {
                key: 'preferences' as const,
                title: 'Cookie preferenze',
                description: 'Per ricordare le tue scelte',
                required: false
              }
            ].map((cookie) => (
              <div key={cookie.key} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{cookie.title}</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.cookies[cookie.key]}
                      onChange={(e) => {
                        if (cookie.required) return
                        const newSettings = {
                          ...localSettings,
                          cookies: {
                            ...localSettings.cookies,
                            [cookie.key]: e.target.checked
                          }
                        }
                        setLocalSettings(newSettings)
                        setHasChanges(true)
                      }}
                      disabled={cookie.required}
                      className="sr-only peer"
                    />
                    <div className={`relative w-11 h-6 rounded-full peer transition-colors ${
                      localSettings.cookies[cookie.key]
                        ? 'bg-piucane-primary'
                        : 'bg-gray-200'
                    } ${cookie.required ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                        localSettings.cookies[cookie.key] ? 'translate-x-5' : ''
                      }`} />
                    </div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">{cookie.description}</p>
                {cookie.required && (
                  <span className="text-xs text-red-600 mt-1 block">Obbligatorio</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Visibilità profilo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                value: 'private' as const,
                label: 'Privato',
                description: 'Solo tu puoi vedere le tue informazioni'
              },
              {
                value: 'friends' as const,
                label: 'Amici',
                description: 'Visibile solo ai tuoi amici nella community'
              },
              {
                value: 'public' as const,
                label: 'Pubblico',
                description: 'Visibile a tutti gli utenti della piattaforma'
              }
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="profileVisibility"
                  value={option.value}
                  checked={localSettings.profileVisibility === option.value}
                  onChange={(e) => {
                    const newSettings = {
                      ...localSettings,
                      profileVisibility: e.target.value as 'private' | 'friends' | 'public'
                    }
                    setLocalSettings(newSettings)
                    setHasChanges(true)
                  }}
                  className="text-piucane-primary focus:ring-piucane-primary"
                />
                <div>
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Durata conservazione dati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: 'accountData' as const,
              title: 'Dati account',
              description: 'Informazioni profilo e preferenze'
            },
            {
              key: 'healthData' as const,
              title: 'Dati sanitari',
              description: 'Informazioni sui tuoi cani e salute'
            },
            {
              key: 'communicationData' as const,
              title: 'Dati comunicazioni',
              description: 'Chat, email e messaggi'
            }
          ].map((category) => (
            <div key={category.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">{category.title}</h3>
                <p className="text-sm text-gray-600">{category.description}</p>
              </div>
              <select
                value={localSettings.dataRetention[category.key]}
                onChange={(e) => handleRetentionChange(category.key, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
              >
                {retentionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Condivisione dati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              key: 'veterinarians' as const,
              title: 'Veterinari',
              description: 'Condividi dati sanitari con veterinari autorizzati'
            },
            {
              key: 'partners' as const,
              title: 'Partner commerciali',
              description: 'Condividi per offerte personalizzate da partner selezionati'
            },
            {
              key: 'research' as const,
              title: 'Ricerca scientifica',
              description: 'Contribuisci alla ricerca veterinaria (dati anonimizzati)'
            }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.dataSharing[item.key]}
                  onChange={(e) => {
                    const newSettings = {
                      ...localSettings,
                      dataSharing: {
                        ...localSettings.dataSharing,
                        [item.key]: e.target.checked
                      }
                    }
                    setLocalSettings(newSettings)
                    setHasChanges(true)
                  }}
                  className="sr-only peer"
                />
                <div className={`relative w-11 h-6 rounded-full peer transition-colors ${
                  localSettings.dataSharing[item.key]
                    ? 'bg-piucane-primary'
                    : 'bg-gray-200'
                }`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                    localSettings.dataSharing[item.key] ? 'translate-x-5' : ''
                  }`} />
                </div>
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Hai modifiche non salvate</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLocalSettings(user.preferences.privacy)
                  setHasChanges(false)
                }}
              >
                Annulla
              </Button>
              <Button onClick={handleSaveSettings} loading={loading}>
                Salva impostazioni
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
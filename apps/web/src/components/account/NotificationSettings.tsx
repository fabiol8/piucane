'use client'

/**
 * Notification Settings Component - Communication preferences management
 * Comprehensive notification control with quiet hours and frequency settings
 */

import React, { useState, useEffect } from 'react'
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Volume2,
  VolumeX,
  Clock,
  Package,
  Heart,
  Target,
  Users,
  ShoppingBag,
  Settings,
  Save,
  TestTube,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackCTA } from '@/analytics/ga4'
import type { UserProfile, NotificationSettings as NotificationSettingsType, NotificationCategory } from '@/types/account'

interface NotificationSettingsProps {
  user: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
  loading: boolean
}

interface NotificationGroup {
  key: keyof NotificationSettingsType['categories']
  title: string
  description: string
  icon: React.ElementType
  color: string
  items: NotificationItem[]
}

interface NotificationItem {
  key: string
  title: string
  description: string
  example: string
}

const notificationGroups: NotificationGroup[] = [
  {
    key: 'orders',
    title: 'Ordini e spedizioni',
    description: 'Aggiornamenti sui tuoi acquisti',
    icon: Package,
    color: 'blue',
    items: [
      {
        key: 'order_confirmed',
        title: 'Conferma ordine',
        description: 'Quando il tuo ordine viene confermato',
        example: 'Ordine #12345 confermato - Spedizione prevista domani'
      },
      {
        key: 'shipment_tracking',
        title: 'Tracciamento spedizioni',
        description: 'Aggiornamenti sullo stato di spedizione',
        example: 'Il tuo pacco è in viaggio - Consegna prevista oggi'
      },
      {
        key: 'delivery_updates',
        title: 'Consegne',
        description: 'Conferme di consegna e problemi',
        example: 'Pacco consegnato alle 14:30 presso il tuo indirizzo'
      },
      {
        key: 'subscription_renewals',
        title: 'Rinnovi abbonamenti',
        description: 'Promemoria per i tuoi abbonamenti',
        example: 'Il tuo abbonamento Royal Canin si rinnova tra 3 giorni'
      }
    ]
  },
  {
    key: 'health',
    title: 'Salute e benessere',
    description: 'Promemoria per la salute dei tuoi cani',
    icon: Heart,
    color: 'red',
    items: [
      {
        key: 'vaccination_reminders',
        title: 'Vaccini',
        description: 'Promemoria per vaccini e richiami',
        example: 'È ora di fare il richiamo antirabbico a Lucky'
      },
      {
        key: 'medication_alerts',
        title: 'Farmaci',
        description: 'Promemoria per somministrazione farmaci',
        example: 'Ora di dare l\'antibiotico a Mia (mattina)'
      },
      {
        key: 'vet_appointments',
        title: 'Visite veterinarie',
        description: 'Promemoria per appuntamenti dal veterinario',
        example: 'Visita di controllo per Rex domani alle 15:00'
      },
      {
        key: 'weight_tracking',
        title: 'Controllo peso',
        description: 'Promemoria per pesare il tuo cane',
        example: 'È ora di pesare Bella - ultimo controllo 1 mese fa'
      }
    ]
  },
  {
    key: 'missions',
    title: 'Missioni e sfide',
    description: 'Aggiornamenti su missioni e obiettivi',
    icon: Target,
    color: 'green',
    items: [
      {
        key: 'mission_progress',
        title: 'Progressi missioni',
        description: 'Aggiornamenti sui tuoi progressi',
        example: 'Hai completato il 75% della missione "Cane in forma"'
      },
      {
        key: 'new_missions',
        title: 'Nuove missioni',
        description: 'Quando sono disponibili nuove missioni',
        example: 'Nuova missione disponibile: "Esploratore urbano"'
      },
      {
        key: 'achievements',
        title: 'Traguardi raggiunti',
        description: 'Quando ottieni badge e riconoscimenti',
        example: 'Congratulazioni! Hai ottenuto il badge "Genitore attento"'
      },
      {
        key: 'leaderboard',
        title: 'Classifiche',
        description: 'Posizioni in classifica e competizioni',
        example: 'Sei salito al 2° posto nella classifica mensile!'
      }
    ]
  },
  {
    key: 'social',
    title: 'Community e social',
    description: 'Interazioni con altri utenti',
    icon: Users,
    color: 'purple',
    items: [
      {
        key: 'friend_requests',
        title: 'Richieste amicizia',
        description: 'Nuove richieste di amicizia',
        example: 'Marco ti ha inviato una richiesta di amicizia'
      },
      {
        key: 'community_updates',
        title: 'Aggiornamenti community',
        description: 'Novità dalla community',
        example: 'Il tuo amico Andrea ha condiviso una foto di Buddy'
      },
      {
        key: 'events',
        title: 'Eventi locali',
        description: 'Eventi per cani nella tua zona',
        example: 'Dog park party questo sabato a Milano - Parco Lambro'
      }
    ]
  },
  {
    key: 'marketing',
    title: 'Offerte e promozioni',
    description: 'Sconti e offerte personalizzate',
    icon: ShoppingBag,
    color: 'orange',
    items: [
      {
        key: 'personalized_offers',
        title: 'Offerte personalizzate',
        description: 'Sconti basati sui tuoi acquisti',
        example: '20% di sconto su tutti i prodotti Royal Canin'
      },
      {
        key: 'flash_sales',
        title: 'Offerte flash',
        description: 'Promozioni a tempo limitato',
        example: 'Flash sale: -50% su tutti i giocattoli per 2 ore!'
      },
      {
        key: 'new_products',
        title: 'Nuovi prodotti',
        description: 'Quando arrivano nuovi prodotti',
        example: 'Nuovo: Hill\'s Prescription Diet per cani senior'
      },
      {
        key: 'price_drops',
        title: 'Riduzioni prezzo',
        description: 'Quando calano i prezzi dei prodotti che ti interessano',
        example: 'Il prezzo del cibo preferito di Rex è sceso del 15%'
      }
    ]
  },
  {
    key: 'system',
    title: 'Sistema e sicurezza',
    description: 'Aggiornamenti tecnici e di sicurezza',
    icon: Settings,
    color: 'gray',
    items: [
      {
        key: 'security_alerts',
        title: 'Avvisi sicurezza',
        description: 'Accessi sospetti e problemi di sicurezza',
        example: 'Nuovo accesso al tuo account da Milano (iPhone)'
      },
      {
        key: 'system_updates',
        title: 'Aggiornamenti sistema',
        description: 'Nuove funzionalità e manutenzioni',
        example: 'Nuova funzione disponibile: Tracciamento peso avanzato'
      },
      {
        key: 'policy_changes',
        title: 'Modifiche policy',
        description: 'Aggiornamenti privacy e termini di servizio',
        example: 'Abbiamo aggiornato la nostra Privacy Policy'
      }
    ]
  }
]

export function NotificationSettings({ user, onUpdate, loading }: NotificationSettingsProps) {
  // Initialize with default notification settings
  const getDefaultNotificationSettings = (): NotificationSettingsType => ({
    id: user.id,
    userId: user.id,
    categories: {
      orders: { email: true, push: true, sms: false, whatsapp: true, inApp: true },
      health: { email: true, push: true, sms: true, whatsapp: true, inApp: true },
      missions: { email: false, push: true, sms: false, whatsapp: false, inApp: true },
      social: { email: true, push: true, sms: false, whatsapp: false, inApp: true },
      marketing: { email: false, push: false, sms: false, whatsapp: false, inApp: false },
      system: { email: true, push: true, sms: false, whatsapp: false, inApp: true }
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'Europe/Rome'
    },
    frequency: {
      digest: 'weekly',
      immediate: true,
      batched: false
    },
    updatedAt: new Date().toISOString()
  })

  const [localSettings, setLocalSettings] = useState<NotificationSettingsType>(getDefaultNotificationSettings())
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [testingChannel, setTestingChannel] = useState<string | null>(null)

  useEffect(() => {
    // In a real app, you would fetch the user's notification settings
    // For now, we'll use the default settings
    setLocalSettings(getDefaultNotificationSettings())
  }, [user])

  const handleCategoryChange = (
    categoryKey: keyof NotificationSettingsType['categories'],
    channelKey: keyof NotificationCategory,
    value: boolean
  ) => {
    const newSettings = {
      ...localSettings,
      categories: {
        ...localSettings.categories,
        [categoryKey]: {
          ...localSettings.categories[categoryKey],
          [channelKey]: value
        }
      },
      updatedAt: new Date().toISOString()
    }

    setLocalSettings(newSettings)
    setHasChanges(true)

    trackCTA({
      ctaId: `notifications.${categoryKey}.${channelKey}`,
      event: 'notification_setting_change',
      value: value ? 'enabled' : 'disabled',
      metadata: { category: categoryKey, channel: channelKey }
    })
  }

  const handleBulkChange = (
    categoryKey: keyof NotificationSettingsType['categories'],
    enabled: boolean
  ) => {
    const newSettings = {
      ...localSettings,
      categories: {
        ...localSettings.categories,
        [categoryKey]: {
          email: enabled,
          push: enabled,
          sms: enabled,
          whatsapp: enabled,
          inApp: enabled
        }
      },
      updatedAt: new Date().toISOString()
    }

    setLocalSettings(newSettings)
    setHasChanges(true)

    trackCTA({
      ctaId: `notifications.${categoryKey}.bulk`,
      event: 'notification_bulk_change',
      value: enabled ? 'all_enabled' : 'all_disabled',
      metadata: { category: categoryKey }
    })
  }

  const handleQuietHoursChange = (field: keyof NotificationSettingsType['quietHours'], value: any) => {
    const newSettings = {
      ...localSettings,
      quietHours: {
        ...localSettings.quietHours,
        [field]: value
      },
      updatedAt: new Date().toISOString()
    }

    setLocalSettings(newSettings)
    setHasChanges(true)
  }

  const handleFrequencyChange = (field: keyof NotificationSettingsType['frequency'], value: any) => {
    const newSettings = {
      ...localSettings,
      frequency: {
        ...localSettings.frequency,
        [field]: value
      },
      updatedAt: new Date().toISOString()
    }

    setLocalSettings(newSettings)
    setHasChanges(true)
  }

  const handleSaveSettings = async () => {
    try {
      // In a real app, you would save the notification settings to the backend
      // await updateNotificationSettings(localSettings)

      setHasChanges(false)

      trackCTA({
        ctaId: 'notifications.settings.saved',
        event: 'notification_settings_update',
        value: 'success',
        metadata: {
          enabledCategories: Object.keys(localSettings.categories).filter(
            key => Object.values(localSettings.categories[key as keyof typeof localSettings.categories]).some(v => v)
          )
        }
      })
    } catch (error) {
      console.error('Notification settings update failed:', error)
    }
  }

  const testNotification = async (channel: 'email' | 'push' | 'sms' | 'whatsapp') => {
    setTestingChannel(channel)

    try {
      // Simulate sending test notification
      await new Promise(resolve => setTimeout(resolve, 1000))

      trackCTA({
        ctaId: `notifications.test.${channel}`,
        event: 'notification_test',
        value: 'sent',
        metadata: { channel }
      })
    } catch (error) {
      console.error('Test notification failed:', error)
    } finally {
      setTestingChannel(null)
    }
  }

  const toggleGroupExpansion = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const getChannelIcon = (channel: keyof NotificationCategory) => {
    switch (channel) {
      case 'email': return Mail
      case 'push': return Smartphone
      case 'sms': return MessageSquare
      case 'whatsapp': return MessageSquare
      case 'inApp': return Bell
      default: return Bell
    }
  }

  const getChannelLabel = (channel: keyof NotificationCategory) => {
    switch (channel) {
      case 'email': return 'Email'
      case 'push': return 'Push'
      case 'sms': return 'SMS'
      case 'whatsapp': return 'WhatsApp'
      case 'inApp': return 'In-app'
      default: return channel
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Impostazioni notifiche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotification('email')}
              loading={testingChannel === 'email'}
            >
              <Mail className="w-4 h-4 mr-2" />
              Test email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotification('push')}
              loading={testingChannel === 'push'}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Test push
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotification('sms')}
              loading={testingChannel === 'sms'}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Test SMS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotification('whatsapp')}
              loading={testingChannel === 'whatsapp'}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Test WhatsApp
            </Button>
          </div>

          {/* Quiet Hours */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {localSettings.quietHours.enabled ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  Ore di silenzio
                </h3>
                <p className="text-sm text-gray-600">
                  Silenzia le notifiche durante le ore specificate
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.quietHours.enabled}
                  onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`relative w-11 h-6 rounded-full peer transition-colors ${
                  localSettings.quietHours.enabled ? 'bg-piucane-primary' : 'bg-gray-200'
                }`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                    localSettings.quietHours.enabled ? 'translate-x-5' : ''
                  }`} />
                </div>
              </label>
            </div>

            {localSettings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Inizio
                  </label>
                  <input
                    type="time"
                    value={localSettings.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Fine
                  </label>
                  <input
                    type="time"
                    value={localSettings.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Frequency Settings */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Frequenza notifiche</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Digest email
                </label>
                <select
                  value={localSettings.frequency.digest}
                  onChange={(e) => handleFrequencyChange('digest', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
                >
                  <option value="never">Mai</option>
                  <option value="daily">Giornaliero</option>
                  <option value="weekly">Settimanale</option>
                  <option value="monthly">Mensile</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="immediate"
                  checked={localSettings.frequency.immediate}
                  onChange={(e) => handleFrequencyChange('immediate', e.target.checked)}
                  className="rounded text-piucane-primary focus:ring-piucane-primary"
                />
                <label htmlFor="immediate" className="text-sm text-gray-700">
                  Notifiche immediate
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="batched"
                  checked={localSettings.frequency.batched}
                  onChange={(e) => handleFrequencyChange('batched', e.target.checked)}
                  className="rounded text-piucane-primary focus:ring-piucane-primary"
                />
                <label htmlFor="batched" className="text-sm text-gray-700">
                  Raggruppa notifiche
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <div className="space-y-4">
        {notificationGroups.map((group) => {
          const Icon = group.icon
          const isExpanded = expandedGroups.has(group.key)
          const categorySettings = localSettings.categories[group.key]
          const hasAnyEnabled = Object.values(categorySettings).some(v => v)

          return (
            <Card key={group.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      group.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      group.color === 'red' ? 'bg-red-100 text-red-600' :
                      group.color === 'green' ? 'bg-green-100 text-green-600' :
                      group.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      group.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBulkChange(group.key, !hasAnyEnabled)}
                      className={hasAnyEnabled ? 'text-red-600' : 'text-green-600'}
                    >
                      {hasAnyEnabled ? 'Disabilita tutto' : 'Abilita tutto'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGroupExpansion(group.key)}
                    >
                      {isExpanded ? 'Comprimi' : 'Espandi'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Channel Toggles */}
                <div className="grid grid-cols-5 gap-4 mb-4">
                  {(['email', 'push', 'sms', 'whatsapp', 'inApp'] as const).map((channel) => {
                    const ChannelIcon = getChannelIcon(channel)
                    const isEnabled = categorySettings[channel]

                    return (
                      <div key={channel} className="text-center">
                        <button
                          onClick={() => handleCategoryChange(group.key, channel, !isEnabled)}
                          className={`w-full p-3 rounded-lg border transition-all ${
                            isEnabled
                              ? `${
                                  group.color === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  group.color === 'red' ? 'bg-red-50 border-red-200 text-red-700' :
                                  group.color === 'green' ? 'bg-green-50 border-green-200 text-green-700' :
                                  group.color === 'purple' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                  group.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                  'bg-gray-50 border-gray-200 text-gray-700'
                                }`
                              : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          <ChannelIcon className="w-5 h-5 mx-auto mb-1" />
                          <p className="text-xs font-medium">{getChannelLabel(channel)}</p>
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Tipi di notifica:</h4>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div key={item.key} className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-medium text-gray-900 mb-1">{item.title}</h5>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          <div className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-500 italic">
                            Esempio: {item.example}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-gray-600">Hai modifiche non salvate</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLocalSettings(getDefaultNotificationSettings())
                  setHasChanges(false)
                }}
              >
                Annulla
              </Button>
              <Button onClick={handleSaveSettings} loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Salva impostazioni
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  Clock,
  Shield,
  Volume,
  VolumeX,
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type {
  UserChannelPreferences,
  CommunicationChannel,
  ChannelConsent,
  QuietHours,
  FrequencyLimits
} from '@/types/communications'

interface NotificationPreferencesProps {
  userId: string
  onPreferencesChange?: (preferences: UserChannelPreferences) => void
}

export function NotificationPreferences({
  userId,
  onPreferencesChange
}: NotificationPreferencesProps) {
  const analytics = useAnalytics()
  const [preferences, setPreferences] = useState<UserChannelPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      // Mock data - in production fetch from API
      const mockPreferences: UserChannelPreferences = {
        userId,
        channels: {
          push: {
            enabled: true,
            transactional: true,
            marketing: true,
            caring: true,
            reminders: true,
            consentedAt: new Date().toISOString(),
            consentSource: 'settings'
          },
          email: {
            enabled: true,
            transactional: true,
            marketing: false,
            caring: true,
            reminders: true,
            consentedAt: new Date().toISOString(),
            consentSource: 'registration'
          },
          whatsapp: {
            enabled: false,
            transactional: false,
            marketing: false,
            caring: false,
            reminders: false
          },
          sms: {
            enabled: false,
            transactional: true,
            marketing: false,
            caring: false,
            reminders: false
          },
          inbox: {
            enabled: true,
            transactional: true,
            marketing: true,
            caring: true,
            reminders: true,
            consentedAt: new Date().toISOString(),
            consentSource: 'automatic'
          }
        },
        preferredChannels: ['push', 'inbox', 'email'],
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          allowCritical: true
        },
        timezone: 'Europe/Rome',
        frequencyLimits: {
          maxPushPerDay: 5,
          maxEmailPerDay: 3,
          maxWhatsAppPerWeek: 2,
          maxSMSPerWeek: 1,
          maxJourneyMessagesPerDay: 2
        },
        language: 'it',
        locale: 'it-IT',
        channelPerformance: {
          push: {
            totalSent: 120,
            totalDelivered: 115,
            totalRead: 80,
            totalClicked: 20,
            deliveryRate: 0.96,
            openRate: 0.70,
            clickRate: 0.25,
            engagementScore: 0.85,
            lastReadAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          },
          email: {
            totalSent: 45,
            totalDelivered: 44,
            totalRead: 28,
            totalClicked: 8,
            deliveryRate: 0.98,
            openRate: 0.64,
            clickRate: 0.29,
            engagementScore: 0.72,
            lastReadAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          },
          whatsapp: {
            totalSent: 0,
            totalDelivered: 0,
            totalRead: 0,
            totalClicked: 0,
            deliveryRate: 0,
            openRate: 0,
            clickRate: 0,
            engagementScore: 0,
            updatedAt: new Date().toISOString()
          },
          sms: {
            totalSent: 3,
            totalDelivered: 3,
            totalRead: 2,
            totalClicked: 1,
            deliveryRate: 1,
            openRate: 0.67,
            clickRate: 0.50,
            engagementScore: 0.59,
            updatedAt: new Date().toISOString()
          },
          inbox: {
            totalSent: 200,
            totalDelivered: 200,
            totalRead: 180,
            totalClicked: 60,
            deliveryRate: 1,
            openRate: 0.90,
            clickRate: 0.33,
            engagementScore: 0.92,
            lastReadAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          }
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }

      setPreferences(mockPreferences)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences || !hasChanges) return

    try {
      setSaving(true)

      analytics.trackEvent('notification_preferences_updated', {
        user_id: userId,
        changes: getChangedFields()
      })

      // Mock API call - in production save to backend
      await new Promise(resolve => setTimeout(resolve, 1000))

      onPreferencesChange?.(preferences)
      setHasChanges(false)

      analytics.trackEvent('notification_preferences_saved', {
        user_id: userId
      })

    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateChannelConsent = (
    channel: CommunicationChannel,
    consentType: keyof ChannelConsent,
    value: boolean
  ) => {
    if (!preferences) return

    const updatedPreferences = {
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: {
          ...preferences.channels[channel],
          [consentType]: value,
          consentedAt: value ? new Date().toISOString() : preferences.channels[channel].consentedAt,
          consentSource: 'settings'
        }
      },
      updatedAt: new Date().toISOString()
    }

    setPreferences(updatedPreferences)
    setHasChanges(true)

    analytics.trackEvent('notification_consent_changed', {
      user_id: userId,
      channel,
      consent_type: consentType,
      value
    })
  }

  const updateQuietHours = (field: keyof QuietHours, value: any) => {
    if (!preferences) return

    const updatedPreferences = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: value
      },
      updatedAt: new Date().toISOString()
    }

    setPreferences(updatedPreferences)
    setHasChanges(true)

    analytics.trackEvent('quiet_hours_updated', {
      user_id: userId,
      field,
      value
    })
  }

  const updateFrequencyLimit = (field: keyof FrequencyLimits, value: number) => {
    if (!preferences) return

    const updatedPreferences = {
      ...preferences,
      frequencyLimits: {
        ...preferences.frequencyLimits,
        [field]: value
      },
      updatedAt: new Date().toISOString()
    }

    setPreferences(updatedPreferences)
    setHasChanges(true)
  }

  const updatePreferredChannels = (channels: CommunicationChannel[]) => {
    if (!preferences) return

    const updatedPreferences = {
      ...preferences,
      preferredChannels: channels,
      updatedAt: new Date().toISOString()
    }

    setPreferences(updatedPreferences)
    setHasChanges(true)
  }

  const getChangedFields = (): string[] => {
    // Mock implementation - in production would compare with original
    return ['push', 'email', 'quietHours']
  }

  const getChannelIcon = (channel: CommunicationChannel) => {
    switch (channel) {
      case 'push':
        return <Bell className="h-5 w-5" />
      case 'email':
        return <Mail className="h-5 w-5" />
      case 'whatsapp':
        return <MessageCircle className="h-5 w-5" />
      case 'sms':
        return <Smartphone className="h-5 w-5" />
      case 'inbox':
        return <Bell className="h-5 w-5" />
    }
  }

  const getChannelName = (channel: CommunicationChannel) => {
    switch (channel) {
      case 'push':
        return 'Notifiche Push'
      case 'email':
        return 'Email'
      case 'whatsapp':
        return 'WhatsApp'
      case 'sms':
        return 'SMS'
      case 'inbox':
        return 'Inbox App'
    }
  }

  const getEngagementBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-green-500">Alta</Badge>
    if (score >= 0.6) return <Badge className="bg-yellow-500">Media</Badge>
    if (score >= 0.3) return <Badge className="bg-orange-500">Bassa</Badge>
    return <Badge variant="secondary">Nessuna</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Errore nel caricamento
          </h3>
          <p className="text-gray-600 mb-4">
            Non è stato possibile caricare le preferenze di notifica
          </p>
          <Button onClick={loadPreferences}>Riprova</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Preferenze Notifiche
          </h2>
          <p className="text-gray-600">
            Gestisci come e quando ricevere le comunicazioni da PiùCane
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="secondary" className="animate-pulse">
              Modifiche non salvate
            </Badge>
          )}
          <Button
            onClick={savePreferences}
            disabled={!hasChanges || saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Canali</TabsTrigger>
          <TabsTrigger value="timing">Orari</TabsTrigger>
          <TabsTrigger value="frequency">Frequenza</TabsTrigger>
          <TabsTrigger value="analytics">Statistiche</TabsTrigger>
        </TabsList>

        {/* Channel Preferences */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Canali di Comunicazione</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(preferences.channels).map(([channel, consent]) => {
                const ch = channel as CommunicationChannel
                const performance = preferences.channelPerformance[ch]

                return (
                  <div key={channel} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getChannelIcon(ch)}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {getChannelName(ch)}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {performance.totalSent > 0
                              ? `${performance.totalSent} messaggi inviati, ${(performance.openRate * 100).toFixed(0)}% aperti`
                              : 'Nessun messaggio inviato'
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getEngagementBadge(performance.engagementScore)}
                        <Switch
                          checked={consent.enabled}
                          onCheckedChange={(checked) =>
                            updateChannelConsent(ch, 'enabled', checked)
                          }
                        />
                      </div>
                    </div>

                    {consent.enabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Transazionali</span>
                          <Switch
                            checked={consent.transactional}
                            onCheckedChange={(checked) =>
                              updateChannelConsent(ch, 'transactional', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Marketing</span>
                          <Switch
                            checked={consent.marketing}
                            onCheckedChange={(checked) =>
                              updateChannelConsent(ch, 'marketing', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Caring</span>
                          <Switch
                            checked={consent.caring}
                            onCheckedChange={(checked) =>
                              updateChannelConsent(ch, 'caring', checked)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Promemoria</span>
                          <Switch
                            checked={consent.reminders}
                            onCheckedChange={(checked) =>
                              updateChannelConsent(ch, 'reminders', checked)
                            }
                          />
                        </div>
                      </div>
                    )}

                    {consent.consentedAt && (
                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                        Consenso dato il {new Date(consent.consentedAt).toLocaleDateString('it-IT')}
                        {consent.consentSource && ` tramite ${consent.consentSource}`}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Channel Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Priorità Canali</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Ordina i canali dalla tua preferenza più alta a quella più bassa
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {preferences.preferredChannels.map((channel, index) => (
                  <div key={channel} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    {getChannelIcon(channel)}
                    <span className="font-medium">{getChannelName(channel)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timing Preferences */}
        <TabsContent value="timing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Orari Silenziosi (Quiet Hours)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {preferences.quietHours.enabled ? (
                    <Moon className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Sun className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <h4 className="font-medium">Abilita Orari Silenziosi</h4>
                    <p className="text-sm text-gray-600">
                      Non ricevere notifiche durante le ore di riposo
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) => updateQuietHours('enabled', checked)}
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Inizio
                      </label>
                      <input
                        type="time"
                        value={preferences.quietHours.startTime}
                        onChange={(e) => updateQuietHours('startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fine
                      </label>
                      <input
                        type="time"
                        value={preferences.quietHours.endTime}
                        onChange={(e) => updateQuietHours('endTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Consenti Messaggi Critici</h4>
                      <p className="text-sm text-gray-600">
                        Permetti notifiche urgenti anche durante gli orari silenziosi
                      </p>
                    </div>
                    <Switch
                      checked={preferences.quietHours.allowCritical}
                      onCheckedChange={(checked) => updateQuietHours('allowCritical', checked)}
                    />
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Orario attuale: {preferences.quietHours.startTime} - {preferences.quietHours.endTime}</p>
                        <p>Durante questi orari non riceverai notifiche push, WhatsApp o SMS. Email e messaggi inbox rimangono sempre disponibili.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timezone */}
          <Card>
            <CardHeader>
              <CardTitle>Fuso Orario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Fuso orario corrente</span>
                  <p className="text-sm text-gray-600">
                    Utilizzato per calcolare gli orari silenziosi
                  </p>
                </div>
                <Badge variant="outline">{preferences.timezone}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frequency Limits */}
        <TabsContent value="frequency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume className="h-5 w-5" />
                <span>Limiti di Frequenza</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Controlla quanti messaggi ricevere per ogni canale
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notifiche Push al giorno</h4>
                    <p className="text-sm text-gray-600">Massimo numero di push giornaliere</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={preferences.frequencyLimits.maxPushPerDay}
                      onChange={(e) => updateFrequencyLimit('maxPushPerDay', parseInt(e.target.value))}
                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email al giorno</h4>
                    <p className="text-sm text-gray-600">Massimo numero di email giornaliere</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={preferences.frequencyLimits.maxEmailPerDay}
                      onChange={(e) => updateFrequencyLimit('maxEmailPerDay', parseInt(e.target.value))}
                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">WhatsApp a settimana</h4>
                    <p className="text-sm text-gray-600">Massimo numero di messaggi WhatsApp settimanali</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={preferences.frequencyLimits.maxWhatsAppPerWeek}
                      onChange={(e) => updateFrequencyLimit('maxWhatsAppPerWeek', parseInt(e.target.value))}
                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">SMS a settimana</h4>
                    <p className="text-sm text-gray-600">Massimo numero di SMS settimanali</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={preferences.frequencyLimits.maxSMSPerWeek}
                      onChange={(e) => updateFrequencyLimit('maxSMSPerWeek', parseInt(e.target.value))}
                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Note sui limiti:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• I messaggi transazionali (ordini, pagamenti) ignorano questi limiti</li>
                      <li>• I messaggi di emergenza sanitaria ignorano questi limiti</li>
                      <li>• La inbox non ha limiti di frequenza</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Statistiche Coinvolgimento</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Come interagisci con le nostre comunicazioni
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(preferences.channelPerformance).map(([channel, performance]) => {
                  const ch = channel as CommunicationChannel

                  return (
                    <div key={channel} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getChannelIcon(ch)}
                          <h4 className="font-medium">{getChannelName(ch)}</h4>
                        </div>
                        {getEngagementBadge(performance.engagementScore)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {performance.totalSent}
                          </div>
                          <div className="text-sm text-gray-600">Inviati</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {(performance.deliveryRate * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-600">Consegnati</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {(performance.openRate * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-600">Aperti</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {(performance.clickRate * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-600">Cliccati</div>
                        </div>
                      </div>

                      {performance.lastReadAt && (
                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                          Ultima apertura: {new Date(performance.lastReadAt).toLocaleString('it-IT')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy e Consensi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">I tuoi dati sono al sicuro</p>
                    <p>
                      Rispettiamo la tua privacy e il GDPR. Puoi modificare o revocare
                      i consensi in qualsiasi momento. I dati di performance vengono
                      utilizzati solo per migliorare l'esperienza di comunicazione.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>Account creato: {new Date(preferences.createdAt).toLocaleDateString('it-IT')}</p>
                <p>Ultimo aggiornamento: {new Date(preferences.updatedAt).toLocaleDateString('it-IT')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
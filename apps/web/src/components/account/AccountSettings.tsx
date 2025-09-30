'use client'

/**
 * Account Settings Dashboard - Main account management interface
 * Provides comprehensive account management with accessibility features
 */

import React, { useState, useEffect } from 'react'
import {
  User,
  Settings,
  Shield,
  Bell,
  CreditCard,
  Package,
  Heart,
  Download,
  Trash2,
  Edit,
  Check,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackCTA } from '@/analytics/ga4'
import { ProfileSettings } from './ProfileSettings'
import { PrivacySettings } from './PrivacySettings'
import { NotificationSettings } from './NotificationSettings'
import type { UserProfile, AccountStats, SecuritySettings } from '@/types/account'

interface AccountSettingsProps {
  user: UserProfile
  stats: AccountStats
  security: SecuritySettings
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>
  onUpdateSecurity: (updates: Partial<SecuritySettings>) => Promise<void>
  onDeleteAccount: () => Promise<void>
  onDownloadData: (type: 'full' | 'profile' | 'orders' | 'health') => Promise<void>
}

type ActiveTab = 'profile' | 'privacy' | 'notifications' | 'security' | 'data'

export function AccountSettings({
  user,
  stats,
  security,
  onUpdateProfile,
  onUpdateSecurity,
  onDeleteAccount,
  onDownloadData
}: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile')
  const [loading, setLoading] = useState(false)
  const [showDangerZone, setShowDangerZone] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  useEffect(() => {
    trackCTA({
      ctaId: 'account.settings.viewed',
      event: 'page_view',
      value: 'account_settings',
      metadata: { activeTab }
    })
  }, [activeTab])

  const tabs = [
    {
      id: 'profile' as const,
      label: 'Profilo',
      icon: User,
      description: 'Informazioni personali e preferenze'
    },
    {
      id: 'privacy' as const,
      label: 'Privacy',
      icon: Shield,
      description: 'Impostazioni privacy e consensi'
    },
    {
      id: 'notifications' as const,
      label: 'Notifiche',
      icon: Bell,
      description: 'Preferenze di comunicazione'
    },
    {
      id: 'security' as const,
      label: 'Sicurezza',
      icon: Settings,
      description: 'Password e autenticazione'
    },
    {
      id: 'data' as const,
      label: 'I miei dati',
      icon: Download,
      description: 'Download ed eliminazione dati'
    }
  ]

  const handleTabChange = (tabId: ActiveTab) => {
    setActiveTab(tabId)
    trackCTA({
      ctaId: `account.tab.${tabId}`,
      event: 'navigation',
      value: tabId,
      metadata: { previousTab: activeTab }
    })
  }

  const handleDataDownload = async (type: 'full' | 'profile' | 'orders' | 'health') => {
    setLoading(true)
    try {
      await onDownloadData(type)
      trackCTA({
        ctaId: 'account.data.download',
        event: 'data_download',
        value: type,
        metadata: { userId: user.id }
      })
    } catch (error) {
      console.error('Data download failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccountDeletion = async () => {
    if (deleteConfirmation !== 'ELIMINA') {
      alert('Inserisci "ELIMINA" per confermare')
      return
    }

    setLoading(true)
    try {
      await onDeleteAccount()
      trackCTA({
        ctaId: 'account.deleted',
        event: 'account_deletion',
        value: 'confirmed',
        metadata: { userId: user.id }
      })
    } catch (error) {
      console.error('Account deletion failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-piucane-primary to-piucane-secondary flex items-center justify-center">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ciao, {user.firstName}!
            </h1>
            <p className="text-gray-600">
              Gestisci il tuo account e le tue preferenze
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-piucane-primary" />
                <div>
                  <p className="text-sm text-gray-600">Ordini totali</p>
                  <p className="text-xl font-semibold">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Punti fedeltà</p>
                  <p className="text-xl font-semibold">{stats.loyaltyPoints.current}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Spesa totale</p>
                  <p className="text-xl font-semibold">€{stats.totalSpent.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Membro da</p>
                  <p className="text-xl font-semibold">
                    {new Date(stats.joinDate).toLocaleDateString('it-IT', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        isActive
                          ? 'bg-piucane-light text-piucane-primary border-r-2 border-piucane-primary'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="min-w-0">
                        <p className="font-medium">{tab.label}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {tab.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <ProfileSettings
              user={user}
              onUpdate={onUpdateProfile}
              loading={loading}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacySettings
              user={user}
              onUpdate={onUpdateProfile}
              loading={loading}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings
              user={user}
              onUpdate={onUpdateProfile}
              loading={loading}
            />
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Sicurezza dell'account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Password</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Ultima modifica: {new Date(security.passwordLastChanged).toLocaleDateString('it-IT')}
                  </p>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Cambia password
                  </Button>
                </div>

                {/* Two Factor Auth */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Autenticazione a due fattori</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {security.twoFactorAuth.enabled ? 'Attiva' : 'Disattiva'}
                  </p>
                  <Button
                    variant={security.twoFactorAuth.enabled ? 'outline' : 'default'}
                    size="sm"
                  >
                    {security.twoFactorAuth.enabled ? 'Disabilita' : 'Abilita'} 2FA
                  </Button>
                </div>

                {/* Active Sessions */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Sessioni attive</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {security.sessions.filter(s => s.isActive).length} sessioni attive
                  </p>
                  <Button variant="outline" size="sm">
                    Gestisci sessioni
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'data' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Gestione dei tuoi dati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Data Download Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Scarica i tuoi dati</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Ottieni una copia dei tuoi dati in formato JSON
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDataDownload('profile')}
                      loading={loading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Profilo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDataDownload('orders')}
                      loading={loading}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Ordini
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDataDownload('health')}
                      loading={loading}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Salute
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDataDownload('full')}
                      loading={loading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Tutti i dati
                    </Button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Zona pericolosa</h3>
                  </div>
                  <p className="text-sm text-red-700 mb-4">
                    Queste azioni sono irreversibili. Procedi con cautela.
                  </p>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDangerZone(!showDangerZone)}
                    className="text-red-600 hover:text-red-700"
                  >
                    {showDangerZone ? (
                      <><EyeOff className="w-4 h-4 mr-2" />Nascondi opzioni</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-2" />Mostra opzioni</>
                    )}
                  </Button>

                  {showDangerZone && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-red-800 mb-2">
                          Scrivi "ELIMINA" per confermare l'eliminazione dell'account:
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          className="w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="ELIMINA"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleAccountDeletion}
                        disabled={deleteConfirmation !== 'ELIMINA'}
                        loading={loading}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina account definitivamente
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
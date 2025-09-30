'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  Mail,
  Star,
  Archive,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  MarkAsUnread,
  ExternalLink,
  Heart,
  ShoppingBag,
  Calendar,
  AlertTriangle,
  Gift,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type {
  InboxMessage,
  InboxCategory,
  InboxStats,
  MessagePriority
} from '@/types/communications'

interface InboxPageProps {
  userId?: string
}

export default function InboxPage() {
  const analytics = useAnalytics()
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [stats, setStats] = useState<InboxStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<InboxCategory | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMessages()
    loadStats()
  }, [selectedCategory])

  const loadMessages = async () => {
    try {
      setLoading(true)

      // Mock data - in production fetch from API
      const mockMessages: InboxMessage[] = [
        {
          inboxMessageId: 'inbox_001',
          userId: 'user_001',
          dogId: 'dog_001',
          messageId: 'msg_001',
          title: 'Benvenuto in PiùCane! 🐶',
          body: 'Ciao Marco, Luna ha ora il suo spazio digitale personalizzato. Completa il profilo per iniziare questa avventura insieme!',
          summary: 'Completa il profilo di Luna per sbloccare tutte le funzionalità',
          avatar: '🐶',
          iconUrl: '/icons/welcome.svg',
          category: 'journey',
          badge: 'Nuovo',
          priority: 'high',
          read: false,
          starred: false,
          archived: false,
          cta: [
            {
              id: 'complete_profile',
              text: 'Completa Profilo',
              deeplink: 'piucane://onboarding',
              style: 'primary'
            }
          ],
          source: 'journey',
          sourceId: 'journey_onboarding',
          persistent: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          inboxMessageId: 'inbox_002',
          userId: 'user_001',
          dogId: 'dog_001',
          title: 'Promemoria vaccinazione per Luna 💉',
          body: 'È tempo della vaccinazione annuale per Luna! Prenota subito un appuntamento con il tuo veterinario di fiducia.',
          avatar: '💉',
          category: 'health',
          badge: 'Urgente',
          priority: 'critical',
          read: false,
          starred: true,
          archived: false,
          cta: [
            {
              id: 'book_appointment',
              text: 'Prenota Appuntamento',
              deeplink: 'piucane://veterinary/book',
              style: 'primary'
            },
            {
              id: 'find_vet',
              text: 'Trova Veterinario',
              deeplink: 'piucane://veterinary/search',
              style: 'secondary'
            }
          ],
          source: 'system',
          persistent: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          inboxMessageId: 'inbox_003',
          userId: 'user_001',
          dogId: 'dog_001',
          messageId: 'msg_003',
          title: 'Ordine #1234 confermato 📦',
          body: 'Il tuo ordine per Luna è stato confermato! Riceverai il pacco entro 2-3 giorni lavorativi.',
          summary: 'Ordine confermato - Consegna prevista: 15 Gennaio',
          avatar: '📦',
          category: 'orders',
          priority: 'medium',
          read: true,
          starred: false,
          archived: false,
          cta: [
            {
              id: 'track_order',
              text: 'Traccia Ordine',
              url: 'https://tracking.example.com/1234',
              style: 'primary'
            }
          ],
          source: 'manual',
          persistent: true,
          readAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          inboxMessageId: 'inbox_004',
          userId: 'user_001',
          dogId: 'dog_001',
          title: 'Nuova missione disponibile: Passeggiata Mattutina 🎯',
          body: 'Una nuova missione ti aspetta! Porta Luna a fare una passeggiata di 20 minuti e guadagna 50 punti.',
          avatar: '🎯',
          category: 'missions',
          badge: 'Nuovo',
          priority: 'medium',
          read: false,
          starred: false,
          archived: false,
          cta: [
            {
              id: 'start_mission',
              text: 'Inizia Missione',
              deeplink: 'piucane://missions/morning_walk',
              style: 'primary'
            }
          ],
          source: 'system',
          persistent: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          inboxMessageId: 'inbox_005',
          userId: 'user_001',
          title: '🎁 Offerta speciale: 20% su tutti i giochi',
          body: 'Solo per oggi! Sconto del 20% su tutti i giochi per cani. Usa il codice PLAY20 al checkout.',
          avatar: '🎁',
          category: 'promotions',
          badge: 'Offerta',
          priority: 'low',
          read: true,
          starred: false,
          archived: false,
          cta: [
            {
              id: 'shop_now',
              text: 'Acquista Ora',
              url: 'https://piucane.com/shop?code=PLAY20',
              style: 'primary'
            }
          ],
          source: 'manual',
          persistent: false,
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          readAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      // Filter by category
      const filteredMessages = selectedCategory === 'all'
        ? mockMessages
        : mockMessages.filter(msg => msg.category === selectedCategory)

      // Filter by search term
      const searchFiltered = searchTerm
        ? filteredMessages.filter(msg =>
            msg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.body.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : filteredMessages

      setMessages(searchFiltered)

    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    // Mock stats - in production fetch from API
    const mockStats: InboxStats = {
      total: 25,
      unread: 8,
      starred: 3,
      archived: 12,
      byCategory: {
        transactional: 5,
        caring: 4,
        health: 2,
        orders: 6,
        missions: 3,
        promotions: 3,
        system: 1,
        journey: 1
      },
      byPriority: {
        low: 8,
        medium: 12,
        high: 4,
        critical: 1
      }
    }

    setStats(mockStats)
  }

  const markAsRead = async (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.inboxMessageId === messageId
          ? { ...msg, read: true, readAt: new Date().toISOString() }
          : msg
      )
    )

    analytics.trackEvent('inbox_message_read', {
      message_id: messageId
    })
  }

  const markAsUnread = async (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.inboxMessageId === messageId
          ? { ...msg, read: false, readAt: undefined }
          : msg
      )
    )

    analytics.trackEvent('inbox_message_unread', {
      message_id: messageId
    })
  }

  const toggleStar = async (messageId: string) => {
    const message = messages.find(m => m.inboxMessageId === messageId)
    const newStarred = !message?.starred

    setMessages(prev =>
      prev.map(msg =>
        msg.inboxMessageId === messageId
          ? { ...msg, starred: newStarred, starredAt: newStarred ? new Date().toISOString() : undefined }
          : msg
      )
    )

    analytics.trackEvent('inbox_message_starred', {
      message_id: messageId,
      starred: newStarred
    })
  }

  const archiveMessage = async (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.inboxMessageId === messageId
          ? { ...msg, archived: true, archivedAt: new Date().toISOString() }
          : msg
      )
    )

    analytics.trackEvent('inbox_message_archived', {
      message_id: messageId
    })
  }

  const deleteMessage = async (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.inboxMessageId !== messageId))

    analytics.trackEvent('inbox_message_deleted', {
      message_id: messageId
    })
  }

  const handleCTAClick = (messageId: string, cta: any) => {
    analytics.trackEvent('inbox_cta_click', {
      message_id: messageId,
      cta_id: cta.id,
      cta_text: cta.text
    })

    if (cta.deeplink) {
      // Handle deeplink navigation
      console.log('Navigate to:', cta.deeplink)
    } else if (cta.url) {
      window.open(cta.url, '_blank')
    }

    // Mark as read when CTA is clicked
    markAsRead(messageId)
  }

  const handleBulkAction = (action: string) => {
    selectedMessages.forEach(messageId => {
      switch (action) {
        case 'mark_read':
          markAsRead(messageId)
          break
        case 'mark_unread':
          markAsUnread(messageId)
          break
        case 'star':
          toggleStar(messageId)
          break
        case 'archive':
          archiveMessage(messageId)
          break
        case 'delete':
          deleteMessage(messageId)
          break
      }
    })

    setSelectedMessages(new Set())

    analytics.trackEvent('inbox_bulk_action', {
      action,
      count: selectedMessages.size
    })
  }

  const getCategoryIcon = (category: InboxCategory) => {
    switch (category) {
      case 'transactional': return <Bell className="h-4 w-4" />
      case 'caring': return <Heart className="h-4 w-4" />
      case 'health': return <AlertTriangle className="h-4 w-4" />
      case 'orders': return <ShoppingBag className="h-4 w-4" />
      case 'missions': return <Calendar className="h-4 w-4" />
      case 'promotions': return <Gift className="h-4 w-4" />
      case 'system': return <Settings className="h-4 w-4" />
      case 'journey': return <Bell className="h-4 w-4" />
    }
  }

  const getCategoryName = (category: InboxCategory) => {
    switch (category) {
      case 'transactional': return 'Transazionali'
      case 'caring': return 'Caring'
      case 'health': return 'Salute'
      case 'orders': return 'Ordini'
      case 'missions': return 'Missioni'
      case 'promotions': return 'Promozioni'
      case 'system': return 'Sistema'
      case 'journey': return 'Journey'
    }
  }

  const getPriorityColor = (priority: MessagePriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-blue-500'
      case 'low': return 'bg-gray-400'
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `${diffMins}m fa`
    } else if (diffHours < 24) {
      return `${diffHours}h fa`
    } else if (diffDays < 7) {
      return `${diffDays}g fa`
    } else {
      return date.toLocaleDateString('it-IT')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
          <p className="text-gray-600">
            {stats && `${stats.unread} non letti di ${stats.total} totali`}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca messaggi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtri
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
              <div className="text-sm text-gray-600">Non letti</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.starred}</div>
              <div className="text-sm text-gray-600">Preferiti</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.byPriority.critical}</div>
              <div className="text-sm text-gray-600">Critici</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
              <div className="text-sm text-gray-600">Archiviati</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedMessages.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedMessages.size} messaggi selezionati
              </span>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('mark_read')}>
                  <Eye className="h-4 w-4 mr-1" />
                  Segna come letti
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('star')}>
                  <Star className="h-4 w-4 mr-1" />
                  Aggiungi preferiti
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
                  <Archive className="h-4 w-4 mr-1" />
                  Archivia
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedMessages(new Set())}>
                  Annulla
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          <TabsTrigger value="all" className="text-xs">
            Tutti ({stats?.total || 0})
          </TabsTrigger>
          {Object.entries(stats?.byCategory || {}).map(([category, count]) => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {getCategoryName(category as InboxCategory)} ({count})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessun messaggio
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? 'Nessun messaggio corrisponde alla tua ricerca'
                    : selectedCategory === 'all'
                    ? 'La tua inbox è vuota'
                    : `Nessun messaggio nella categoria ${getCategoryName(selectedCategory as InboxCategory)}`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card
                key={message.inboxMessageId}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !message.read ? 'border-blue-200 bg-blue-50' : ''
                } ${
                  selectedMessages.has(message.inboxMessageId) ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  if (!message.read) {
                    markAsRead(message.inboxMessageId)
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedMessages.has(message.inboxMessageId)}
                      onChange={(e) => {
                        e.stopPropagation()
                        const newSelected = new Set(selectedMessages)
                        if (e.target.checked) {
                          newSelected.add(message.inboxMessageId)
                        } else {
                          newSelected.delete(message.inboxMessageId)
                        }
                        setSelectedMessages(newSelected)
                      }}
                      className="mt-1"
                    />

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.avatar ? (
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                          {message.avatar}
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          {getCategoryIcon(message.category)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className={`text-lg ${!message.read ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                            {message.title}
                          </h3>

                          {/* Priority indicator */}
                          {message.priority === 'critical' && (
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(message.priority)}`} />
                          )}

                          {/* Badges */}
                          {message.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {message.badge}
                            </Badge>
                          )}

                          {!message.read && (
                            <Badge className="bg-blue-600 text-xs">Nuovo</Badge>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-gray-500">
                          <span className="text-sm">
                            {formatRelativeTime(message.createdAt)}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleStar(message.inboxMessageId)
                              }}
                              className={message.starred ? 'text-yellow-500' : 'text-gray-400'}
                            >
                              <Star className={`h-4 w-4 ${message.starred ? 'fill-current' : ''}`} />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (message.read) {
                                  markAsUnread(message.inboxMessageId)
                                } else {
                                  markAsRead(message.inboxMessageId)
                                }
                              }}
                            >
                              {message.read ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                archiveMessage(message.inboxMessageId)
                              }}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {message.summary || message.body}
                      </p>

                      {/* CTAs */}
                      {message.cta && message.cta.length > 0 && (
                        <div className="flex space-x-2 mb-3">
                          {message.cta.map((cta) => (
                            <Button
                              key={cta.id}
                              size="sm"
                              variant={cta.style === 'primary' ? 'default' : 'outline'}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCTAClick(message.inboxMessageId, cta)
                              }}
                            >
                              {cta.text}
                              {cta.url && <ExternalLink className="h-3 w-3 ml-1" />}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(message.category)}
                          <span>{getCategoryName(message.category)}</span>
                          {message.source && (
                            <>
                              <span>•</span>
                              <span>da {message.source}</span>
                            </>
                          )}
                        </div>

                        {message.expiresAt && (
                          <div className="flex items-center space-x-1 text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              Scade: {formatRelativeTime(message.expiresAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
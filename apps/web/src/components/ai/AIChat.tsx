'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Card, Input } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';
import AgentSelector from './AgentSelector';
import ChatMessage from './ChatMessage';
import UsageStats from './UsageStats';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  urgent?: boolean;
  toolResults?: any[];
  timestamp: string;
}

interface Conversation {
  id: string;
  agentType: 'vet' | 'educator' | 'groomer';
  title: string;
  messageCount: number;
  lastMessage: string;
  updatedAt: string;
}

interface UsageStats {
  usage: any;
  limits: any;
  remaining: any;
}

export default function AIChat() {
  const [selectedAgent, setSelectedAgent] = useState<'vet' | 'educator' | 'groomer'>('vet');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const [availableDogs, setAvailableDogs] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchUsageStats();
    fetchUserDogs();
  }, [selectedAgent]);

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/ai/conversations?agentType=${selectedAgent}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/ai/usage');
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const fetchUserDogs = async () => {
    try {
      const response = await fetch('/api/dogs');
      if (response.ok) {
        const data = await response.json();
        setAvailableDogs(data.dogs || []);
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    // Check usage limits
    if (usageStats && usageStats.remaining[selectedAgent].daily <= 0) {
      alert('Hai raggiunto il limite giornaliero di messaggi per questo agente.');
      return;
    }

    setIsLoading(true);
    const userMessage = message;
    setMessage('');

    // Add user message immediately
    const tempUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: selectedAgent,
          message: userMessage,
          conversationId: currentConversation,
          dogId: selectedDogId || undefined,
          context: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Update current conversation or set new one
        if (!currentConversation) {
          setCurrentConversation(data.conversationId);
        }

        // Add assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          urgent: data.urgent,
          toolResults: data.toolResults,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev.slice(0, -1), tempUserMessage, assistantMessage]);

        // Update usage stats
        await fetchUsageStats();

        // Track analytics
        trackEvent('ai_message_sent', {
          agent_type: selectedAgent,
          conversation_id: data.conversationId,
          urgent_response: data.urgent,
          tool_calls: data.toolResults?.length || 0,
          message_length: userMessage.length
        });

        // Show urgent notification if needed
        if (data.urgent) {
          showUrgentNotification(data.response);
        }

      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Errore nell\'inviare il messaggio');

        // Remove the temporary user message on error
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Errore di connessione');

      // Remove the temporary user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);

    trackEvent('ai_new_conversation', {
      agent_type: selectedAgent
    });
  };

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation.id);

    trackEvent('ai_conversation_selected', {
      agent_type: selectedAgent,
      conversation_id: conversation.id
    });
  };

  const showUrgentNotification = (content: string) => {
    // Create a more prominent notification for urgent responses
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Messaggio urgente dal Veterinario', {
        body: content.substring(0, 100) + '...',
        icon: '/icons/urgent.png'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canSendMessage = () => {
    return message.trim() &&
           !isLoading &&
           usageStats &&
           usageStats.remaining[selectedAgent].daily > 0;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat con Esperti AI</h1>
        <p className="text-gray-600">
          Chatta con i nostri esperti AI per ricevere consigli personalizzati per il tuo cane
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Agent Selection */}
          <AgentSelector
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            usageStats={usageStats}
          />

          {/* Dog Selection */}
          {availableDogs.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Seleziona il tuo cane</h3>
              <select
                value={selectedDogId}
                onChange={(e) => setSelectedDogId(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                <option value="">Conversazione generale</option>
                {availableDogs.map((dog) => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name} ({dog.breed})
                  </option>
                ))}
              </select>
            </Card>
          )}

          {/* Usage Stats */}
          {usageStats && (
            <UsageStats
              stats={usageStats}
              selectedAgent={selectedAgent}
            />
          )}

          {/* Conversations List */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Conversazioni</h3>
              <Button
                size="sm"
                onClick={startNewConversation}
                data-cta-id="ai_chat.new_conversation.click"
              >
                + Nuova
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500">Nessuna conversazione</p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation)}
                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                      currentConversation === conversation.id
                        ? 'bg-orange-50 text-orange-900 border border-orange-200'
                        : 'hover:bg-gray-50'
                    }`}
                    data-cta-id={`ai_chat.conversation_${conversation.id}.select`}
                  >
                    <div className="font-medium truncate">{conversation.title}</div>
                    <div className="text-gray-500 truncate">
                      {conversation.lastMessage}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(conversation.updatedAt).toLocaleDateString('it-IT')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">
                    {selectedAgent === 'vet' ? '🩺' :
                     selectedAgent === 'educator' ? '🎓' : '✂️'}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedAgent === 'vet' ? 'Dr. AI Veterinario' :
                     selectedAgent === 'educator' ? 'Educatore Cinofilo AI' :
                     'Groomer Professionale AI'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedAgent === 'vet' ? 'Supporto per la salute del tuo cane' :
                     selectedAgent === 'educator' ? 'Addestramento e comportamento' :
                     'Cura del mantello e igiene'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">
                    {selectedAgent === 'vet' ? '🩺' :
                     selectedAgent === 'educator' ? '🎓' : '✂️'}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Inizia una conversazione
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Fai una domanda al nostro {' '}
                    {selectedAgent === 'vet' ? 'veterinario' :
                     selectedAgent === 'educator' ? 'educatore cinofilo' :
                     'groomer'} AI
                  </p>
                  <div className="text-sm text-gray-500">
                    Esempi di domande:
                    <ul className="mt-2 space-y-1">
                      {selectedAgent === 'vet' && (
                        <>
                          <li>• "Il mio cane ha perso l'appetito, cosa potrebbe essere?"</li>
                          <li>• "Quali sono i sintomi di una allergia alimentare?"</li>
                          <li>• "Quando dovrei preoccuparmi per il vomito?"</li>
                        </>
                      )}
                      {selectedAgent === 'educator' && (
                        <>
                          <li>• "Come posso insegnare al mio cane a non tirare al guinzaglio?"</li>
                          <li>• "Il mio cucciolo abbaia troppo, come posso aiutarlo?"</li>
                          <li>• "Quali esercizi posso fare per socializzare il mio cane?"</li>
                        </>
                      )}
                      {selectedAgent === 'groomer' && (
                        <>
                          <li>• "Quanto spesso dovrei spazzolare il mio Golden Retriever?"</li>
                          <li>• "Come posso abituare il mio cane al taglio delle unghie?"</li>
                          <li>• "Quali prodotti sono migliori per il bagno?"</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    agentType={selectedAgent}
                  />
                ))
              )}

              {isLoading && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  <span>L'esperto sta rispondendo...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Scrivi la tua domanda al ${
                    selectedAgent === 'vet' ? 'veterinario' :
                    selectedAgent === 'educator' ? 'educatore' : 'groomer'
                  }...`}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 resize-none"
                  rows={2}
                  disabled={isLoading || (usageStats && usageStats.remaining[selectedAgent].daily <= 0)}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!canSendMessage()}
                  data-cta-id={`ai_chat.send_message.${selectedAgent}.click`}
                >
                  {isLoading ? '⏳' : '📤'}
                </Button>
              </div>

              {usageStats && usageStats.remaining[selectedAgent].daily <= 0 && (
                <div className="mt-2 text-sm text-red-600">
                  Hai raggiunto il limite giornaliero di messaggi per questo agente.
                </div>
              )}

              <div className="mt-2 text-xs text-gray-500">
                Premi Invio per inviare, Shift+Invio per andare a capo
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
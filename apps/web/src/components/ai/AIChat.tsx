/**
 * AIChat - Main AI Chat Interface Component
 *
 * Provides a comprehensive chat interface for AI agents (veterinary, trainer, groomer)
 * with real-time messaging, safety features, and product recommendations.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { trackCTAClick } from '@/analytics/ga4';
import {
  ChatMessage as ChatMessageType,
  ChatSession,
  AgentType,
  SafetyLevel,
  AgentAction,
  ProductSuggestion
} from '@/types/ai-agents';
import { ChatMessage } from './ChatMessage';
import { AgentSelector } from './AgentSelector';
import { UsageStats } from './UsageStats';

interface AIChatProps {
  sessionId?: string;
  initialAgent?: AgentType;
  dogId?: string;
  className?: string;
}

// Mock data for demonstration
const mockSession: ChatSession = {
  id: 'session_1',
  userId: 'user_1',
  dogId: 'dog_1',
  agentType: 'veterinary',
  status: 'active',
  startedAt: new Date(),
  lastActivityAt: new Date(),
  messages: [],
  context: {
    dog: {
      id: 'dog_1',
      name: 'Luna',
      breed: 'Golden Retriever',
      age: { value: 3, unit: 'years' },
      weight: 28,
      size: 'large',
      allergies: ['pollo'],
      healthConditions: [],
      coatType: 'long'
    },
    user: {
      experienceLevel: 'intermediate',
      hasMultipleDogs: false,
      preferredLanguage: 'it',
      consentToTracking: true,
      consentToMarketing: true
    }
  },
  retentionPolicy: {
    autoDelete: true,
    deleteAfterDays: 30,
    userCanDelete: true
  }
};

export function AIChat({
  sessionId,
  initialAgent = 'veterinary',
  dogId,
  className = ''
}: AIChatProps) {
  const [session, setSession] = useState<ChatSession>(mockSession);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(initialAgent);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showUsageStats, setShowUsageStats] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, scrollToBottom]);

  // Track chat initialization
  useEffect(() => {
    trackCTAClick('ai_chat.init', {
      agent_type: selectedAgent,
      dog_id: dogId,
      session_id: session.id
    });
  }, []);

  // Send message handler
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: `msg_${Date.now()}`,
      sessionId: session.id,
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
      agentType: selectedAgent,
      metadata: {
        safetyLevel: 'ok',
        tokens: currentMessage.length,
      }
    };

    // Add user message to session
    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      lastActivityAt: new Date()
    }));

    // Clear input
    setCurrentMessage('');
    setIsLoading(true);
    setIsTyping(true);

    trackCTAClick('ai_chat.message.send', {
      agent_type: selectedAgent,
      message_length: currentMessage.length,
      session_id: session.id
    });

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock AI response
      const agentResponse: ChatMessageType = {
        id: `msg_${Date.now() + 1}`,
        sessionId: session.id,
        role: 'assistant',
        content: generateMockResponse(currentMessage, selectedAgent, session.context.dog?.name || 'il tuo cane'),
        timestamp: new Date(),
        agentType: selectedAgent,
        metadata: {
          safetyLevel: 'ok',
          tokens: 150,
          processingTime: 1800
        },
        suggestedActions: generateMockActions(selectedAgent),
        hasCommercialContent: selectedAgent === 'veterinary' && Math.random() > 0.5
      };

      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, agentResponse],
        lastActivityAt: new Date()
      }));

    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: ChatMessageType = {
        id: `msg_error_${Date.now()}`,
        sessionId: session.id,
        role: 'assistant',
        content: 'Mi dispiace, si è verificato un errore. Riprova tra qualche istante.',
        timestamp: new Date(),
        agentType: selectedAgent,
        metadata: {
          safetyLevel: 'warning',
          tokens: 0
        }
      };

      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage]
      }));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Handle agent change
  const handleAgentChange = (newAgent: AgentType) => {
    if (newAgent === selectedAgent) return;

    setSelectedAgent(newAgent);
    setSession(prev => ({ ...prev, agentType: newAgent }));
    setShowAgentSelector(false);

    trackCTAClick('ai_chat.agent.change', {
      from_agent: selectedAgent,
      to_agent: newAgent,
      session_id: session.id
    });

    // Add system message about agent change
    const systemMessage: ChatMessageType = {
      id: `msg_system_${Date.now()}`,
      sessionId: session.id,
      role: 'system',
      content: `Ora stai chattando con l'agente ${getAgentDisplayName(newAgent)}. Come posso aiutarti?`,
      timestamp: new Date(),
      agentType: newAgent,
      metadata: { safetyLevel: 'ok', tokens: 0 }
    };

    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
  };

  // Handle suggested action
  const handleAction = (action: AgentAction) => {
    trackCTAClick('ai_chat.action.execute', {
      action_type: action.type,
      agent_type: selectedAgent,
      session_id: session.id
    });

    // Handle different action types
    switch (action.type) {
      case 'suggest_products':
        // Navigate to shop or show products
        break;
      case 'create_reminder':
        // Open reminder creation modal
        break;
      case 'create_mission':
        // Open mission creation modal
        break;
      case 'open_vet_search':
        // Navigate to veterinary search
        window.open('/veterinary', '_blank');
        break;
      default:
        console.log('Action executed:', action);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                selectedAgent === 'veterinary' ? 'bg-blue-500' :
                selectedAgent === 'trainer' ? 'bg-green-500' : 'bg-orange-500'
              }`} />
              <h2 className="text-lg font-semibold text-gray-900">
                {getAgentDisplayName(selectedAgent)}
              </h2>
              {session.context.dog && (
                <span className="text-sm text-gray-600">
                  • {session.context.dog.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUsageStats(true)}
              ctaId="ai_chat.usage_stats.open"
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            >
              Statistiche
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAgentSelector(true)}
              ctaId="ai_chat.agent_selector.open"
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              }
            >
              Cambia agente
            </Button>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {session.messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Benvenuto nel chat con l'agente {getAgentDisplayName(selectedAgent)}!
            </h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              {getAgentWelcomeMessage(selectedAgent, session.context.dog?.name)}
            </p>
          </div>
        )}

        {session.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onActionClick={handleAction}
            agentName={getAgentDisplayName(selectedAgent)}
          />
        ))}

        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
              selectedAgent === 'veterinary' ? 'bg-blue-500' :
              selectedAgent === 'trainer' ? 'bg-green-500' : 'bg-orange-500'
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="bg-white rounded-lg rounded-bl-sm px-4 py-2 shadow-sm border">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea
              ref={messageInputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Scrivi un messaggio all'agente ${getAgentDisplayName(selectedAgent)}...`}
              rows={1}
              className="resize-none min-h-[40px] max-h-32"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isLoading}
            variant="primary"
            size="sm"
            className="px-4 h-[40px]"
            ctaId="ai_chat.message.send"
            loading={isLoading}
          >
            {isLoading ? 'Inviando...' : 'Invia'}
          </Button>
        </div>
      </div>

      {/* Modals */}
      {showAgentSelector && (
        <AgentSelector
          currentAgent={selectedAgent}
          onAgentSelect={handleAgentChange}
          onClose={() => setShowAgentSelector(false)}
        />
      )}

      {showUsageStats && (
        <UsageStats
          sessionId={session.id}
          onClose={() => setShowUsageStats(false)}
        />
      )}
    </div>
  );
}

// Helper functions
function getAgentDisplayName(agent: AgentType): string {
  switch (agent) {
    case 'veterinary':
      return 'Veterinario Virtuale';
    case 'trainer':
      return 'Educatore Cinofilo';
    case 'groomer':
      return 'Toelettatore Esperto';
    default:
      return 'Agente AI';
  }
}

function getAgentWelcomeMessage(agent: AgentType, dogName?: string): string {
  const name = dogName || 'il tuo cane';

  switch (agent) {
    case 'veterinary':
      return `Sono qui per aiutarti con domande sulla salute e il benessere di ${name}. Ricorda che non posso sostituire una visita veterinaria.`;
    case 'trainer':
      return `Sono qui per aiutarti con l'educazione e l'addestramento di ${name}. Insieme possiamo creare un piano di allenamento personalizzato!`;
    case 'groomer':
      return `Sono qui per consigliarti sulla cura del mantello e l'igiene di ${name}. Dimmi di più sul tipo di pelo!`;
    default:
      return `Sono qui per aiutarti con ${name}. Come posso esserti utile?`;
  }
}

function generateMockResponse(userMessage: string, agent: AgentType, dogName: string): string {
  const responses = {
    veterinary: [
      `Capisco la tua preoccupazione per ${dogName}. Basandomi sulla tua descrizione, ti consiglio di monitorare attentamente la situazione.`,
      `Per ${dogName} è importante mantenere una routine regolare. Ti suggerisco alcuni controlli che puoi fare a casa.`,
      `La salute di ${dogName} è la priorità. Se noti sintomi persistenti, consulta sempre il tuo veterinario di fiducia.`
    ],
    trainer: [
      `Ottima domanda sull'addestramento di ${dogName}! Il rinforzo positivo è sempre la strada migliore.`,
      `Per ${dogName} possiamo creare un piano di allenamento graduale. La costanza è fondamentale!`,
      `Ogni cane ha i suoi tempi di apprendimento. ${dogName} ha bisogno di pazienza e coerenza negli esercizi.`
    ],
    groomer: [
      `Il mantello di ${dogName} richiede cure specifiche. Dimmi di più sul tipo di pelo!`,
      `Per mantenere ${dogName} sempre al top, è importante stabilire una routine di toelettatura.`,
      `La cura del mantello di ${dogName} dipende dalla razza e dalle sue caratteristiche specifiche.`
    ]
  };

  const agentResponses = responses[agent];
  return agentResponses[Math.floor(Math.random() * agentResponses.length)];
}

function generateMockActions(agent: AgentType): AgentAction[] {
  const actions = {
    veterinary: [
      {
        id: 'vet_1',
        type: 'open_vet_search' as const,
        label: 'Trova veterinario',
        description: 'Cerca veterinari nella tua zona',
        icon: '🏥',
        params: { emergency: false },
        variant: 'primary' as const
      },
      {
        id: 'vet_2',
        type: 'create_reminder' as const,
        label: 'Imposta promemoria',
        description: 'Crea un promemoria per controlli',
        icon: '⏰',
        params: { type: 'health_check' },
        variant: 'secondary' as const
      }
    ],
    trainer: [
      {
        id: 'train_1',
        type: 'create_mission' as const,
        label: 'Crea missione',
        description: 'Inizia un programma di addestramento',
        icon: '🎯',
        params: { category: 'training' },
        variant: 'primary' as const
      }
    ],
    groomer: [
      {
        id: 'groom_1',
        type: 'suggest_products' as const,
        label: 'Prodotti consigliati',
        description: 'Vedi prodotti per la toelettatura',
        icon: '🛍️',
        params: { category: 'grooming' },
        variant: 'primary' as const
      }
    ]
  };

  return actions[agent] || [];
}

export default AIChat;
'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AgentOrchestrator } from '@/lib/ai-agents/AgentOrchestrator';

type AgentType = 'veterinary' | 'trainer' | 'groomer';

export default function AIAssistantPage() {
  const { user } = useApp();
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('veterinary');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDog, setSelectedDog] = useState<any>(null);
  const [userDogs, setUserDogs] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const orchestrator = new AgentOrchestrator();

  useEffect(() => {
    if (user) {
      loadUserDogs();
      initializeSession();
    }
  }, [user, selectedAgent]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUserDogs = async () => {
    // Mock user dogs data
    const mockDogs = [
      {
        id: 'dog-001',
        name: 'Luna',
        breed: 'Labrador Retriever',
        age: { value: 3, unit: 'years' },
        weight: 28,
        size: 'large',
        allergies: ['pollo'],
        healthConditions: [],
        coatType: 'short',
        photo: null
      },
      {
        id: 'dog-002',
        name: 'Max',
        breed: 'Golden Retriever',
        age: { value: 5, unit: 'years' },
        weight: 32,
        size: 'large',
        allergies: [],
        healthConditions: ['displasia anca'],
        coatType: 'long',
        photo: null
      }
    ];

    setUserDogs(mockDogs);
    if (mockDogs.length > 0) {
      setSelectedDog(mockDogs[0]);
    }
  };

  const initializeSession = () => {
    if (!user) return;

    const session: ChatSession = {
      id: crypto.randomUUID(),
      userId: user.uid,
      dogId: selectedDog?.id,
      agentType: selectedAgent,
      status: 'active',
      startedAt: new Date(),
      lastActivityAt: new Date(),
      messages: [],
      context: buildSessionContext(),
      retentionPolicy: {
        autoDelete: false,
        deleteAfterDays: 30,
        userCanDelete: true
      }
    };

    setCurrentSession(session);
    setMessages([]);

    // Add welcome message
    const welcomeMessage = getWelcomeMessage(selectedAgent, selectedDog?.name);
    if (welcomeMessage) {
      setMessages([welcomeMessage]);
    }
  };

  const buildSessionContext = (): SessionContext => {
    return {
      dog: selectedDog ? {
        id: selectedDog.id,
        name: selectedDog.name,
        breed: selectedDog.breed,
        age: selectedDog.age,
        weight: selectedDog.weight,
        size: selectedDog.size,
        allergies: selectedDog.allergies,
        healthConditions: selectedDog.healthConditions,
        coatType: selectedDog.coatType
      } : undefined,
      user: {
        experienceLevel: 'intermediate', // Could come from user profile
        hasMultipleDogs: userDogs.length > 1,
        preferredLanguage: 'it',
        consentToTracking: true,
        consentToMarketing: true
      },
      activeMissions: [],
      activeReminders: [],
      recentOrders: [],
      entryPoint: {
        source: 'menu'
      }
    };
  };

  const getWelcomeMessage = (agentType: AgentType, dogName?: string): ChatMessage | null => {
    if (!dogName) return null;

    const welcomeMessages = {
      veterinary: `Ciao! 👨‍⚕️ Sono il tuo consulente veterinario virtuale. Posso aiutarti con informazioni generali sulla salute di ${dogName}, consigli preventivi e riconoscere quando è necessario consultare un veterinario. Come posso aiutarti oggi?`,
      trainer: `Ciao! 🐕‍🦺 Sono il tuo educatore cinofilo digitale. Posso aiutarti a creare piani di addestramento personalizzati per ${dogName}, risolvere problemi comportamentali e suggerire attività di arricchimento. Su cosa vuoi lavorare?`,
      groomer: `Ciao! ✂️ Sono il tuo consulente di toelettatura. Posso aiutarti a creare routine di cura del mantello personalizzate per ${dogName}, consigliarti prodotti adatti e tecniche di grooming. Di cosa ha bisogno ${dogName}?`
    };

    return {
      id: crypto.randomUUID(),
      sessionId: currentSession?.id || '',
      role: 'assistant',
      content: welcomeMessages[agentType],
      timestamp: new Date(),
      agentType,
      metadata: {
        dogId: selectedDog?.id,
        safetyLevel: 'ok'
      },
      suggestedActions: getSuggestedWelcomeActions(agentType),
      safetyFlags: [],
      hasCommercialContent: false
    };
  };

  const getSuggestedWelcomeActions = (agentType: AgentType): AgentAction[] => {
    const baseActions = {
      veterinary: [
        {
          id: 'checkup_reminder',
          type: 'create_reminder' as const,
          label: 'Promemoria controllo',
          description: 'Imposta promemoria per il prossimo controllo veterinario',
          icon: '📅',
          params: { type: 'health_check' },
          variant: 'secondary' as const
        },
        {
          id: 'health_products',
          type: 'suggest_products' as const,
          label: 'Prodotti salute',
          description: 'Vedi prodotti per il benessere',
          icon: '🏥',
          params: { category: 'health' },
          variant: 'secondary' as const
        }
      ],
      trainer: [
        {
          id: 'basic_training',
          type: 'create_mission' as const,
          label: 'Addestramento base',
          description: 'Inizia un percorso di educazione base',
          icon: '🎯',
          params: { type: 'basic_training' },
          variant: 'primary' as const
        },
        {
          id: 'training_toys',
          type: 'suggest_products' as const,
          label: 'Giochi educativi',
          description: 'Vedi giochi per l\'addestramento',
          icon: '🎾',
          params: { category: 'training' },
          variant: 'secondary' as const
        }
      ],
      groomer: [
        {
          id: 'grooming_routine',
          type: 'create_mission' as const,
          label: 'Routine grooming',
          description: 'Crea un programma di toelettatura',
          icon: '✂️',
          params: { type: 'grooming_routine' },
          variant: 'primary' as const
        },
        {
          id: 'grooming_tools',
          type: 'suggest_products' as const,
          label: 'Strumenti toelettatura',
          description: 'Vedi spazzole e prodotti per il mantello',
          icon: '🧴',
          params: { category: 'grooming' },
          variant: 'secondary' as const
        }
      ]
    };

    return baseActions[agentType] || [];
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: currentSession.id,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      agentType: selectedAgent,
      metadata: {
        dogId: selectedDog?.id,
        safetyLevel: 'ok'
      },
      suggestedActions: [],
      safetyFlags: [],
      hasCommercialContent: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await orchestrator.processMessage(
        currentSession.id,
        userMessage.content,
        selectedAgent,
        buildSessionContext()
      );

      const assistantMessage: ChatMessage = {
        id: response.messageId,
        sessionId: currentSession.id,
        role: 'assistant',
        content: response.message,
        timestamp: response.generatedAt,
        agentType: selectedAgent,
        metadata: {
          dogId: selectedDog?.id,
          safetyLevel: response.safetyLevel,
          tokens: response.tokensUsed,
          processingTime: response.processingTimeMs
        },
        suggestedActions: response.suggestedActions,
        safetyFlags: response.safetyFlags,
        hasCommercialContent: response.hasCommercialContent,
        commercialDisclosure: response.hasCommercialContent ? response.disclosures[0]?.message : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Failed to send message:', error);

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sessionId: currentSession.id,
        role: 'assistant',
        content: 'Mi dispiace, si è verificato un errore. Puoi riprovare o contattare il supporto se il problema persiste.',
        timestamp: new Date(),
        agentType: selectedAgent,
        metadata: {
          dogId: selectedDog?.id,
          safetyLevel: 'ok'
        },
        suggestedActions: [],
        safetyFlags: [],
        hasCommercialContent: false
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: AgentAction) => {
    console.log('Executing action:', action);

    // Track action click
    if (typeof gtag !== 'undefined') {
      gtag('event', 'ai_action_click', {
        action_type: action.type,
        agent_type: selectedAgent,
        dog_id: selectedDog?.id
      });
    }

    // Handle different action types
    switch (action.type) {
      case 'create_mission':
        handleCreateMission(action.params);
        break;
      case 'create_reminder':
        handleCreateReminder(action.params);
        break;
      case 'suggest_products':
        handleSuggestProducts(action.params);
        break;
      case 'open_vet_search':
        handleOpenVetSearch(action.params);
        break;
      case 'save_note':
        handleSaveNote(action.params);
        break;
      case 'open_pdp':
        handleOpenPDP(action.params);
        break;
    }
  };

  const handleCreateMission = (params: any) => {
    // Navigate to missions page with pre-filled data
    window.location.href = `/missions/create?type=${params.type}&dogId=${selectedDog?.id}`;
  };

  const handleCreateReminder = (params: any) => {
    // Navigate to reminders page or open modal
    window.location.href = `/reminders/create?type=${params.type}&dogId=${selectedDog?.id}`;
  };

  const handleSuggestProducts = (params: any) => {
    // Navigate to shop with filters
    window.location.href = `/shop?category=${params.category}&dogId=${selectedDog?.id}`;
  };

  const handleOpenVetSearch = (params: any) => {
    // Navigate to vet search
    const queryParams = params.emergency ? '?emergency=true' : '';
    window.location.href = `/veterinary/search${queryParams}`;
  };

  const handleSaveNote = (params: any) => {
    // Save note to dog profile
    console.log('Saving note:', params);
  };

  const handleOpenPDP = (params: any) => {
    // Open product detail page
    window.location.href = `/shop/products/${params.sku}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-md mx-auto pt-20 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Richiesto</h2>
            <p className="text-gray-600 mb-6">
              Effettua il login per accedere agli assistenti AI di PiùCane
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Accedi ora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              🤖 Assistente AI
            </h1>

            {/* Dog Selector */}
            {userDogs.length > 1 && (
              <select
                value={selectedDog?.id || ''}
                onChange={(e) => {
                  const dog = userDogs.find(d => d.id === e.target.value);
                  setSelectedDog(dog);
                }}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {userDogs.map(dog => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name} ({dog.breed})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Agent Selector */}
          <div className="flex items-center space-x-2 mt-4">
            <button
              onClick={() => setSelectedAgent('veterinary')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAgent === 'veterinary'
                  ? 'bg-red-100 text-red-700 border-2 border-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              👨‍⚕️ Veterinario
            </button>
            <button
              onClick={() => setSelectedAgent('trainer')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAgent === 'trainer'
                  ? 'bg-green-100 text-green-700 border-2 border-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🎓 Educatore
            </button>
            <button
              onClick={() => setSelectedAgent('groomer')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAgent === 'groomer'
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✂️ Groomer
            </button>
          </div>
        </div>
      </div>

      {/* Dog Context */}
      {selectedDog && (
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="bg-white rounded-lg p-3 shadow-sm border">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-xl">🐕</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium">{selectedDog.name}</span>
                  <span className="text-gray-500">{selectedDog.breed}</span>
                  <span className="text-gray-500">{selectedDog.age.value} {selectedDog.age.unit}</span>
                  {selectedDog.weight && (
                    <span className="text-gray-500">{selectedDog.weight}kg</span>
                  )}
                </div>
                {selectedDog.allergies.length > 0 && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-orange-600">Allergie:</span>
                    {selectedDog.allergies.map((allergy: string) => (
                      <span key={allergy} className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full">
                        {allergy}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-2xl shadow-sm min-h-96 flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-6 space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                } px-4 py-3`}>
                  {/* Safety Flags */}
                  {message.safetyFlags && message.safetyFlags.length > 0 && (
                    <div className="mb-3">
                      {message.safetyFlags.map((flag, index) => (
                        <div key={index} className={`p-3 rounded-lg mb-2 ${
                          flag.level === 'urgent' ? 'bg-red-100 border border-red-300' :
                          flag.level === 'warning' ? 'bg-yellow-100 border border-yellow-300' :
                          'bg-blue-100 border border-blue-300'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {flag.level === 'urgent' ? '🚨' : flag.level === 'warning' ? '⚠️' : 'ℹ️'}
                            </span>
                            <span className={
                              flag.level === 'urgent' ? 'text-red-800 font-medium' :
                              flag.level === 'warning' ? 'text-yellow-800 font-medium' :
                              'text-blue-800 font-medium'
                            }>
                              {flag.message}
                            </span>
                          </div>
                          {flag.action && (
                            <button
                              onClick={() => {
                                if (flag.action?.url) {
                                  window.open(flag.action.url, '_blank');
                                } else if (flag.action?.deeplink) {
                                  window.location.href = flag.action.deeplink;
                                }
                              }}
                              className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium ${
                                flag.level === 'urgent' ? 'bg-red-600 text-white hover:bg-red-700' :
                                'bg-blue-600 text-white hover:bg-blue-700'
                              } transition-colors`}
                            >
                              {flag.action.label}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{message.content}</div>

                  {/* Commercial Disclosure */}
                  {message.hasCommercialContent && message.commercialDisclosure && (
                    <div className="mt-2 text-xs opacity-75 italic">
                      💼 {message.commercialDisclosure}
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.suggestedActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleAction(action)}
                          disabled={action.disabled}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                            action.variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                            action.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                            action.variant === 'warning' ? 'bg-orange-600 text-white hover:bg-orange-700' :
                            'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {action.icon && <span>{action.icon}</span>}
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-xs mt-2 opacity-50 ${
                    message.role === 'user' ? 'text-white' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-gray-500 text-sm">L'assistente sta scrivendo...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex space-x-3">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Scrivi la tua domanda per l'${selectedAgent === 'veterinary' ? 'assistente veterinario' : selectedAgent === 'trainer' ? 'educatore' : 'esperto di grooming'}...`}
                className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>

            {/* Suggested Quick Questions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {getSuggestedQuestions(selectedAgent).map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputMessage(question);
                    setTimeout(() => sendMessage(), 100);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Gli assistenti AI forniscono informazioni generali e non sostituiscono il parere di professionisti qualificati.
            {' '}
            <button className="text-blue-600 hover:text-blue-800 underline">
              Quando contattare un veterinario
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function getSuggestedQuestions(agentType: AgentType): string[] {
  const suggestions = {
    veterinary: [
      "Il mio cane non mangia da ieri, cosa devo fare?",
      "Come riconosco i segni di dolore nel cane?",
      "Quando fare i richiami vaccinali?",
      "Il mio cane ha il pelo opaco, è normale?"
    ],
    trainer: [
      "Come insegnare il richiamo al cane?",
      "Il mio cane tira al guinzaglio, aiuto!",
      "Come gestire l'ansia da separazione?",
      "Giochi per stimolare il cane in casa"
    ],
    groomer: [
      "Ogni quanto devo spazzolare il mio Golden?",
      "Come tagliare le unghie senza ferire il cane?",
      "Il mio cane odia il bagno, consigli?",
      "Prodotti per pelo sensibile"
    ]
  };

  return suggestions[agentType] || [];
}
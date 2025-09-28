'use client';

import { Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';

interface AgentSelectorProps {
  selectedAgent: 'vet' | 'educator' | 'groomer';
  onAgentChange: (agent: 'vet' | 'educator' | 'groomer') => void;
  usageStats: any;
}

export default function AgentSelector({ selectedAgent, onAgentChange, usageStats }: AgentSelectorProps) {
  const agents = [
    {
      id: 'vet' as const,
      name: 'Dr. AI Veterinario',
      icon: '🩺',
      description: 'Supporto per la salute del tuo cane',
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      activeColor: 'bg-blue-100 border-blue-300',
      specialties: ['Sintomi e salute', 'Emergenze', 'Prevenzione', 'Vaccini']
    },
    {
      id: 'educator' as const,
      name: 'Educatore Cinofilo',
      icon: '🎓',
      description: 'Addestramento e comportamento',
      color: 'bg-green-50 border-green-200 text-green-900',
      activeColor: 'bg-green-100 border-green-300',
      specialties: ['Addestramento', 'Comportamento', 'Socializzazione', 'Giochi']
    },
    {
      id: 'groomer' as const,
      name: 'Groomer Professionale',
      icon: '✂️',
      description: 'Cura del mantello e igiene',
      color: 'bg-purple-50 border-purple-200 text-purple-900',
      activeColor: 'bg-purple-100 border-purple-300',
      specialties: ['Toelettatura', 'Igiene', 'Mantello', 'Unghie']
    }
  ];

  const handleAgentChange = (agentId: 'vet' | 'educator' | 'groomer') => {
    onAgentChange(agentId);

    trackEvent('ai_agent_selected', {
      agent_type: agentId,
      previous_agent: selectedAgent
    });
  };

  const getRemainingMessages = (agentId: string) => {
    if (!usageStats) return 0;
    return usageStats.remaining[agentId]?.daily || 0;
  };

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-4">Scegli il tuo esperto</h3>

      <div className="space-y-3">
        {agents.map((agent) => {
          const isSelected = selectedAgent === agent.id;
          const remaining = getRemainingMessages(agent.id);
          const isAvailable = remaining > 0;

          return (
            <button
              key={agent.id}
              onClick={() => isAvailable && handleAgentChange(agent.id)}
              disabled={!isAvailable}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? agent.activeColor
                  : isAvailable
                  ? `${agent.color} hover:opacity-80`
                  : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              data-cta-id={`ai_chat.agent_selector.${agent.id}.click`}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{agent.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{agent.name}</h4>
                  <p className="text-xs opacity-75 mt-1">{agent.description}</p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agent.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  {/* Usage indicator */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs">
                      {isAvailable ? (
                        <span className="text-green-600">
                          ✓ {remaining} messaggi rimasti oggi
                        </span>
                      ) : (
                        <span className="text-red-600">
                          ✗ Limite giornaliero raggiunto
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <div className="text-xs font-medium">
                        ● Attivo
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Usage Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Limiti giornalieri:</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div>🩺 Veterinario: 10 messaggi/giorno</div>
          <div>🎓 Educatore: 5 messaggi/giorno</div>
          <div>✂️ Groomer: 5 messaggi/giorno</div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          I limiti si resettano ogni giorno alle 00:00
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-xs text-yellow-800">
          <strong>⚠️ Importante:</strong> Questi sono assistenti AI informativi.
          Per emergenze o problemi gravi, contatta sempre un veterinario reale.
        </div>
      </div>
    </Card>
  );
}
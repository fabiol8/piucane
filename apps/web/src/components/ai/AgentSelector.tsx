/**
 * AgentSelector - AI Agent Selection Component
 *
 * Allows users to select between different AI agents (veterinary, trainer, groomer)
 * with detailed information about each agent's capabilities.
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { trackCTAClick } from '@/analytics/ga4';
import { AgentType } from '@/types/ai-agents';

interface AgentSelectorProps {
  currentAgent: AgentType;
  onAgentSelect: (agent: AgentType) => void;
  onClose: () => void;
  className?: string;
}

interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];
  bestFor: string[];
  limitations: string[];
}

const agentData: AgentInfo[] = [
  {
    type: 'veterinary',
    name: 'Veterinario Virtuale',
    description: 'Consigli esperti sulla salute e il benessere del tuo cane',
    icon: '🏥',
    color: 'blue',
    capabilities: [
      'Analisi sintomi generali',
      'Consigli preventivi',
      'Informazioni su vaccinazioni',
      'Guida per l\'alimentazione',
      'Riconoscimento emergenze'
    ],
    bestFor: [
      'Domande sulla salute generale',
      'Consigli nutrizionali',
      'Prevenzione malattie',
      'Interpretazione comportamenti legati alla salute'
    ],
    limitations: [
      'Non può diagnosticare malattie',
      'Non può prescrivere farmaci',
      'Non sostituisce visite veterinarie',
      'Non può determinare dosaggi'
    ]
  },
  {
    type: 'trainer',
    name: 'Educatore Cinofilo',
    description: 'Esperti consigli per l\'educazione e l\'addestramento',
    icon: '🎯',
    color: 'green',
    capabilities: [
      'Piani di addestramento personalizzati',
      'Correzione comportamenti problematici',
      'Socializzazione guidata',
      'Esercizi di stimolazione mentale',
      'Creazione missioni gamificate'
    ],
    bestFor: [
      'Problemi comportamentali',
      'Addestramento cuccioli',
      'Socializzazione',
      'Esercizi di obbedienza',
      'Attività di arricchimento'
    ],
    limitations: [
      'Non sostituisce sessioni dal vivo',
      'Solo metodi di rinforzo positivo',
      'Non per cani aggressivi',
      'Richiede costanza del proprietario'
    ]
  },
  {
    type: 'groomer',
    name: 'Toelettatore Esperto',
    description: 'Consigli professionali per la cura del mantello e l\'igiene',
    icon: '✂️',
    color: 'orange',
    capabilities: [
      'Analisi tipo di mantello',
      'Routine di toelettatura personalizzate',
      'Consigli per l\'igiene quotidiana',
      'Selezione strumenti specifici',
      'Prevenzione problemi cutanei'
    ],
    bestFor: [
      'Cura del mantello',
      'Routine di toelettatura',
      'Scelta prodotti igienici',
      'Problemi di pelo e cute',
      'Preparazione per esposizioni'
    ],
    limitations: [
      'Non per problemi dermatologici gravi',
      'Non sostituisce toelettatore professionale',
      'Solo consigli generali',
      'Non può vedere condizioni specifiche'
    ]
  }
];

export function AgentSelector({
  currentAgent,
  onAgentSelect,
  onClose,
  className = ''
}: AgentSelectorProps) {

  const handleAgentSelect = (agent: AgentType) => {
    trackCTAClick('agent_selector.select', {
      selected_agent: agent,
      previous_agent: currentAgent
    });

    onAgentSelect(agent);
  };

  const getColorClasses = (color: string, selected: boolean) => {
    const baseClasses = selected
      ? 'ring-2 ring-offset-2 border-transparent'
      : 'border-gray-200 hover:border-gray-300';

    const colorClasses = {
      blue: selected
        ? 'ring-blue-500 bg-blue-50 border-blue-500'
        : 'hover:bg-blue-50',
      green: selected
        ? 'ring-green-500 bg-green-50 border-green-500'
        : 'hover:bg-green-50',
      orange: selected
        ? 'ring-orange-500 bg-orange-50 border-orange-500'
        : 'hover:bg-orange-50'
    };

    return `${baseClasses} ${colorClasses[color as keyof typeof colorClasses] || ''}`;
  };

  const getIconBackground = (color: string, selected: boolean) => {
    const colorClasses = {
      blue: selected ? 'bg-blue-500' : 'bg-blue-100',
      green: selected ? 'bg-green-500' : 'bg-green-100',
      orange: selected ? 'bg-orange-500' : 'bg-orange-100'
    };

    return colorClasses[color as keyof typeof colorClasses] || 'bg-gray-100';
  };

  const getTextColor = (color: string, selected: boolean) => {
    if (selected) return 'text-white';

    const colorClasses = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600'
    };

    return colorClasses[color as keyof typeof colorClasses] || 'text-gray-600';
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Seleziona Agente AI"
      size="lg"
      className={className}
    >
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">
          Scegli l'agente AI più adatto alle tue esigenze. Ogni agente è specializzato
          in un'area specifica per offrirti consigli esperti e personalizzati.
        </p>

        <div className="grid gap-4">
          {agentData.map((agent) => {
            const isSelected = agent.type === currentAgent;

            return (
              <Card
                key={agent.type}
                className={`cursor-pointer transition-all duration-200 ${
                  getColorClasses(agent.color, isSelected)
                }`}
                onClick={() => handleAgentSelect(agent.type)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Agent Icon */}
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-2xl
                      ${getIconBackground(agent.color, isSelected)}
                      ${getTextColor(agent.color, isSelected)}
                    `}>
                      {agent.icon}
                    </div>

                    {/* Agent Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {agent.name}
                        </h3>
                        {isSelected && (
                          <div className="flex items-center text-sm text-green-600">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Attivo
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-4">
                        {agent.description}
                      </p>

                      {/* Capabilities */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Capacità principali:
                          </h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {agent.capabilities.map((capability, index) => (
                              <li key={index} className="flex items-start">
                                <svg className="w-3 h-3 text-green-500 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {capability}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Ideale per:
                          </h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {agent.bestFor.map((use, index) => (
                              <li key={index} className="flex items-start">
                                <svg className="w-3 h-3 text-blue-500 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                {use}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Limitations */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                          <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Limitazioni importanti:
                        </h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {agent.limitations.map((limitation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                              {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Select Button */}
                      {!isSelected && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgentSelect(agent.type);
                            }}
                            ctaId={`agent_selector.select_${agent.type}`}
                          >
                            Seleziona {agent.name}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer with important notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-amber-800 mb-1">
                Importante da ricordare
              </h4>
              <p className="text-sm text-amber-700">
                Gli agenti AI forniscono consigli informativi e supporto, ma non sostituiscono
                mai consulenti professionali, veterinari o addestratori qualificati.
                Per situazioni urgenti o problemi gravi, consulta sempre un esperto.
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            ctaId="agent_selector.close"
          >
            Chiudi
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AgentSelector;
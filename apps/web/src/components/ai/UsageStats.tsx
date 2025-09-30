/**
 * UsageStats - AI Usage Statistics and Limits Component
 *
 * Displays comprehensive AI usage statistics, limits, and billing information
 * with visual charts and usage breakdowns by agent type.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { trackCTAClick } from '@/analytics/ga4';
import { AgentType } from '@/types/ai-agents';

interface UsageStatsProps {
  sessionId: string;
  onClose: () => void;
  className?: string;
}

interface UsagePlan {
  name: string;
  messagesPerMonth: number;
  actionsPerMonth: number;
  price: number;
  features: string[];
}

interface UsageData {
  currentPlan: UsagePlan;
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    daysRemaining: number;
  };
  usage: {
    totalMessages: number;
    totalActions: number;
    messagesByAgent: Record<AgentType, number>;
    actionsByAgent: Record<AgentType, number>;
    dailyUsage: Array<{
      date: string;
      messages: number;
      actions: number;
    }>;
  };
  limits: {
    messagesLimit: number;
    actionsLimit: number;
    rateLimits: {
      messagesPerHour: number;
      actionsPerDay: number;
    };
  };
}

// Mock data for demonstration
const mockUsageData: UsageData = {
  currentPlan: {
    name: 'Piano Base',
    messagesPerMonth: 500,
    actionsPerMonth: 100,
    price: 0,
    features: [
      'Accesso a tutti gli agenti AI',
      '500 messaggi al mese',
      '100 azioni al mese',
      'Supporto via chat',
      'Cronologia conversazioni (30 giorni)'
    ]
  },
  currentPeriod: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    daysRemaining: 15
  },
  usage: {
    totalMessages: 127,
    totalActions: 23,
    messagesByAgent: {
      veterinary: 45,
      trainer: 67,
      groomer: 15
    },
    actionsByAgent: {
      veterinary: 8,
      trainer: 12,
      groomer: 3
    },
    dailyUsage: [
      { date: '2024-01-15', messages: 8, actions: 2 },
      { date: '2024-01-14', messages: 12, actions: 3 },
      { date: '2024-01-13', messages: 6, actions: 1 },
      { date: '2024-01-12', messages: 15, actions: 4 },
      { date: '2024-01-11', messages: 9, actions: 2 },
      { date: '2024-01-10', messages: 11, actions: 3 },
      { date: '2024-01-09', messages: 7, actions: 1 },
    ]
  },
  limits: {
    messagesLimit: 500,
    actionsLimit: 100,
    rateLimits: {
      messagesPerHour: 20,
      actionsPerDay: 10
    }
  }
};

const availablePlans: UsagePlan[] = [
  {
    name: 'Piano Base',
    messagesPerMonth: 500,
    actionsPerMonth: 100,
    price: 0,
    features: [
      'Accesso a tutti gli agenti AI',
      '500 messaggi al mese',
      '100 azioni al mese',
      'Supporto via chat',
      'Cronologia conversazioni (30 giorni)'
    ]
  },
  {
    name: 'Piano Pro',
    messagesPerMonth: 2000,
    actionsPerMonth: 500,
    price: 9.99,
    features: [
      'Tutti i vantaggi del Piano Base',
      '2000 messaggi al mese',
      '500 azioni al mese',
      'Supporto prioritario',
      'Cronologia conversazioni (90 giorni)',
      'Esportazione conversazioni',
      'Statistiche avanzate'
    ]
  },
  {
    name: 'Piano Premium',
    messagesPerMonth: 5000,
    actionsPerMonth: 1500,
    price: 19.99,
    features: [
      'Tutti i vantaggi del Piano Pro',
      '5000 messaggi al mese',
      '1500 azioni al mese',
      'Supporto dedicato',
      'Cronologia conversazioni illimitata',
      'API personalizzata',
      'Dashboard analytics',
      'Multi-cane (fino a 5)'
    ]
  }
];

export function UsageStats({
  sessionId,
  onClose,
  className = ''
}: UsageStatsProps) {
  const [usageData, setUsageData] = useState<UsageData>(mockUsageData);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'plans'>('overview');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    trackCTAClick('usage_stats.view', {
      session_id: sessionId,
      current_plan: usageData.currentPlan.name
    });
  }, [sessionId, usageData.currentPlan.name]);

  // Calculate usage percentages
  const messageUsagePercentage = Math.round(
    (usageData.usage.totalMessages / usageData.limits.messagesLimit) * 100
  );
  const actionUsagePercentage = Math.round(
    (usageData.usage.totalActions / usageData.limits.actionsLimit) * 100
  );

  // Get usage color based on percentage
  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get agent display info
  const getAgentInfo = (agentType: AgentType) => {
    switch (agentType) {
      case 'veterinary':
        return { name: 'Veterinario', icon: '🏥', color: 'blue' };
      case 'trainer':
        return { name: 'Educatore', icon: '🎯', color: 'green' };
      case 'groomer':
        return { name: 'Toelettatore', icon: '✂️', color: 'orange' };
      default:
        return { name: 'Agente', icon: '🤖', color: 'gray' };
    }
  };

  // Handle plan upgrade
  const handleUpgrade = (plan: UsagePlan) => {
    trackCTAClick('usage_stats.upgrade', {
      from_plan: usageData.currentPlan.name,
      to_plan: plan.name,
      price: plan.price
    });

    // In a real app, this would redirect to payment
    console.log('Upgrading to:', plan.name);
    setShowUpgradeModal(false);
  };

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Piano Attuale: {usageData.currentPlan.name}
          </h3>
          <p className="text-sm text-gray-600">
            Periodo: {usageData.currentPeriod.startDate.toLocaleDateString('it-IT')} - {' '}
            {usageData.currentPeriod.endDate.toLocaleDateString('it-IT')}
            <span className="ml-2 text-blue-600">
              ({usageData.currentPeriod.daysRemaining} giorni rimanenti)
            </span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Messages Usage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Messaggi</span>
                <span className={`text-sm font-semibold ${getUsageColor(messageUsagePercentage)}`}>
                  {usageData.usage.totalMessages} / {usageData.limits.messagesLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(messageUsagePercentage)}`}
                  style={{ width: `${Math.min(messageUsagePercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {messageUsagePercentage}% utilizzato
              </p>
            </div>

            {/* Actions Usage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Azioni</span>
                <span className={`text-sm font-semibold ${getUsageColor(actionUsagePercentage)}`}>
                  {usageData.usage.totalActions} / {usageData.limits.actionsLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(actionUsagePercentage)}`}
                  style={{ width: `${Math.min(actionUsagePercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {actionUsagePercentage}% utilizzato
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage by Agent */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Utilizzo per Agente
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(Object.entries(usageData.usage.messagesByAgent) as [AgentType, number][]).map(([agentType, messageCount]) => {
              const agentInfo = getAgentInfo(agentType);
              const actionCount = usageData.usage.actionsByAgent[agentType] || 0;

              return (
                <div key={agentType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl" role="img" aria-label={agentInfo.name}>
                      {agentInfo.icon}
                    </span>
                    <div>
                      <h4 className="font-medium text-gray-900">{agentInfo.name}</h4>
                      <p className="text-sm text-gray-600">
                        {messageCount} messaggi • {actionCount} azioni
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold text-${agentInfo.color}-600`}>
                      {((messageCount / usageData.usage.totalMessages) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">del totale</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage Warning */}
      {(messageUsagePercentage > 80 || actionUsagePercentage > 80) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-orange-800">
                  Attenzione: Limite quasi raggiunto
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  Hai utilizzato più dell'80% del tuo piano mensile.
                  Considera di aggiornare il tuo piano per evitare interruzioni.
                </p>
                <Button
                  variant="warning"
                  size="sm"
                  className="mt-2"
                  onClick={() => setActiveTab('plans')}
                  ctaId="usage_stats.upgrade_warning"
                >
                  Vedi piani disponibili
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render details tab
  const renderDetails = () => (
    <div className="space-y-6">
      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Limiti di Utilizzo
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {usageData.limits.rateLimits.messagesPerHour}
              </div>
              <div className="text-sm text-blue-800">Messaggi per ora</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {usageData.limits.rateLimits.actionsPerDay}
              </div>
              <div className="text-sm text-green-800">Azioni per giorno</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Usage Chart */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Utilizzo degli Ultimi 7 Giorni
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {usageData.usage.dailyUsage.reverse().map((day, index) => {
              const maxMessages = Math.max(...usageData.usage.dailyUsage.map(d => d.messages));
              const messagePercentage = (day.messages / maxMessages) * 100;

              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-16 text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString('it-IT', {
                      weekday: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Messaggi: {day.messages}</span>
                      <span>Azioni: {day.actions}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${messagePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render plans tab
  const renderPlans = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Scegli il Piano Perfetto per Te
        </h3>
        <p className="text-gray-600">
          Aggiorna il tuo piano per accedere a più funzionalità e limiti maggiori
        </p>
      </div>

      <div className="grid gap-4">
        {availablePlans.map((plan) => {
          const isCurrent = plan.name === usageData.currentPlan.name;

          return (
            <Card
              key={plan.name}
              className={`${
                isCurrent
                  ? 'ring-2 ring-green-500 border-green-500 bg-green-50'
                  : plan.name === 'Piano Pro'
                  ? 'ring-2 ring-blue-500 border-blue-500'
                  : 'border-gray-200'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                      {isCurrent && (
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                          Attuale
                        </span>
                      )}
                      {plan.name === 'Piano Pro' && !isCurrent && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                          Popolare
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {plan.price === 0 ? 'Gratuito' : `€${plan.price}/mese`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {plan.messagesPerMonth}
                    </div>
                    <div className="text-sm text-gray-600">Messaggi/mese</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      {plan.actionsPerMonth}
                    </div>
                    <div className="text-sm text-gray-600">Azioni/mese</div>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <Button
                    variant={plan.name === 'Piano Pro' ? 'primary' : 'secondary'}
                    className="w-full"
                    onClick={() => handleUpgrade(plan)}
                    ctaId={`usage_stats.select_plan.${plan.name.toLowerCase().replace(' ', '_')}`}
                  >
                    {plan.price === 0 ? 'Rimani su questo piano' : `Aggiorna a ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Statistiche di Utilizzo AI"
      size="lg"
      className={className}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Panoramica' },
              { id: 'details', label: 'Dettagli' },
              { id: 'plans', label: 'Piani' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'plans' && renderPlans()}

        {/* Footer */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="ghost"
            onClick={onClose}
            ctaId="usage_stats.close"
          >
            Chiudi
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default UsageStats;
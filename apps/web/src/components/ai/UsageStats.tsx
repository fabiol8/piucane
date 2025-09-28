'use client';

import { Card } from '@piucane/ui';

interface UsageStatsProps {
  stats: {
    usage: any;
    limits: any;
    remaining: any;
  };
  selectedAgent: 'vet' | 'educator' | 'groomer';
}

export default function UsageStats({ stats, selectedAgent }: UsageStatsProps) {
  const getProgressColor = (remaining: number, limit: number) => {
    const percentage = (remaining / limit) * 100;
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressWidth = (used: number, limit: number) => {
    return Math.min(100, (used / limit) * 100);
  };

  const agents = [
    { id: 'vet', name: 'Veterinario', icon: '🩺' },
    { id: 'educator', name: 'Educatore', icon: '🎓' },
    { id: 'groomer', name: 'Groomer', icon: '✂️' }
  ];

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-4">Utilizzo giornaliero</h3>

      <div className="space-y-4">
        {agents.map((agent) => {
          const agentId = agent.id as keyof typeof stats.remaining;
          const used = stats.limits[agentId].daily - stats.remaining[agentId].daily;
          const limit = stats.limits[agentId].daily;
          const remaining = stats.remaining[agentId].daily;
          const isSelected = selectedAgent === agentId;

          return (
            <div
              key={agent.id}
              className={`p-3 rounded-lg border ${
                isSelected
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{agent.icon}</span>
                  <span className={`text-sm font-medium ${
                    isSelected ? 'text-orange-900' : 'text-gray-700'
                  }`}>
                    {agent.name}
                  </span>
                </div>
                <span className="text-xs text-gray-600">
                  {used}/{limit}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    getProgressColor(remaining, limit)
                  }`}
                  style={{ width: `${getProgressWidth(used, limit)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  {remaining} rimasti
                </span>
                <span className={`text-xs ${
                  remaining > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {remaining > 0 ? '✓ Disponibile' : '✗ Esaurito'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset time */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-blue-800">
          <strong>🔄 Reset:</strong> I limiti si resettano ogni giorno alle 00:00 CET
        </div>
      </div>

      {/* Upgrade hint */}
      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="text-xs text-purple-800">
          <strong>💎 Suggerimento:</strong> Completa missioni e guadagna badge per aumentare i limiti giornalieri!
        </div>
      </div>
    </Card>
  );
}
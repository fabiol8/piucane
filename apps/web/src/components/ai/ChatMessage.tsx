'use client';

import { Card } from '@piucane/ui';
import { trackEvent } from '@/analytics/ga4';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  urgent?: boolean;
  toolResults?: any[];
  timestamp: string;
}

interface ChatMessageProps {
  message: Message;
  agentType: 'vet' | 'educator' | 'groomer';
}

export default function ChatMessage({ message, agentType }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isUrgent = message.urgent;

  const getAgentIcon = () => {
    switch (agentType) {
      case 'vet': return '🩺';
      case 'educator': return '🎓';
      case 'groomer': return '✂️';
      default: return '🤖';
    }
  };

  const getAgentColor = () => {
    switch (agentType) {
      case 'vet': return 'bg-blue-50 border-blue-200';
      case 'educator': return 'bg-green-50 border-green-200';
      case 'groomer': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const handleToolResultClick = (tool: string, result: any) => {
    trackEvent('ai_tool_result_viewed', {
      agent_type: agentType,
      tool_name: tool,
      result_type: typeof result
    });
  };

  const formatContent = (content: string) => {
    // Split content by lines and format special sections
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Format urgent warnings
      if (line.includes('🚨 URGENTE')) {
        return (
          <div key={index} className="bg-red-100 border border-red-300 rounded-lg p-3 mb-3">
            <div className="text-red-800 font-semibold">{line}</div>
          </div>
        );
      }

      // Format disclaimers
      if (line.includes('⚠️ Disclaimer') || line.includes('💡 Nota')) {
        return (
          <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-3">
            <div className="text-yellow-800 text-sm">{line}</div>
          </div>
        );
      }

      // Format bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={index} className="ml-4 mb-1">
            {line}
          </div>
        );
      }

      // Regular line
      if (line.trim()) {
        return (
          <div key={index} className="mb-2">
            {line}
          </div>
        );
      }

      return <br key={index} />;
    });
  };

  const renderToolResults = () => {
    if (!message.toolResults || message.toolResults.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium text-gray-600">🔧 Azioni eseguite:</div>
        {message.toolResults.map((toolResult, index) => (
          <Card
            key={index}
            padding="sm"
            className="bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => handleToolResultClick(toolResult.tool, toolResult.result)}
          >
            <div className="flex items-start space-x-2">
              <div className="text-blue-600">
                {getToolIcon(toolResult.tool)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-blue-900">
                  {getToolDisplayName(toolResult.tool)}
                </div>
                {toolResult.result && (
                  <div className="text-xs text-blue-700 mt-1">
                    {renderToolResult(toolResult.tool, toolResult.result)}
                  </div>
                )}
                {toolResult.error && (
                  <div className="text-xs text-red-600 mt-1">
                    Errore: {toolResult.error}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'getDogProfile': return '🐕';
      case 'suggestProducts': return '🛍️';
      case 'createReminder': return '⏰';
      case 'createMission': return '🎯';
      case 'logAdverseEvent': return '⚠️';
      default: return '🔧';
    }
  };

  const getToolDisplayName = (tool: string) => {
    switch (tool) {
      case 'getDogProfile': return 'Profilo cane consultato';
      case 'suggestProducts': return 'Prodotti suggeriti';
      case 'createReminder': return 'Promemoria creato';
      case 'createMission': return 'Missione creata';
      case 'logAdverseEvent': return 'Evento segnalato';
      default: return tool;
    }
  };

  const renderToolResult = (tool: string, result: any) => {
    switch (tool) {
      case 'getDogProfile':
        return `Consultato profilo di ${result.name || 'cane'} (${result.breed || 'razza non specificata'})`;

      case 'suggestProducts':
        return Array.isArray(result)
          ? `${result.length} prodotti trovati: ${result.map(p => p.name).join(', ')}`
          : 'Prodotti suggeriti trovati';

      case 'createReminder':
        return result.created ? 'Promemoria salvato con successo' : 'Errore nella creazione';

      case 'createMission':
        return result.created ? 'Nuova missione disponibile nelle tue attività' : 'Errore nella creazione';

      case 'logAdverseEvent':
        return result.logged ? 'Evento registrato per il monitoraggio' : 'Errore nella registrazione';

      default:
        return JSON.stringify(result, null, 2);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'ml-12' : 'mr-12'}`}>
        {/* Message bubble */}
        <Card
          className={`${
            isUser
              ? 'bg-orange-600 text-white'
              : isUrgent
              ? 'bg-red-50 border-red-300'
              : getAgentColor()
          } ${isUrgent ? 'shadow-lg' : ''}`}
          padding="sm"
        >
          {/* Agent header for assistant messages */}
          {!isUser && (
            <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-current border-opacity-20">
              <span className="text-lg">{getAgentIcon()}</span>
              <span className="text-sm font-medium">
                {agentType === 'vet' ? 'Dr. AI Veterinario' :
                 agentType === 'educator' ? 'Educatore Cinofilo AI' :
                 'Groomer Professionale AI'}
              </span>
              {isUrgent && (
                <span className="text-red-600 text-xs font-bold">🚨 URGENTE</span>
              )}
            </div>
          )}

          {/* Message content */}
          <div className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`}>
            {formatContent(message.content)}
          </div>

          {/* Tool results */}
          {renderToolResults()}
        </Card>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
}
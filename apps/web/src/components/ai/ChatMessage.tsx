/**
 * ChatMessage - Individual AI Chat Message Component
 *
 * Displays individual chat messages with support for different roles,
 * safety flags, suggested actions, and commercial disclosures.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { trackCTAClick } from '@/analytics/ga4';
import {
  ChatMessage as ChatMessageType,
  AgentAction,
  SafetyLevel,
  MessageRole,
  AgentType
} from '@/types/ai-agents';

interface ChatMessageProps {
  message: ChatMessageType;
  onActionClick?: (action: AgentAction) => void;
  agentName?: string;
  className?: string;
}

export function ChatMessage({
  message,
  onActionClick,
  agentName = 'Agente AI',
  className = ''
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';

  // Handle action click
  const handleActionClick = (action: AgentAction) => {
    trackCTAClick('chat_message.action.click', {
      action_type: action.type,
      action_id: action.id,
      message_id: message.id,
      agent_type: message.agentType
    });

    onActionClick?.(action);
    setShowActions(false);
  };

  // Get safety level styling
  const getSafetyLevelStyling = (level: SafetyLevel) => {
    switch (level) {
      case 'warning':
        return {
          borderColor: 'border-yellow-200',
          backgroundColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500'
        };
      case 'urgent':
        return {
          borderColor: 'border-red-200',
          backgroundColor: 'bg-red-50',
          textColor: 'text-red-800',
          iconColor: 'text-red-500'
        };
      case 'blocked':
        return {
          borderColor: 'border-red-300',
          backgroundColor: 'bg-red-100',
          textColor: 'text-red-900',
          iconColor: 'text-red-600'
        };
      default:
        return {
          borderColor: 'border-gray-200',
          backgroundColor: 'bg-white',
          textColor: 'text-gray-900',
          iconColor: 'text-gray-500'
        };
    }
  };

  // Get agent color
  const getAgentColor = (agentType: AgentType) => {
    switch (agentType) {
      case 'veterinary':
        return 'bg-blue-500';
      case 'trainer':
        return 'bg-green-500';
      case 'groomer':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  // Render safety flags
  const renderSafetyFlags = () => {
    if (!message.safetyFlags || message.safetyFlags.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {message.safetyFlags.map((flag, index) => {
          const styling = getSafetyLevelStyling(flag.level);

          return (
            <div
              key={index}
              className={`p-3 rounded-lg border ${styling.borderColor} ${styling.backgroundColor}`}
            >
              <div className="flex items-start space-x-2">
                <div className={`flex-shrink-0 ${styling.iconColor}`}>
                  {flag.level === 'warning' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {(flag.level === 'urgent' || flag.level === 'blocked') && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${styling.textColor}`}>
                    {flag.message}
                  </p>
                  {flag.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`mt-2 ${styling.textColor} hover:${styling.backgroundColor}`}
                      onClick={() => {
                        if (flag.action?.url) {
                          window.open(flag.action.url, '_blank');
                        }
                      }}
                      ctaId="chat_message.safety_action"
                    >
                      {flag.action.label}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render suggested actions
  const renderSuggestedActions = () => {
    if (!message.suggestedActions || message.suggestedActions.length === 0 || !showActions) {
      return null;
    }

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Azioni suggerite:
        </h4>
        <div className="flex flex-wrap gap-2">
          {message.suggestedActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'secondary'}
              size="sm"
              disabled={action.disabled}
              onClick={() => handleActionClick(action)}
              ctaId={`chat_message.action.${action.type}`}
              leftIcon={action.icon && (
                <span className="text-base" role="img" aria-label={action.label}>
                  {action.icon}
                </span>
              )}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Render commercial disclosure
  const renderCommercialDisclosure = () => {
    if (!message.hasCommercialContent) return null;

    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-blue-800">
              Trasparenza commerciale
            </h5>
            <p className="text-xs text-blue-700 mt-1">
              {message.commercialDisclosure ||
               'Questo messaggio potrebbe contenere suggerimenti di prodotti. PiùCane riceve commissioni per alcuni acquisti.'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // System message styling
  if (isSystem) {
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full max-w-xs text-center">
          {message.content}
        </div>
      </div>
    );
  }

  // User or Assistant message
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? 'order-2' : 'order-1'}`}>

        {/* Message bubble */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-green-600 text-white rounded-br-md ml-8'
            : `${getSafetyLevelStyling(message.metadata?.safetyLevel || 'ok').backgroundColor}
               ${getSafetyLevelStyling(message.metadata?.safetyLevel || 'ok').textColor}
               ${getSafetyLevelStyling(message.metadata?.safetyLevel || 'ok').borderColor}
               border rounded-bl-md mr-8 shadow-sm`
        }`}>

          {/* Agent name for assistant messages */}
          {isAssistant && (
            <div className="text-xs font-medium text-gray-500 mb-1">
              {agentName}
            </div>
          )}

          {/* Message content */}
          <div className={`text-sm whitespace-pre-wrap ${
            message.content.length > 300 && !isExpanded ? 'line-clamp-4' : ''
          }`}>
            {message.content}
          </div>

          {/* Expand/collapse for long messages */}
          {message.content.length > 300 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs mt-1 underline ${
                isUser ? 'text-green-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              {isExpanded ? 'Mostra meno' : 'Mostra tutto'}
            </button>
          )}

          {/* Timestamp and metadata */}
          <div className={`flex items-center justify-between mt-2 text-xs ${
            isUser ? 'text-green-200' : 'text-gray-500'
          }`}>
            <span>{formatTimestamp(message.timestamp)}</span>
            {message.metadata?.tokens && (
              <span className="opacity-75">
                {message.metadata.tokens} token
                {message.metadata.processingTime && ` • ${message.metadata.processingTime}ms`}
              </span>
            )}
          </div>
        </div>

        {/* Safety flags (only for assistant messages) */}
        {isAssistant && renderSafetyFlags()}

        {/* Commercial disclosure */}
        {isAssistant && renderCommercialDisclosure()}

        {/* Suggested actions (only for assistant messages) */}
        {isAssistant && renderSuggestedActions()}
      </div>

      {/* Avatar for assistant messages */}
      {isAssistant && (
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold
          ml-2 order-2 self-end flex-shrink-0
          ${getAgentColor(message.agentType)}
        `}>
          {message.agentType === 'veterinary' && '🏥'}
          {message.agentType === 'trainer' && '🎯'}
          {message.agentType === 'groomer' && '✂️'}
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ContentGenerationPipeline } from '@/lib/content/ContentGenerationPipeline';
import type {
  EditorialWorkflow,
  ContentGenerationRequest,
  WorkflowStage,
  ContentItem
} from '@/types/content';

export default function EditorialDashboard() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<EditorialWorkflow[]>([]);
  const [contentRequests, setContentRequests] = useState<ContentGenerationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'workflows' | 'requests' | 'generation'>('workflows');
  const [showGenerationModal, setShowGenerationModal] = useState(false);

  const pipeline = new ContentGenerationPipeline();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Mock data for development
      const mockWorkflows: EditorialWorkflow[] = [
        {
          contentId: 'content_001',
          currentStage: {
            id: 'content_review',
            name: 'Revisione Contenuto',
            type: 'editing',
            status: 'in_progress',
            assignedTo: 'editor-001',
            startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            estimatedDuration: 1800,
            requirements: ['Grammar check', 'Style consistency'],
            automatable: false
          },
          stages: [
            {
              id: 'ai_generation',
              name: 'Generazione AI',
              type: 'creation',
              status: 'completed',
              completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
              estimatedDuration: 300,
              requirements: ['AI safety checks'],
              automatable: true
            },
            {
              id: 'content_review',
              name: 'Revisione Contenuto',
              type: 'editing',
              status: 'in_progress',
              assignedTo: 'editor-001',
              startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
              estimatedDuration: 1800,
              requirements: ['Grammar check', 'Style consistency'],
              automatable: false
            },
            {
              id: 'vet_review',
              name: 'Revisione Veterinaria',
              type: 'vet_review',
              status: 'pending',
              estimatedDuration: 3600,
              requirements: ['Medical accuracy', 'Safety validation'],
              automatable: false
            },
            {
              id: 'final_approval',
              name: 'Approvazione Finale',
              type: 'final_approval',
              status: 'pending',
              estimatedDuration: 600,
              requirements: ['All stages completed'],
              automatable: false
            }
          ],
          priority: 'high',
          notes: [
            {
              id: 'note_001',
              userId: 'editor-001',
              userName: 'Maria Editor',
              content: 'Contenuto ben strutturato, serve solo controllo grammaticale',
              type: 'comment',
              stageId: 'content_review',
              createdAt: new Date(Date.now() - 30 * 60 * 1000)
            }
          ],
          approvals: [],
          rejections: [],
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          contentId: 'content_002',
          currentStage: {
            id: 'vet_review',
            name: 'Revisione Veterinaria',
            type: 'vet_review',
            status: 'in_progress',
            assignedTo: 'vet-001',
            startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            estimatedDuration: 3600,
            requirements: ['Medical accuracy check'],
            automatable: false
          },
          stages: [],
          priority: 'medium',
          notes: [],
          approvals: [],
          rejections: [],
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
        }
      ];

      const mockRequests: ContentGenerationRequest[] = [
        {
          id: 'req_001',
          type: 'article',
          prompt: 'Crea un articolo sulla socializzazione dei cuccioli',
          targeting: {
            dogAges: [{ min: 2, max: 6, unit: 'months' }],
            experienceLevel: ['beginner']
          },
          styleGuide: {
            tone: 'friendly',
            formality: 'informal',
            perspective: 'second_person',
            length: 'medium',
            includeEmojis: true,
            includeCTA: true,
            brandVoice: ['helpful', 'caring']
          },
          ragContext: {
            sources: [],
            maxSources: 5,
            relevanceThreshold: 0.8,
            vetApprovedOnly: true,
            languages: ['it']
          },
          constraints: {
            maxLength: 2000,
            minLength: 800,
            requiredKeywords: ['socializzazione', 'cucciolo'],
            forbiddenTopics: ['violenza'],
            mustIncludeSafety: true,
            requireVetReview: true,
            allowMedicalAdvice: false,
            targetReadingLevel: 8
          },
          requestedBy: 'admin-001',
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
          status: 'pending'
        }
      ];

      setWorkflows(mockWorkflows);
      setContentRequests(mockRequests);
    } catch (error) {
      console.error('Failed to load editorial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageAction = async (workflowId: string, stageId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      // In real implementation, update workflow stage
      console.log('Stage action:', { workflowId, stageId, action, notes });

      // Refresh data
      await loadData();
    } catch (error) {
      console.error('Failed to update stage:', error);
    }
  };

  const handleGenerateContent = async (request: ContentGenerationRequest) => {
    try {
      const result = await pipeline.generateContent(request);
      console.log('Content generated:', result);

      // Refresh data
      await loadData();
      setShowGenerationModal(false);
    } catch (error) {
      console.error('Content generation failed:', error);
    }
  };

  const getStageIcon = (type: WorkflowStage['type']) => {
    switch (type) {
      case 'creation': return '🤖';
      case 'editing': return '✏️';
      case 'vet_review': return '👨‍⚕️';
      case 'fact_check': return '🔍';
      case 'seo_review': return '📊';
      case 'final_approval': return '✅';
      default: return '📝';
    }
  };

  const getStatusColor = (status: WorkflowStage['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: EditorialWorkflow['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Accesso Richiesto</h2>
          <p className="text-gray-600 mb-6">Effettua il login per accedere al dashboard editoriale</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Accedi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Editoriale</h1>
              <p className="text-gray-600 mt-1">Gestisci contenuti e workflow editoriali</p>
            </div>
            <button
              onClick={() => setShowGenerationModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Genera Contenuto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('workflows')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'workflows'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Workflow Attivi ({workflows.length})
            </button>
            <button
              onClick={() => setSelectedTab('requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Richieste Pending ({contentRequests.length})
            </button>
            <button
              onClick={() => setSelectedTab('generation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'generation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generazione AI
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Workflows Tab */}
        {selectedTab === 'workflows' && (
          <div className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow animate-pulse">
                    <div className="p-6 space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="flex space-x-4">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="h-16 bg-gray-200 rounded w-24"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {workflows.map((workflow) => (
                  <div key={workflow.contentId} className="bg-white rounded-lg shadow">
                    <div className="p-6">
                      {/* Workflow Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Contenuto: {workflow.contentId}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            Creato: {workflow.createdAt.toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(workflow.priority)}`}>
                            {workflow.priority.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.currentStage.status)}`}>
                            {workflow.currentStage.name}
                          </span>
                        </div>
                      </div>

                      {/* Workflow Stages */}
                      <div className="flex items-center space-x-4 mb-6 overflow-x-auto">
                        {workflow.stages.map((stage, index) => (
                          <div key={stage.id} className="flex items-center space-x-2 flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
                              stage.status === 'completed' ? 'bg-green-100' :
                              stage.status === 'in_progress' ? 'bg-blue-100' :
                              stage.status === 'failed' ? 'bg-red-100' :
                              'bg-gray-100'
                            }`}>
                              {getStageIcon(stage.type)}
                            </div>
                            <div className="text-center min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {stage.name}
                              </div>
                              <div className={`text-xs px-2 py-1 rounded ${getStatusColor(stage.status)} mt-1`}>
                                {stage.status}
                              </div>
                            </div>
                            {index < workflow.stages.length - 1 && (
                              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Current Stage Actions */}
                      {workflow.currentStage.status === 'in_progress' && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Azioni per: {workflow.currentStage.name}
                          </h4>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleStageAction(workflow.contentId, workflow.currentStage.id, 'approve')}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Approva
                            </button>
                            <button
                              onClick={() => handleStageAction(workflow.contentId, workflow.currentStage.id, 'reject')}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Rifiuta
                            </button>
                            <input
                              type="text"
                              placeholder="Aggiungi note..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {workflow.notes.length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium text-gray-900 mb-3">Note recenti</h4>
                          <div className="space-y-2">
                            {workflow.notes.slice(-2).map((note) => (
                              <div key={note.id} className="bg-blue-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-blue-900">{note.userName}</span>
                                  <span className="text-xs text-blue-600">
                                    {note.createdAt.toLocaleString('it-IT')}
                                  </span>
                                </div>
                                <p className="text-blue-800 text-sm">{note.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {workflows.length === 0 && (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun workflow attivo</h3>
                    <p className="text-gray-600">Tutti i contenuti sono stati pubblicati o non ci sono workflow in corso</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {selectedTab === 'requests' && (
          <div className="space-y-4">
            {contentRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Richiesto da: {request.requestedBy} • {request.createdAt.toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'generating' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {request.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Prompt</h4>
                  <p className="text-gray-700">{request.prompt}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Targeting</label>
                    <p className="text-sm text-gray-900">
                      {request.targeting.experienceLevel?.join(', ') || 'Generale'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tono</label>
                    <p className="text-sm text-gray-900">{request.styleGuide.tone}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lunghezza</label>
                    <p className="text-sm text-gray-900">
                      {request.constraints.minLength}-{request.constraints.maxLength} caratteri
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revisione Vet</label>
                    <p className="text-sm text-gray-900">
                      {request.constraints.requireVetReview ? 'Richiesta' : 'Non necessaria'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleGenerateContent(request)}
                    disabled={request.status !== 'pending'}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Genera Contenuto
                  </button>
                  <button className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    Modifica Richiesta
                  </button>
                  <button className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors">
                    Elimina
                  </button>
                </div>
              </div>
            ))}

            {contentRequests.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna richiesta pending</h3>
                <p className="text-gray-600">Tutte le richieste di contenuto sono state processate</p>
              </div>
            )}
          </div>
        )}

        {/* Generation Tab */}
        {selectedTab === 'generation' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Generazione AI - Statistiche</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-blue-900">47</p>
                    <p className="text-blue-600 text-sm">Contenuti generati questo mese</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-green-900">89%</p>
                    <p className="text-green-600 text-sm">Tasso di approvazione</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-orange-900">2.3h</p>
                    <p className="text-orange-600 text-sm">Tempo medio di review</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Contenuti generati di recente</h4>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="font-medium text-gray-900">
                        Guida alla nutrizione per cuccioli {i}
                      </h5>
                      <p className="text-gray-600 text-sm">
                        Generato 2 ore fa • Targeting: Principianti
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Approvato
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Visualizza
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generation Modal */}
      {showGenerationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Genera Nuovo Contenuto</h3>
                <button
                  onClick={() => setShowGenerationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo di contenuto
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="article">Articolo</option>
                    <option value="guide">Guida</option>
                    <option value="checklist">Checklist</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt di generazione
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrivi il contenuto che vuoi generare..."
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Targeting
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="beginner">Principianti</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="expert">Esperto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tono
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="friendly">Amichevole</option>
                      <option value="professional">Professionale</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700">Richiede revisione veterinaria</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700">Includi emoji</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGenerationModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Genera Contenuto
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
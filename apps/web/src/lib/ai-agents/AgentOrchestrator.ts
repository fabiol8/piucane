export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  capabilities: string[];
}

export class AgentOrchestrator {
  private agents: Agent[] = [
    {
      id: 'veterinary',
      name: 'Dr. Vetty',
      role: 'Veterinario AI',
      avatar: '🩺',
      description: 'Specializzato in salute e benessere dei cani',
      capabilities: ['diagnosi', 'consigli medici', 'vaccinazioni', 'emergenze']
    },
    {
      id: 'trainer',
      name: 'Coach Rex',
      role: 'Educatore Cinofilo',
      avatar: '🎾',
      description: 'Esperto in addestramento e comportamento',
      capabilities: ['addestramento', 'comportamento', 'socializzazione', 'comandi']
    },
    {
      id: 'groomer',
      name: 'Bella Groomer',
      role: 'Toelettatore Esperto',
      avatar: '✂️',
      description: 'Specialista in cura del pelo e igiene',
      capabilities: ['toelettatura', 'igiene', 'cura del pelo', 'prodotti']
    }
  ];

  getAgent(agentId: string): Agent | undefined {
    return this.agents.find(agent => agent.id === agentId);
  }

  getAllAgents(): Agent[] {
    return this.agents;
  }

  async processMessage(agentId: string, message: string, userId?: string): Promise<string> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Call the API
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        agent: agentId,
        userId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response from agent');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Agent response failed');
    }

    return result.data.response;
  }
}
import { Request, Response } from 'express';
import { db } from '../../config/firebase';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { z } from 'zod';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Chat request schema
const chatRequestSchema = z.object({
  agentType: z.enum(['vet', 'educator', 'groomer']),
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
  dogId: z.string().optional(),
  context: z.record(z.any()).optional()
});

// Available tools for agents
const AVAILABLE_TOOLS = {
  getDogProfile: {
    description: 'Get detailed dog profile information',
    parameters: {
      type: 'object',
      properties: {
        dogId: { type: 'string', description: 'Dog ID' }
      },
      required: ['dogId']
    }
  },
  suggestProducts: {
    description: 'Suggest relevant products based on dog needs',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Product category' },
        dogProfile: { type: 'object', description: 'Dog profile data' },
        needs: { type: 'array', items: { type: 'string' }, description: 'Specific needs' }
      },
      required: ['category']
    }
  },
  createReminder: {
    description: 'Create a health or care reminder',
    parameters: {
      type: 'object',
      properties: {
        dogId: { type: 'string', description: 'Dog ID' },
        type: { type: 'string', enum: ['vaccination', 'medication', 'grooming', 'feeding'] },
        title: { type: 'string', description: 'Reminder title' },
        description: { type: 'string', description: 'Reminder description' },
        dueDate: { type: 'string', description: 'Due date (ISO string)' },
        recurring: { type: 'boolean', description: 'Is recurring' },
        frequency: { type: 'string', description: 'Frequency if recurring' }
      },
      required: ['dogId', 'type', 'title', 'dueDate']
    }
  },
  createMission: {
    description: 'Create a SMART mission for the user',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Mission title' },
        description: { type: 'string', description: 'Mission description' },
        category: { type: 'string', description: 'Mission category' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        objectives: { type: 'array', items: { type: 'object' }, description: 'Mission objectives' },
        xpReward: { type: 'number', description: 'XP reward' },
        pointsReward: { type: 'number', description: 'Points reward' }
      },
      required: ['title', 'description', 'category']
    }
  },
  logAdverseEvent: {
    description: 'Log an adverse event or concerning symptom',
    parameters: {
      type: 'object',
      properties: {
        dogId: { type: 'string', description: 'Dog ID' },
        symptoms: { type: 'array', items: { type: 'string' }, description: 'Observed symptoms' },
        severity: { type: 'string', enum: ['mild', 'moderate', 'severe', 'emergency'] },
        description: { type: 'string', description: 'Detailed description' },
        requiresUrgentCare: { type: 'boolean', description: 'Requires immediate veterinary care' }
      },
      required: ['dogId', 'symptoms', 'severity']
    }
  }
};

// Red flag keywords that trigger urgent responses
const RED_FLAG_KEYWORDS = [
  'dispnea', 'collasso', 'convulsioni', 'convulsione', 'seizure', 'svenimento',
  'difficoltà respiratorie', 'sangue nelle feci', 'sangue nelle urine', 'vomito sangue',
  'non mangia da giorni', 'non beve', 'letargia estrema', 'dolore intenso',
  'gonfiore addome', 'torsione gastrica', 'intossicazione', 'avvelenamento',
  'temperature alta', 'febbre alta', 'ipotermia', 'shock', 'paralisi'
];

export const chatWithAgent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const validatedData = chatRequestSchema.parse(req.body);

    // Check rate limits
    const canProceed = await checkRateLimit(userId, validatedData.agentType);
    if (!canProceed) {
      return res.status(429).json({
        error: 'Limite di messaggi raggiunto per oggi',
        retryAfter: 3600 // 1 hour
      });
    }

    // Get or create conversation
    let conversationId = validatedData.conversationId;
    if (!conversationId) {
      conversationId = await createConversation(userId, validatedData.agentType, validatedData.dogId);
    }

    // Check for red flags
    const hasRedFlags = containsRedFlags(validatedData.message);
    const urgentResponse = hasRedFlags;

    // Get dog profile if provided
    let dogProfile = null;
    if (validatedData.dogId) {
      dogProfile = await getDogProfileData(validatedData.dogId, userId);
    }

    // Get conversation history
    const conversationHistory = await getConversationHistory(conversationId);

    // Initialize the appropriate agent
    const agent = await initializeAgent(validatedData.agentType, dogProfile);

    // Prepare context
    const context = {
      userId,
      dogProfile,
      conversationHistory: conversationHistory.slice(-10), // Last 10 messages
      hasRedFlags,
      timestamp: new Date().toISOString(),
      ...validatedData.context
    };

    // Generate response
    const response = await generateAgentResponse(
      agent,
      validatedData.message,
      context,
      validatedData.agentType
    );

    // Process any tool calls
    const toolResults = await processToolCalls(response.toolCalls || [], userId, validatedData.dogId);

    // Save message and response to conversation
    await saveConversationMessage(conversationId, {
      role: 'user',
      content: validatedData.message,
      timestamp: new Date()
    });

    await saveConversationMessage(conversationId, {
      role: 'assistant',
      content: response.content,
      toolCalls: response.toolCalls,
      toolResults,
      urgent: urgentResponse,
      timestamp: new Date()
    });

    // Create inbox message for urgent responses
    if (urgentResponse) {
      await createUrgentInboxMessage(userId, response.content, validatedData.agentType);
    }

    // Update user's AI usage
    await updateAIUsage(userId, validatedData.agentType);

    // Track analytics
    await trackChatEvent(userId, validatedData.agentType, {
      hasRedFlags,
      toolCalls: response.toolCalls?.length || 0,
      conversationId
    });

    res.json({
      conversationId,
      response: response.content,
      urgent: urgentResponse,
      toolResults,
      remainingMessages: await getRemainingMessages(userId, validatedData.agentType)
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dati non validi',
        details: error.errors
      });
    }

    logger.error('Error in AI chat:', error);
    res.status(500).json({ error: 'Errore nel servizio AI' });
  }
};

export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { agentType, limit = 10 } = req.query;

    let query = db.collection('aiConversations')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(parseInt(limit as string, 10));

    if (agentType) {
      query = query.where('agentType', '==', agentType);
    }

    const snapshot = await query.get();
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    res.json({ conversations });

  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Errore nel recuperare le conversazioni' });
  }
};

export const getConversationMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { conversationId } = req.params;

    // Verify ownership
    const conversationDoc = await db.collection('aiConversations').doc(conversationId).get();
    if (!conversationDoc.exists || conversationDoc.data()!.userId !== userId) {
      return res.status(404).json({ error: 'Conversazione non trovata' });
    }

    const messagesSnapshot = await db.collection('aiConversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    res.json({ messages });

  } catch (error) {
    logger.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Errore nel recuperare i messaggi' });
  }
};

export const getAIUsageStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.uid;

    const usageDoc = await db.collection('aiUsage').doc(userId).get();
    const usage = usageDoc.exists ? usageDoc.data() : {
      vet: { daily: 0, monthly: 0 },
      educator: { daily: 0, monthly: 0 },
      groomer: { daily: 0, monthly: 0 },
      lastReset: new Date()
    };

    // Get limits from remote config or defaults
    const limits = {
      vet: { daily: 10, monthly: 100 },
      educator: { daily: 5, monthly: 50 },
      groomer: { daily: 5, monthly: 50 }
    };

    const stats = {
      usage,
      limits,
      remaining: {
        vet: {
          daily: Math.max(0, limits.vet.daily - usage.vet.daily),
          monthly: Math.max(0, limits.vet.monthly - usage.vet.monthly)
        },
        educator: {
          daily: Math.max(0, limits.educator.daily - usage.educator.daily),
          monthly: Math.max(0, limits.educator.monthly - usage.educator.monthly)
        },
        groomer: {
          daily: Math.max(0, limits.groomer.daily - usage.groomer.daily),
          monthly: Math.max(0, limits.groomer.monthly - usage.groomer.monthly)
        }
      }
    };

    res.json(stats);

  } catch (error) {
    logger.error('Error fetching AI usage stats:', error);
    res.status(500).json({ error: 'Errore nel recuperare le statistiche' });
  }
};

// Helper functions

async function checkRateLimit(userId: string, agentType: string): Promise<boolean> {
  const usageDoc = await db.collection('aiUsage').doc(userId).get();
  const usage = usageDoc.exists ? usageDoc.data() : {};

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const agentUsage = usage[agentType] || { daily: 0, monthly: 0, lastReset: new Date() };

  // Reset daily counter if needed
  if (new Date(agentUsage.lastReset).toISOString().split('T')[0] !== today) {
    agentUsage.daily = 0;
  }

  // Reset monthly counter if needed
  if (new Date(agentUsage.lastReset).toISOString().slice(0, 7) !== currentMonth) {
    agentUsage.monthly = 0;
  }

  // Check limits (configurable via Remote Config)
  const limits = {
    vet: { daily: 10, monthly: 100 },
    educator: { daily: 5, monthly: 50 },
    groomer: { daily: 5, monthly: 50 }
  };

  const agentLimits = limits[agentType as keyof typeof limits];
  return agentUsage.daily < agentLimits.daily && agentUsage.monthly < agentLimits.monthly;
}

async function createConversation(userId: string, agentType: string, dogId?: string): Promise<string> {
  const conversationRef = db.collection('aiConversations').doc();
  await conversationRef.set({
    id: conversationRef.id,
    userId,
    agentType,
    dogId,
    title: `Conversazione con ${getAgentName(agentType)}`,
    messageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return conversationRef.id;
}

function containsRedFlags(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return RED_FLAG_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

async function getDogProfileData(dogId: string, userId: string) {
  const dogDoc = await db.collection('dogs').doc(dogId).get();
  if (!dogDoc.exists || dogDoc.data()!.ownerId !== userId) {
    return null;
  }

  return {
    id: dogDoc.id,
    ...dogDoc.data()
  };
}

async function getConversationHistory(conversationId: string) {
  const messagesSnapshot = await db.collection('aiConversations')
    .doc(conversationId)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .get();

  return messagesSnapshot.docs.map(doc => doc.data()).reverse();
}

async function initializeAgent(agentType: string, dogProfile: any): Promise<GenerativeModel> {
  const systemPrompts = {
    vet: getVetPrompt(dogProfile),
    educator: getEducatorPrompt(dogProfile),
    groomer: getGroomerPrompt(dogProfile)
  };

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: systemPrompts[agentType as keyof typeof systemPrompts],
    tools: [{
      functionDeclarations: Object.entries(AVAILABLE_TOOLS).map(([name, config]) => ({
        name,
        description: config.description,
        parameters: config.parameters
      }))
    }],
    safetySettings: [
      {
        category: 'HARM_CATEGORY_MEDICAL',
        threshold: 'BLOCK_NONE' // We handle medical disclaimers manually
      }
    ]
  });

  return model;
}

async function generateAgentResponse(
  agent: GenerativeModel,
  message: string,
  context: any,
  agentType: string
): Promise<{ content: string; toolCalls?: any[] }> {
  const chat = agent.startChat({
    history: context.conversationHistory.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
  });

  const result = await chat.sendMessage(message);
  const response = result.response;

  let content = response.text();
  let toolCalls: any[] = [];

  // Handle function calls
  if (response.functionCalls) {
    toolCalls = response.functionCalls.map((call: any) => ({
      name: call.name,
      args: call.args
    }));
  }

  // Add safety disclaimers for vet agent
  if (agentType === 'vet' && !content.includes('URGENTE')) {
    if (context.hasRedFlags) {
      content = `🚨 URGENTE: I sintomi descritti potrebbero richiedere attenzione veterinaria immediata. Contatta subito il tuo veterinario o una clinica di emergenza.\n\n${content}`;
    } else {
      content += '\n\n⚠️ Disclaimer: Questo è un supporto informativo. Non sostituisce una visita veterinaria professionale.';
    }
  }

  // Add conflict of interest note for product suggestions
  if (content.includes('PiuCane') || toolCalls.some(call => call.name === 'suggestProducts')) {
    content += '\n\n💡 Nota: Alcuni prodotti suggeriti sono del brand PiuCane. Questa informazione è fornita per trasparenza.';
  }

  return { content, toolCalls };
}

async function processToolCalls(toolCalls: any[], userId: string, dogId?: string) {
  const results = [];

  for (const call of toolCalls) {
    try {
      let result;

      switch (call.name) {
        case 'getDogProfile':
          result = await getDogProfileData(call.args.dogId, userId);
          break;

        case 'suggestProducts':
          result = await suggestProducts(call.args);
          break;

        case 'createReminder':
          result = await createReminder(userId, call.args);
          break;

        case 'createMission':
          result = await createMission(userId, call.args);
          break;

        case 'logAdverseEvent':
          result = await logAdverseEvent(userId, call.args);
          break;

        default:
          result = { error: 'Tool not found' };
      }

      results.push({
        tool: call.name,
        args: call.args,
        result
      });

    } catch (error) {
      logger.error(`Error executing tool ${call.name}:`, error);
      results.push({
        tool: call.name,
        args: call.args,
        error: error.message
      });
    }
  }

  return results;
}

async function saveConversationMessage(conversationId: string, message: any) {
  const messageRef = db.collection('aiConversations')
    .doc(conversationId)
    .collection('messages')
    .doc();

  await messageRef.set({
    id: messageRef.id,
    ...message
  });

  // Update conversation metadata
  await db.collection('aiConversations').doc(conversationId).update({
    messageCount: db.FieldValue.increment(1),
    updatedAt: new Date(),
    lastMessage: message.content.substring(0, 100)
  });
}

async function createUrgentInboxMessage(userId: string, content: string, agentType: string) {
  const inboxRef = db.collection('inbox').doc(userId).collection('messages').doc();
  await inboxRef.set({
    id: inboxRef.id,
    type: 'ai_urgent',
    title: `🚨 Messaggio urgente dal ${getAgentName(agentType)}`,
    content,
    read: false,
    channel: 'ai',
    priority: 'urgent',
    templateKey: 'ai_urgent_response',
    metadata: {
      agentType,
      requiresAction: true
    },
    createdAt: new Date()
  });
}

async function updateAIUsage(userId: string, agentType: string) {
  const usageRef = db.collection('aiUsage').doc(userId);
  const today = new Date().toISOString().split('T')[0];

  await db.runTransaction(async (transaction) => {
    const usageDoc = await transaction.get(usageRef);
    const usage = usageDoc.exists ? usageDoc.data() : {};

    const agentUsage = usage[agentType] || { daily: 0, monthly: 0, lastReset: new Date() };

    // Reset counters if needed
    if (new Date(agentUsage.lastReset).toISOString().split('T')[0] !== today) {
      agentUsage.daily = 0;
    }

    agentUsage.daily += 1;
    agentUsage.monthly += 1;
    agentUsage.lastReset = new Date();

    usage[agentType] = agentUsage;
    transaction.set(usageRef, usage, { merge: true });
  });
}

async function trackChatEvent(userId: string, agentType: string, metadata: any) {
  // This would integrate with your analytics system
  logger.info('AI chat event', {
    userId,
    agentType,
    ...metadata,
    timestamp: new Date()
  });
}

async function getRemainingMessages(userId: string, agentType: string): Promise<number> {
  const usageDoc = await db.collection('aiUsage').doc(userId).get();
  const usage = usageDoc.exists ? usageDoc.data() : {};
  const agentUsage = usage[agentType] || { daily: 0 };

  const limits = { vet: 10, educator: 5, groomer: 5 };
  return Math.max(0, limits[agentType as keyof typeof limits] - agentUsage.daily);
}

// Tool implementation functions
async function suggestProducts(args: any) {
  const productsSnapshot = await db.collection('products')
    .where('category', '==', args.category)
    .where('isActive', '==', true)
    .limit(3)
    .get();

  return productsSnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    price: doc.data().price,
    description: doc.data().description
  }));
}

async function createReminder(userId: string, args: any) {
  const reminderRef = db.collection('reminders').doc();
  await reminderRef.set({
    id: reminderRef.id,
    userId,
    ...args,
    completed: false,
    createdAt: new Date(),
    createdBy: 'ai_agent'
  });

  return { id: reminderRef.id, created: true };
}

async function createMission(userId: string, args: any) {
  const missionRef = db.collection('userMissions').doc();
  await missionRef.set({
    id: missionRef.id,
    userId,
    status: 'available',
    progress: {},
    createdAt: new Date(),
    createdBy: 'ai_agent',
    ...args
  });

  return { id: missionRef.id, created: true };
}

async function logAdverseEvent(userId: string, args: any) {
  const eventRef = db.collection('adverseEvents').doc();
  await eventRef.set({
    id: eventRef.id,
    userId,
    ...args,
    reportedAt: new Date(),
    status: 'pending_review',
    createdBy: 'ai_agent'
  });

  return { id: eventRef.id, logged: true };
}

// Agent prompt templates
function getVetPrompt(dogProfile: any): string {
  return `
Sei un assistente veterinario AI di PiuCane. Il tuo ruolo è fornire supporto informativo sui cani, NON fare diagnosi o prescrivere terapie.

REGOLE FONDAMENTALI:
1. NON fornire diagnosi mediche specifiche
2. NON prescrivere farmaci o dosaggi
3. Per sintomi gravi o red flags, raccomanda SEMPRE visita veterinaria urgente
4. Fornisci informazioni educative generali sulla salute canina
5. Suggerisci quando consultare un veterinario
6. Usa i tool disponibili quando appropriato

RED FLAGS che richiedono cure urgenti:
- Difficoltà respiratorie, dispnea
- Collasso, convulsioni
- Vomito/diarrea con sangue
- Gonfiore addominale improvviso
- Letargia estrema, perdita di coscienza
- Dolore intenso, paralisi
- Segni di intossicazione

${dogProfile ? `
PROFILO CANE:
- Nome: ${dogProfile.name}
- Razza: ${dogProfile.breed}
- Età: ${dogProfile.age || 'Non specificata'}
- Peso: ${dogProfile.weight || 'Non specificato'}kg
- Condizioni note: ${dogProfile.healthConditions?.join(', ') || 'Nessuna'}
` : ''}

Rispondi sempre in italiano, con tono professionale ma comprensibile. Se suggerisci prodotti PiuCane, dichiara il conflitto d'interesse.
`;
}

function getEducatorPrompt(dogProfile: any): string {
  return `
Sei un educatore cinofilo AI di PiuCane. Aiuti i proprietari con addestramento, comportamento e missioni SMART per migliorare la relazione uomo-cane.

FOCUS PRINCIPALE:
1. Addestramento positivo e rinforzo
2. Risoluzione problemi comportamentali
3. Creazione di missioni SMART personalizzate
4. Socializzazione e benessere comportamentale
5. Suggerimenti per attività e giochi

PRINCIPI:
- Solo metodi basati su rinforzo positivo
- No punizioni fisiche o dominanza
- Approccio scientifico e rispettoso
- Personalizzazione basata su razza, età, carattere

${dogProfile ? `
PROFILO CANE:
- Nome: ${dogProfile.name}
- Razza: ${dogProfile.breed}
- Età: ${dogProfile.age || 'Non specificata'}
- Livello attività: ${dogProfile.activityLevel || 'Non specificato'}
- Caratteristiche comportamentali: ${dogProfile.behaviorNotes || 'Da valutare'}
` : ''}

Crea missioni specifiche, misurabili e raggiungibili. Usa i tool per creare reminder e missioni quando appropriato.
`;
}

function getGroomerPrompt(dogProfile: any): string {
  return `
Sei un groomer professionale AI di PiuCane. Fornisci consigli su toelettatura, igiene e cura del mantello specifici per ogni razza.

AREE DI COMPETENZA:
1. Routine di spazzolatura per tipo di mantello
2. Frequenza bagni e prodotti appropriati
3. Cura di unghie, orecchie, denti
4. Prevenzione nodi e problemi dermatologici
5. Consigli stagionali per la cura

APPROCCIO:
- Personalizzazione per razza e tipo di pelo
- Tecniche graduali per cani sensibili
- Prodotti sicuri e specifici
- Segnali di problemi che richiedono veterinario

${dogProfile ? `
PROFILO CANE:
- Nome: ${dogProfile.name}
- Razza: ${dogProfile.breed}
- Tipo mantello: ${dogProfile.coatType || 'Da valutare'}
- Sensibilità: ${dogProfile.groomingSensitivity || 'Non specificate'}
- Ultima toelettatura: ${dogProfile.lastGrooming || 'Non registrata'}
` : ''}

Suggerisci routine personalizzate e crea reminder per la cura. Se noti problemi della pelle, raccomanda consultazione veterinaria.
`;
}

function getAgentName(agentType: string): string {
  const names = {
    vet: 'Veterinario',
    educator: 'Educatore Cinofilo',
    groomer: 'Groomer'
  };
  return names[agentType as keyof typeof names] || agentType;
}
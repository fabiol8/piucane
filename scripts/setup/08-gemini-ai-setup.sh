#!/bin/bash

# PiuCane Gemini AI Setup Script
# Configura Google AI Studio, Gemini API, AI agents

set -e

echo "🤖 PiuCane Gemini AI Setup Starting..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Installing..."
    curl https://sdk.cloud.google.com | bash
    source ~/.bashrc
fi

echo "⚠️ Manual Google AI Studio Setup Required:"
echo "1. Go to https://makersuite.google.com/"
echo "2. Create new project or select existing"
echo "3. Generate API key for Gemini"
echo "4. Set environment variable:"
echo "   export GEMINI_API_KEY='your-api-key-here'"
echo ""

# Check if API key is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "🔑 Please set GEMINI_API_KEY environment variable and run script again"
    echo "   export GEMINI_API_KEY='your-gemini-api-key'"
    exit 1
fi

# Test API key
echo "🔐 Testing Gemini API key..."
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY")

if [ "$response" != "200" ]; then
    echo "❌ Invalid Gemini API key. Please check your key."
    exit 1
fi

echo "✅ Gemini API key verified!"

# Enable required Google Cloud APIs
PROJECT_ID="piucane-prod"
gcloud config set project $PROJECT_ID

echo "🔌 Enabling Google Cloud AI APIs..."
gcloud services enable aiplatform.googleapis.com
gcloud services enable ml.googleapis.com
gcloud services enable language.googleapis.com

# Create AI service utility
echo "🧠 Creating AI service utilities..."

cat > packages/lib/src/ai/gemini-service.ts << 'EOF'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface AIAgent {
  name: string;
  systemPrompt: string;
  tools: string[];
  safetySettings: any[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  metadata: {
    tokensUsed: number;
    responseTime: number;
    agentUsed: string;
  };
}

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  result?: any;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private agents: Map<string, AIAgent>;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.agents = new Map();
    this.initializeAgents();
  }

  private initializeAgents() {
    // Vet Agent
    this.agents.set('vet', {
      name: 'Dr. AI Veterinario',
      systemPrompt: `Sei un assistente veterinario AI specializzato in cani. Il tuo ruolo è fornire:

COSA PUOI FARE:
- Informazioni generali sulla salute canina
- Consigli preventivi e di benessere
- Triage iniziale dei sintomi (NON diagnosi)
- Consigli su quando consultare un veterinario
- Informazioni su razze, alimentazione, comportamento

COSA NON PUOI FARE:
- NON fare diagnosi mediche
- NON prescrivere farmaci
- NON sostituire la visita veterinaria
- NON dare consigli su emergenze (dire sempre di chiamare veterinario)

LINEE GUIDA:
- Consiglia SEMPRE di consultare un veterinario per problemi di salute
- Segnala situazioni urgenti che richiedono intervento immediato
- Usa linguaggio chiaro e comprensibile
- Mantieni tono professionale ma rassicurante
- Se in dubbio, raccomanda sempre consulto veterinario

Tools disponibili: getDogProfile, logAdverseEvent, suggestVetVisit`,
      tools: ['getDogProfile', 'logAdverseEvent', 'suggestVetVisit'],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_MEDICAL,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Educator Agent
    this.agents.set('educator', {
      name: 'Educatore Cinofilo AI',
      systemPrompt: `Sei un educatore cinofilo specializzato in training positivo e comportamento canino.

SPECIALIZZAZIONI:
- Addestramento con rinforzo positivo
- Risoluzione problemi comportamentali
- Socializzazione e benessere psicologico
- Creazione missioni SMART personalizzate
- Consigli su routine quotidiane

PRINCIPI FONDAMENTALI:
- SOLO metodi di addestramento positivi
- VIETATO qualsiasi metodo punitivo o violento
- Enfasi su pazienza, coerenza, rinforzo positivo
- Considerare sempre il benessere del cane
- Missioni graduali e appropriate all'età/carattere

Tools disponibili: getDogProfile, createMission, logBehaviorProgress`,
      tools: ['getDogProfile', 'createMission', 'logBehaviorProgress'],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Groomer Agent
    this.agents.set('groomer', {
      name: 'Groomer Professionale AI',
      systemPrompt: `Sei un groomer professionale specializzato nella cura del mantello e igiene canina.

EXPERTISE:
- Routine di spazzolatura per ogni tipo di pelo
- Prodotti specifici per mantello e pelle
- Tecniche di toelettatura sicure
- Prevenzione problemi dermatologici
- Consigli stagionali per la cura

SAFETY FIRST:
- Sempre verificare allergie e sensibilità
- Raccomandare test patch per nuovi prodotti
- Segnalare problemi cutanei che richiedono vet
- Enfasi su prodotti naturali e sicuri
- Tecniche appropriate per età e temperamento

Tools disponibili: getDogProfile, suggestProducts, createGroomingSchedule`,
      tools: ['getDogProfile', 'suggestProducts', 'createGroomingSchedule'],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
    });
  }

  async chatWithAgent(
    agentType: 'vet' | 'educator' | 'groomer',
    messages: ChatMessage[],
    context?: {
      dogProfile?: any;
      userId?: string;
    }
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const agent = this.agents.get(agentType);

    if (!agent) {
      throw new Error(`Agent ${agentType} not found`);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-pro',
        safetySettings: agent.safetySettings,
      });

      // Prepare conversation history
      const chatHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      // Add system prompt and context
      const systemMessage = {
        role: 'user',
        parts: [{
          text: `${agent.systemPrompt}\n\nContesto utente:\n${context ? JSON.stringify(context, null, 2) : 'Nessun contesto disponibile'}`
        }],
      };

      const chat = model.startChat({
        history: [systemMessage, ...chatHistory.slice(0, -1)],
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;

      const responseTime = Date.now() - startTime;

      return {
        content: response.text(),
        metadata: {
          tokensUsed: response.promptFeedback?.tokenCount || 0,
          responseTime,
          agentUsed: agentType,
        },
      };
    } catch (error) {
      console.error(`Error with ${agentType} agent:`, error);
      throw new Error(`AI agent error: ${error.message}`);
    }
  }

  async generateSmartMission(
    dogProfile: any,
    behaviorGoal: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<any> {
    const agent = this.agents.get('educator');

    const prompt = `Crea una missione SMART per il cane con questo profilo:
${JSON.stringify(dogProfile, null, 2)}

Obiettivo comportamentale: ${behaviorGoal}
Difficoltà: ${difficulty}

La missione deve essere:
- Specific (specifica)
- Measurable (misurabile)
- Achievable (raggiungibile)
- Relevant (rilevante)
- Time-bound (con scadenza)

Formato risposta JSON:
{
  "title": "Titolo missione",
  "description": "Descrizione dettagliata",
  "steps": ["passo 1", "passo 2", "passo 3"],
  "duration": "durata stimata",
  "difficulty": "${difficulty}",
  "xpReward": numero_xp,
  "checkpoints": ["checkpoint 1", "checkpoint 2"]
}`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      return JSON.parse(response.text());
    } catch (error) {
      console.error('Error generating mission:', error);
      throw error;
    }
  }

  async moderateContent(content: string): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-pro',
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
          },
        ],
      });

      const result = await model.generateContent(`Analizza questo contenuto per contenuti inappropriati: "${content}". Rispondi solo "SAFE" o "UNSAFE".`);
      const response = await result.response;

      return response.text().trim() === 'SAFE';
    } catch (error) {
      console.error('Content moderation error:', error);
      return false; // Default to unsafe if moderation fails
    }
  }
}
EOF

# Create AI API endpoints
cat > api/src/modules/ai/controller.ts << 'EOF'
import { Request, Response } from 'express';
import { GeminiService } from '@piucane/lib/ai/gemini-service';
import { AuthenticatedRequest } from '../../middleware/auth';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';

const geminiService = new GeminiService(process.env.GEMINI_API_KEY!);

export const chatWithVet = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user!.uid;

    // Get user's dog profile
    const dogsSnapshot = await db.collection('dogs')
      .where('ownerId', '==', userId)
      .limit(1)
      .get();

    const dogProfile = dogsSnapshot.empty ? null : dogsSnapshot.docs[0].data();

    // Get conversation history
    let messages = [];
    if (conversationId) {
      const conversationDoc = await db.collection('ai_conversations')
        .doc(conversationId)
        .get();

      if (conversationDoc.exists) {
        messages = conversationDoc.data()?.messages || [];
      }
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Get AI response
    const aiResponse = await geminiService.chatWithAgent('vet', messages, {
      dogProfile,
      userId
    });

    // Add AI response to messages
    messages.push({
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date()
    });

    // Save conversation
    const conversationRef = conversationId
      ? db.collection('ai_conversations').doc(conversationId)
      : db.collection('ai_conversations').doc();

    await conversationRef.set({
      userId,
      agentType: 'vet',
      messages,
      lastActivity: new Date(),
      metadata: aiResponse.metadata
    }, { merge: true });

    // Log for QA
    await db.collection('ai_logs').add({
      userId,
      agentType: 'vet',
      userMessage: message,
      aiResponse: aiResponse.content,
      metadata: aiResponse.metadata,
      timestamp: new Date(),
      tags: [] // Will be populated by moderation
    });

    res.json({
      response: aiResponse.content,
      conversationId: conversationRef.id,
      metadata: aiResponse.metadata
    });
  } catch (error) {
    logger.error('Error in vet chat:', error);
    res.status(500).json({ error: 'AI service error' });
  }
};

export const chatWithEducator = async (req: AuthenticatedRequest, res: Response) => {
  // Similar implementation for educator agent
  try {
    const { message, conversationId } = req.body;
    const userId = req.user!.uid;

    const dogsSnapshot = await db.collection('dogs')
      .where('ownerId', '==', userId)
      .limit(1)
      .get();

    const dogProfile = dogsSnapshot.empty ? null : dogsSnapshot.docs[0].data();

    let messages = [];
    if (conversationId) {
      const conversationDoc = await db.collection('ai_conversations')
        .doc(conversationId)
        .get();

      if (conversationDoc.exists) {
        messages = conversationDoc.data()?.messages || [];
      }
    }

    messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    const aiResponse = await geminiService.chatWithAgent('educator', messages, {
      dogProfile,
      userId
    });

    messages.push({
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date()
    });

    const conversationRef = conversationId
      ? db.collection('ai_conversations').doc(conversationId)
      : db.collection('ai_conversations').doc();

    await conversationRef.set({
      userId,
      agentType: 'educator',
      messages,
      lastActivity: new Date(),
      metadata: aiResponse.metadata
    }, { merge: true });

    res.json({
      response: aiResponse.content,
      conversationId: conversationRef.id,
      metadata: aiResponse.metadata
    });
  } catch (error) {
    logger.error('Error in educator chat:', error);
    res.status(500).json({ error: 'AI service error' });
  }
};

export const generateMission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { behaviorGoal, difficulty = 'medium' } = req.body;
    const userId = req.user!.uid;

    const dogsSnapshot = await db.collection('dogs')
      .where('ownerId', '==', userId)
      .limit(1)
      .get();

    if (dogsSnapshot.empty) {
      return res.status(400).json({ error: 'Dog profile required' });
    }

    const dogProfile = dogsSnapshot.docs[0].data();

    const mission = await geminiService.generateSmartMission(
      dogProfile,
      behaviorGoal,
      difficulty
    );

    // Save mission
    const missionRef = await db.collection('missions').add({
      ...mission,
      userId,
      dogId: dogsSnapshot.docs[0].id,
      status: 'active',
      createdAt: new Date(),
      aiGenerated: true
    });

    res.json({
      mission: { id: missionRef.id, ...mission }
    });
  } catch (error) {
    logger.error('Error generating mission:', error);
    res.status(500).json({ error: 'Mission generation error' });
  }
};
EOF

# Update AI routes
cat > api/src/modules/ai/routes.ts << 'EOF'
import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { chatWithVet, chatWithEducator, generateMission } from './controller';

const router = express.Router();

router.post('/vet-chat', authMiddleware, chatWithVet);
router.post('/educator-chat', authMiddleware, chatWithEducator);
router.post('/groomer-chat', authMiddleware, chatWithEducator); // Will implement separately
router.post('/generate-mission', authMiddleware, generateMission);

export default router;
EOF

# Create AI monitoring and safety scripts
cat > scripts/maintenance/ai-monitoring.js << 'EOF'
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function monitorAIUsage() {
  console.log('🤖 AI Usage Monitoring Report');
  console.log('=====================================');

  // Total conversations by agent
  const agentStats = await db.collection('ai_logs')
    .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24h
    .get();

  const stats = {
    vet: 0,
    educator: 0,
    groomer: 0,
    totalTokens: 0,
    avgResponseTime: 0
  };

  let totalResponseTime = 0;
  let responseCount = 0;

  agentStats.docs.forEach(doc => {
    const data = doc.data();
    stats[data.agentType]++;
    stats.totalTokens += data.metadata?.tokensUsed || 0;

    if (data.metadata?.responseTime) {
      totalResponseTime += data.metadata.responseTime;
      responseCount++;
    }
  });

  stats.avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

  console.log('📊 Usage Statistics (Last 24h):');
  console.log(`  Vet Agent: ${stats.vet} conversations`);
  console.log(`  Educator Agent: ${stats.educator} conversations`);
  console.log(`  Groomer Agent: ${stats.groomer} conversations`);
  console.log(`  Total Tokens: ${stats.totalTokens.toLocaleString()}`);
  console.log(`  Avg Response Time: ${Math.round(stats.avgResponseTime)}ms`);

  // Check for flagged content
  const flaggedContent = await db.collection('ai_logs')
    .where('tags', 'array-contains', 'urgent')
    .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
    .get();

  if (!flaggedContent.empty) {
    console.log('\n⚠️ Flagged Content (Requires Review):');
    flaggedContent.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  User: ${data.userId}, Agent: ${data.agentType}, Time: ${data.timestamp.toDate()}`);
    });
  }

  console.log('\n✅ Monitoring completed');
}

monitorAIUsage().catch(console.error);
EOF

# Create safety configuration
cat > config/ai-safety.json << 'EOF'
{
  "harmCategories": {
    "HARM_CATEGORY_MEDICAL": {
      "threshold": "BLOCK_MEDIUM_AND_ABOVE",
      "action": "redirect_to_vet"
    },
    "HARM_CATEGORY_DANGEROUS_CONTENT": {
      "threshold": "BLOCK_LOW_AND_ABOVE",
      "action": "block_and_log"
    }
  },
  "contentFilters": {
    "veterinaryAdvice": {
      "blocked_phrases": [
        "diagnosi",
        "prescrivere",
        "farmaco",
        "medicina"
      ],
      "redirect_message": "Per questioni mediche specifiche, ti consiglio di consultare un veterinario qualificato."
    },
    "harmfulTraining": {
      "blocked_phrases": [
        "punizione",
        "violenza",
        "dolore",
        "paura"
      ],
      "redirect_message": "Raccomandiamo solo metodi di addestramento positivi e rispettosi del benessere del cane."
    }
  },
  "monitoring": {
    "log_all_conversations": true,
    "flag_keywords": ["urgente", "emergenza", "male", "sangue", "dolore"],
    "review_threshold": 0.7
  }
}
EOF

# Save Gemini configuration
cat > .env.gemini << EOF
# Gemini AI Configuration
GEMINI_API_KEY=$GEMINI_API_KEY
GEMINI_MODEL=gemini-pro
GEMINI_PROJECT_ID=$PROJECT_ID

# AI Safety Settings
AI_CONTENT_MODERATION=true
AI_LOG_CONVERSATIONS=true
AI_REVIEW_THRESHOLD=0.7

# Rate Limiting
AI_REQUESTS_PER_MINUTE=60
AI_TOKENS_PER_DAY=100000
EOF

echo "✅ Gemini AI setup completed!"
echo "📋 Configuration saved to .env.gemini"
echo "🤖 AI Agents configured:"
echo "   - Vet Agent: Medical triage and health advice"
echo "   - Educator Agent: Positive training and missions"
echo "   - Groomer Agent: Coat care and grooming tips"
echo ""
echo "📋 Next steps:"
echo "1. Test AI agents with sample conversations"
echo "2. Monitor AI logs for quality assurance"
echo "3. Configure rate limiting and usage quotas"
echo "4. Set up automated safety monitoring"
echo "5. Train team on AI agent capabilities and limitations"
echo ""
echo "⚠️ Safety reminders:"
echo "- AI agents are assistants, not replacements for professionals"
echo "- Always direct medical emergencies to veterinarians"
echo "- Monitor conversations for quality and safety"
echo "- Respect user privacy and data protection"
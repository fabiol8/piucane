import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { db } from '../config/firebase';
import { z } from 'zod';

const router = Router();

const chatMessageSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  context: z.object({
    dogId: z.string().optional(),
    orderId: z.string().optional(),
    subscriptionId: z.string().optional(),
    productId: z.string().optional()
  }).optional()
});

const feedbackSchema = z.object({
  messageId: z.string(),
  rating: z.enum(['positive', 'negative']),
  feedback: z.string().optional()
});

router.post('/message', auth, requireAuth, validateBody(chatMessageSchema), async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;

    // Get or create chat session
    let session;
    if (sessionId) {
      const sessionDoc = await db.collection('chatSessions').doc(sessionId).get();
      if (sessionDoc.exists && sessionDoc.data()?.userId === req.user!.uid) {
        session = { id: sessionDoc.id, ...sessionDoc.data() };
      } else {
        return res.status(404).json({ error: 'Chat session not found' });
      }
    } else {
      // Create new session
      const sessionData = {
        userId: req.user!.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
        context: context || {}
      };
      const sessionRef = await db.collection('chatSessions').add(sessionData);
      session = { id: sessionRef.id, ...sessionData };
    }

    // Get user context for personalized responses
    const userContext = await getUserContext(req.user!.uid, context);

    // Store user message
    const userMessageData = {
      sessionId: session.id,
      userId: req.user!.uid,
      content: message,
      type: 'user',
      createdAt: new Date()
    };
    const userMessageRef = await db.collection('chatMessages').add(userMessageData);

    // Generate AI response
    const aiResponse = await generateAIResponse(message, userContext, session.context);

    // Store AI response
    const aiMessageData = {
      sessionId: session.id,
      userId: req.user!.uid,
      content: aiResponse.content,
      type: 'assistant',
      suggestions: aiResponse.suggestions || [],
      actions: aiResponse.actions || [],
      createdAt: new Date()
    };
    const aiMessageRef = await db.collection('chatMessages').add(aiMessageData);

    // Update session
    await db.collection('chatSessions').doc(session.id).update({
      updatedAt: new Date(),
      messageCount: session.messageCount + 2,
      lastMessage: message
    });

    res.json({
      sessionId: session.id,
      userMessage: {
        id: userMessageRef.id,
        ...userMessageData
      },
      aiMessage: {
        id: aiMessageRef.id,
        ...aiMessageData
      }
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

router.get('/sessions', auth, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const snapshot = await db.collection('chatSessions')
      .where('userId', '==', req.user!.uid)
      .orderBy('updatedAt', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum)
      .get();

    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: sessions.length === limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

router.get('/sessions/:id/messages', auth, requireAuth, async (req, res) => {
  try {
    // Verify session ownership
    const sessionDoc = await db.collection('chatSessions').doc(req.params.id).get();
    if (!sessionDoc.exists || sessionDoc.data()?.userId !== req.user!.uid) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const messagesSnapshot = await db.collection('chatMessages')
      .where('sessionId', '==', req.params.id)
      .orderBy('createdAt', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

router.post('/feedback', auth, requireAuth, validateBody(feedbackSchema), async (req, res) => {
  try {
    const { messageId, rating, feedback } = req.body;

    // Verify message ownership
    const messageDoc = await db.collection('chatMessages').doc(messageId).get();
    if (!messageDoc.exists || messageDoc.data()?.userId !== req.user!.uid) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const feedbackData = {
      messageId,
      userId: req.user!.uid,
      rating,
      feedback: feedback || '',
      createdAt: new Date()
    };

    await db.collection('chatFeedback').add(feedbackData);

    // Update message with feedback
    await db.collection('chatMessages').doc(messageId).update({
      feedback: {
        rating,
        feedback: feedback || ''
      }
    });

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.get('/suggestions', auth, requireAuth, async (req, res) => {
  try {
    const { dogId, context } = req.query;

    const userContext = await getUserContext(req.user!.uid, { dogId: dogId as string });
    const suggestions = await generateContextualSuggestions(userContext, context as string);

    res.json({ suggestions });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

async function getUserContext(userId: string, context?: any) {
  try {
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};

    // Get user's dogs
    const dogsSnapshot = await db.collection('dogs').where('userId', '==', userId).get();
    const dogs = dogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get recent orders
    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    const recentOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get active subscriptions
    const subscriptionsSnapshot = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    const activeSubscriptions = subscriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get specific context data
    let contextData = {};
    if (context?.dogId) {
      const dogDoc = await db.collection('dogs').doc(context.dogId).get();
      if (dogDoc.exists) {
        contextData = { selectedDog: { id: dogDoc.id, ...dogDoc.data() } };
      }
    }

    return {
      user: userData,
      dogs,
      recentOrders,
      activeSubscriptions,
      ...contextData
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return {};
  }
}

async function generateAIResponse(message: string, userContext: any, sessionContext: any) {
  try {
    // This is a simplified AI response generator
    // In a real implementation, you would integrate with services like OpenAI, Gemini, etc.

    const response = await generateResponseWithGemini(message, userContext, sessionContext);

    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      content: "Mi dispiace, sto riscontrando difficoltà tecniche. Puoi riprovare tra poco o contattare il nostro supporto per assistenza immediata.",
      suggestions: [
        "Contatta il supporto",
        "Riprova più tardi",
        "Visualizza FAQ"
      ]
    };
  }
}

async function generateResponseWithGemini(message: string, userContext: any, sessionContext: any) {
  // Simplified Gemini integration
  const systemPrompt = `Sei un assistente virtuale specializzato in salute e benessere dei cani per l'app PiùCane.

Contesto utente:
- Cani registrati: ${userContext.dogs?.length || 0}
- Ordini recenti: ${userContext.recentOrders?.length || 0}
- Abbonamenti attivi: ${userContext.activeSubscriptions?.length || 0}

Rispondi in modo:
- Amichevole e professionale
- Specifico per il contesto del cane
- Con suggerimenti pratici
- Includendo azioni quando appropriato

Se l'utente chiede informazioni su prodotti, salute del cane, ordini o abbonamenti, fornisci informazioni dettagliate e suggerimenti utili.`;

  // In a real implementation, you would call the Gemini API here
  // For now, we'll provide rule-based responses

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('cibo') || lowerMessage.includes('alimentazione')) {
    return {
      content: "Per l'alimentazione del tuo cane, è importante considerare età, peso, attività fisica e eventuali allergie. Posso aiutarti a trovare il prodotto più adatto!",
      suggestions: [
        "Mostra prodotti consigliati",
        "Calcola porzioni giornaliere",
        "Gestisci allergenie"
      ],
      actions: [
        { type: 'navigate', target: '/shop', label: 'Visualizza prodotti' }
      ]
    };
  }

  if (lowerMessage.includes('peso') || lowerMessage.includes('dieta')) {
    return {
      content: "Il controllo del peso è fondamentale per la salute del cane. Posso aiutarti a monitorare il peso e suggerire un piano alimentare personalizzato.",
      suggestions: [
        "Registra peso attuale",
        "Visualizza grafico peso",
        "Consigli per la dieta"
      ],
      actions: [
        { type: 'navigate', target: '/dogs', label: 'Gestisci profilo cane' }
      ]
    };
  }

  if (lowerMessage.includes('ordine') || lowerMessage.includes('consegna')) {
    return {
      content: "Posso aiutarti con informazioni sui tuoi ordini, stato delle consegne e gestione degli abbonamenti. Cosa ti serve sapere?",
      suggestions: [
        "Stato ordini",
        "Prossime consegne",
        "Modifica abbonamento"
      ],
      actions: [
        { type: 'navigate', target: '/orders', label: 'Visualizza ordini' }
      ]
    };
  }

  if (lowerMessage.includes('vaccino') || lowerMessage.includes('veterinario')) {
    return {
      content: "Per le informazioni veterinarie, posso aiutarti a tenere traccia di vaccini, visite e promemoria. È sempre importante consultare il tuo veterinario per consigli medici specifici.",
      suggestions: [
        "Aggiungi promemoria vaccino",
        "Trova veterinari",
        "Storico visite"
      ],
      actions: [
        { type: 'navigate', target: '/veterinary', label: 'Sezione veterinaria' }
      ]
    };
  }

  // Default response
  return {
    content: "Sono qui per aiutarti con tutto quello che riguarda il benessere del tuo cane! Posso rispondere a domande su alimentazione, salute, prodotti e ordini. Come posso aiutarti oggi?",
    suggestions: [
      "Consigli alimentazione",
      "Gestione peso",
      "Prodotti consigliati",
      "Stato ordini"
    ]
  };
}

async function generateContextualSuggestions(userContext: any, context?: string) {
  const suggestions = [];

  // Dog-specific suggestions
  if (userContext.dogs?.length > 0) {
    suggestions.push("Come sta il mio cane oggi?");
    suggestions.push("Consigli per l'alimentazione");
    suggestions.push("Quando è la prossima visita veterinaria?");
  }

  // Order-related suggestions
  if (userContext.recentOrders?.length > 0) {
    suggestions.push("Dov'è il mio ultimo ordine?");
    suggestions.push("Quando arriva la prossima consegna?");
  }

  // Subscription suggestions
  if (userContext.activeSubscriptions?.length > 0) {
    suggestions.push("Modifica il mio abbonamento");
    suggestions.push("Pausa temporanea abbonamento");
  }

  // General suggestions
  suggestions.push("Prodotti in offerta");
  suggestions.push("Calcola porzione giornaliera");
  suggestions.push("Trova un veterinario");

  return suggestions.slice(0, 6); // Limit to 6 suggestions
}

export default router;
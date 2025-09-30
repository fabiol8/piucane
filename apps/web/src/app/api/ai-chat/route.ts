import { NextRequest, NextResponse } from 'next/server';

// Mock AI responses for different agents
const aiResponses = {
  veterinary: [
    "Come veterinario AI, ti consiglio di monitorare questi sintomi. Per una diagnosi accurata, consulta sempre un veterinario di persona.",
    "Interessante osservazione! La salute del tuo cane è importante. Ecco cosa dovresti sapere...",
    "Per la prevenzione, è fondamentale seguire il calendario vaccinale. Ti spiego come...",
    "I sintomi che descrivi potrebbero indicare... Ma ricorda, solo un veterinario può fare una diagnosi definitiva.",
    "La nutrizione gioca un ruolo chiave nella salute. Per il tuo cane consiglio..."
  ],
  trainer: [
    "Ottima domanda! Per correggere questo comportamento, iniziamo con il rinforzo positivo...",
    "Il training richiede pazienza e costanza. Ecco un piano personalizzato per il tuo cane...",
    "La socializzazione è fondamentale! Ti guido passo passo in questo processo...",
    "Per migliorare l'obbedienza, prova questa tecnica che ha sempre funzionato...",
    "L'energia del tuo cane può essere canalizzata positivamente. Ecco come fare..."
  ],
  groomer: [
    "Per il tipo di pelo del tuo cane, ti consiglio questa routine specifica...",
    "La cura quotidiana è essenziale! Ecco una checklist personalizzata...",
    "Gli strumenti giusti fanno la differenza. Per la tua razza consiglio...",
    "L'igiene orale è spesso trascurata. Ti spiego come mantenerla al meglio...",
    "La stagione richiede cure specifiche. Adatta la routine in questo modo..."
  ]
};

const agentProfiles = {
  veterinary: {
    name: 'Dr. Veterinary AI',
    avatar: '🩺',
    specialization: 'Medicina Veterinaria',
    disclaimer: '⚠️ Importante: Non sostituisce il veterinario. In caso di emergenza contatta subito un professionista.'
  },
  trainer: {
    name: 'Trainer AI Pro',
    avatar: '🎾',
    specialization: 'Educazione Cinofila',
    disclaimer: '💡 Consiglio: La costanza è la chiave del successo nel training.'
  },
  groomer: {
    name: 'Groomer AI Expert',
    avatar: '✂️',
    specialization: 'Toelettatura Professionale',
    disclaimer: '⭐ Suggerimento: Ogni razza ha esigenze specifiche di grooming.'
  }
};

// Mock usage tracking
let dailyUsage = {
  veterinary: 12,
  trainer: 8,
  groomer: 5
};

export async function POST(request: NextRequest) {
  try {
    const { message, agent, userId } = await request.json();

    if (!message || !agent) {
      return NextResponse.json(
        { success: false, error: 'Message and agent are required' },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Increment usage counter
    if (dailyUsage[agent as keyof typeof dailyUsage] !== undefined) {
      dailyUsage[agent as keyof typeof dailyUsage]++;
    }

    // Get random response for the agent
    const responses = aiResponses[agent as keyof typeof aiResponses];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    // Add some context based on the message
    let contextualResponse = randomResponse;
    if (message.toLowerCase().includes('sintom') || message.toLowerCase().includes('malat')) {
      contextualResponse = "Capisco la tua preoccupazione per questi sintomi. " + randomResponse;
    } else if (message.toLowerCase().includes('training') || message.toLowerCase().includes('obbedien')) {
      contextualResponse = "Il training è fondamentale per il benessere del cane. " + randomResponse;
    } else if (message.toLowerCase().includes('pelo') || message.toLowerCase().includes('igien')) {
      contextualResponse = "La cura del pelo richiede attenzione quotidiana. " + randomResponse;
    }

    return NextResponse.json({
      success: true,
      data: {
        message: contextualResponse,
        agent: agentProfiles[agent as keyof typeof agentProfiles],
        timestamp: new Date().toISOString(),
        suggestions: [
          'Dimmi di più sui sintomi',
          'Consigli per la prevenzione',
          'Routine quotidiana consigliata'
        ]
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process AI chat' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'usage') {
      return NextResponse.json({
        success: true,
        data: {
          dailyUsage,
          limits: {
            veterinary: 20,
            trainer: 15,
            groomer: 10
          },
          plan: 'Pro',
          totalQuestions: Object.values(dailyUsage).reduce((a, b) => a + b, 0)
        }
      });
    }

    if (action === 'agents') {
      return NextResponse.json({
        success: true,
        data: Object.keys(agentProfiles).map(key => ({
          id: key,
          ...agentProfiles[key as keyof typeof agentProfiles],
          available: dailyUsage[key as keyof typeof dailyUsage] < 20
        }))
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI chat data' },
      { status: 500 }
    );
  }
}
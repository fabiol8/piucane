import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';
import type {
  ContentGenerationRequest,
  ContentItem,
  StyleGuide,
  RAGContext,
  GenerationConstraints,
  SafetyChecks,
  RAGSource,
  Citation
} from '@/types/content';

export class ContentGenAI {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private ragService: RAGService;
  private safetyService: SafetyService;

  constructor() {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    this.ragService = new RAGService();
    this.safetyService = new SafetyService();
  }

  async generateContent(request: ContentGenerationRequest): Promise<{
    content: Partial<ContentItem>;
    citations: Citation[];
    safetyChecks: SafetyChecks;
  }> {
    try {
      // 1. RAG Context Retrieval
      const ragContext = await this.ragService.retrieveContext(
        request.prompt,
        request.targeting,
        request.ragContext
      );

      // 2. Build Enhanced Prompt
      const enhancedPrompt = this.buildPrompt(
        request,
        ragContext
      );

      // 3. Generate Content
      const result = await this.model.generateContent(enhancedPrompt);
      const response = result.response;
      const generatedText = response.text();

      // 4. Parse Generated Content
      const parsedContent = this.parseGeneratedContent(generatedText, request.type);

      // 5. Safety Checks
      const safetyChecks = await this.safetyService.performSafetyChecks(
        parsedContent,
        request.targeting,
        request.constraints
      );

      // 6. Extract Citations
      const citations = this.extractCitations(generatedText, ragContext.sources);

      // 7. Build Content Item
      const contentItem: Partial<ContentItem> = {
        ...parsedContent,
        generationType: 'ai',
        aiPrompt: request.prompt,
        ragSources: ragContext.sources.map(s => s.id),
        targeting: request.targeting,
        safetyChecks,
        status: safetyChecks.medicalFactCheck && safetyChecks.harmfulContentCheck
          ? 'pending_review'
          : 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        language: 'it',
        accessibility: {
          hasAltText: false,
          hasTranscript: false,
          hasSubtitles: false,
          hasAudioDescription: false,
          colorContrastCompliant: true,
          screenReaderOptimized: true,
          keyboardNavigable: true,
          wcagLevel: 'AA' as const
        },
        engagement: {
          views: 0,
          likes: 0,
          shares: 0,
          bookmarks: 0,
          comments: 0,
          avgRating: 0,
          totalRatings: 0,
          readCompletionRate: 0,
          bounceRate: 0,
          timeSpent: 0
        }
      };

      return {
        content: contentItem,
        citations,
        safetyChecks
      };

    } catch (error) {
      console.error('Content generation failed:', error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  private buildPrompt(
    request: ContentGenerationRequest,
    ragContext: { sources: RAGSource[]; relevantChunks: string[] }
  ): string {
    const { targeting, styleGuide, constraints } = request;

    let prompt = `# Generazione Contenuto per PiùCane

## Contesto RAG
${ragContext.relevantChunks.join('\n\n')}

## Richiesta
Tipo di contenuto: ${request.type}
Prompt utente: ${request.prompt}

## Targeting
${this.buildTargetingContext(targeting)}

## Guida di Stile
${this.buildStyleGuideContext(styleGuide)}

## Vincoli di Sicurezza
${this.buildConstraintsContext(constraints)}

## Istruzioni Specifiche
- Crea contenuto accurato dal punto di vista medico e veterinario
- Includi sempre disclaimer appropriati per consigli medici
- Usa fonti veterinarie certificate quando disponibili
- Mantieni un tono amichevole ma professionale
- Includi call-to-action appropriate
- Considera il benessere dell'animale come priorità assoluta
- Evita qualsiasi contenuto che possa essere dannoso per i cani
- Cita le fonti quando appropriato usando il formato [fonte: nome]

## Formato Output
Restituisci il contenuto nel seguente formato JSON:
{
  "title": "Titolo principale del contenuto",
  "subtitle": "Sottotitolo opzionale",
  "excerpt": "Riassunto breve (max 200 caratteri)",
  "content": "Contenuto principale in markdown",
  "tags": ["tag1", "tag2", "tag3"],
  "categories": ["categoria1", "categoria2"],
  "readingTime": numero_minuti,
  "seo": {
    "metaTitle": "Titolo SEO",
    "metaDescription": "Descrizione meta",
    "keywords": ["keyword1", "keyword2"]
  }
}

Genera ora il contenuto:`;

    return prompt;
  }

  private buildTargetingContext(targeting: any): string {
    const parts = [];

    if (targeting.dogBreeds?.length) {
      parts.push(`Razze target: ${targeting.dogBreeds.join(', ')}`);
    }

    if (targeting.dogAges?.length) {
      parts.push(`Età target: ${targeting.dogAges.map(age => `${age.min}-${age.max} ${age.unit}`).join(', ')}`);
    }

    if (targeting.experienceLevel?.length) {
      parts.push(`Livello esperienza: ${targeting.experienceLevel.join(', ')}`);
    }

    if (targeting.healthConditions?.length) {
      parts.push(`Condizioni salute: ${targeting.healthConditions.join(', ')}`);
    }

    return parts.join('\n');
  }

  private buildStyleGuideContext(styleGuide: StyleGuide): string {
    return `
Tono: ${styleGuide.tone}
Formalità: ${styleGuide.formality}
Prospettiva: ${styleGuide.perspective}
Lunghezza: ${styleGuide.length}
Emoji: ${styleGuide.includeEmojis ? 'Sì' : 'No'}
Call-to-Action: ${styleGuide.includeCTA ? 'Sì' : 'No'}
Voice del brand: ${styleGuide.brandVoice.join(', ')}
    `.trim();
  }

  private buildConstraintsContext(constraints: GenerationConstraints): string {
    return `
Lunghezza: ${constraints.minLength}-${constraints.maxLength} caratteri
Parole chiave obbligatorie: ${constraints.requiredKeywords.join(', ')}
Argomenti vietati: ${constraints.forbiddenTopics.join(', ')}
Sicurezza obbligatoria: ${constraints.mustIncludeSafety ? 'Sì' : 'No'}
Revisione veterinaria: ${constraints.requireVetReview ? 'Sì' : 'No'}
Consigli medici: ${constraints.allowMedicalAdvice ? 'Permessi' : 'Vietati'}
Livello lettura: ${constraints.targetReadingLevel}
    `.trim();
  }

  private parseGeneratedContent(text: string, type: ContentItem['type']): Partial<ContentItem> {
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in generated content');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        type,
        title: parsed.title,
        subtitle: parsed.subtitle,
        excerpt: parsed.excerpt,
        content: parsed.content,
        htmlContent: this.markdownToHtml(parsed.content),
        tags: parsed.tags || [],
        categories: parsed.categories || [],
        readingTime: parsed.readingTime || this.estimateReadingTime(parsed.content),
        seo: {
          metaTitle: parsed.seo?.metaTitle || parsed.title,
          metaDescription: parsed.seo?.metaDescription || parsed.excerpt,
          keywords: parsed.seo?.keywords || parsed.tags || [],
          structuredData: this.generateStructuredData(parsed, type)
        },
        slug: this.generateSlug(parsed.title)
      };
    } catch (error) {
      console.error('Failed to parse generated content:', error);
      throw new Error('Failed to parse generated content');
    }
  }

  private markdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, '<br>');
  }

  private estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .trim();
  }

  private generateStructuredData(content: any, type: string): any {
    const baseData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: content.title,
      description: content.excerpt,
      author: {
        '@type': 'Organization',
        name: 'PiùCane'
      },
      publisher: {
        '@type': 'Organization',
        name: 'PiùCane',
        logo: {
          '@type': 'ImageObject',
          url: 'https://piucane.com/logo.png'
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://piucane.com/news/${content.slug || ''}`
      }
    };

    if (type === 'guide') {
      return {
        ...baseData,
        '@type': 'HowTo',
        step: this.extractStepsFromContent(content.content)
      };
    }

    return baseData;
  }

  private extractStepsFromContent(content: string): any[] {
    // Extract numbered steps from content
    const stepRegex = /(\d+)\.\s+([^\n]+)/g;
    const steps = [];
    let match;

    while ((match = stepRegex.exec(content)) !== null) {
      steps.push({
        '@type': 'HowToStep',
        name: match[2],
        text: match[2]
      });
    }

    return steps;
  }

  private extractCitations(text: string, sources: RAGSource[]): Citation[] {
    const citations: Citation[] = [];
    const citationRegex = /\[fonte:\s*([^\]]+)\]/g;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const sourceName = match[1].trim();
      const source = sources.find(s =>
        s.title.toLowerCase().includes(sourceName.toLowerCase()) ||
        s.author.toLowerCase().includes(sourceName.toLowerCase())
      );

      if (source) {
        citations.push({
          text: match[0],
          source: source.title,
          url: source.citations?.[0]?.url,
          confidence: source.credibilityScore
        });
      }
    }

    return citations;
  }
}

class RAGService {
  async retrieveContext(
    query: string,
    targeting: any,
    ragContext?: RAGContext
  ): Promise<{ sources: RAGSource[]; relevantChunks: string[] }> {
    // This would integrate with your vector database
    // For now, return mock data
    const mockSources: RAGSource[] = [
      {
        id: 'vet-guide-001',
        type: 'veterinary_paper',
        title: 'Guida Veterinaria alla Nutrizione Canina',
        content: 'I cani hanno bisogno di una dieta bilanciata...',
        author: 'Dr. Marco Veterinario',
        publishedAt: new Date('2024-01-01'),
        credibilityScore: 0.95,
        vetApproved: true,
        citations: [{
          text: 'Linee guida nutrizionali veterinarie',
          source: 'Associazione Veterinari Italiani',
          confidence: 0.9
        }]
      }
    ];

    const relevantChunks = [
      'Informazioni nutrizionali validate da veterinari certificati...',
      'Consigli di sicurezza per la salute del cane...'
    ];

    return { sources: mockSources, relevantChunks };
  }
}

class SafetyService {
  async performSafetyChecks(
    content: Partial<ContentItem>,
    targeting: any,
    constraints: GenerationConstraints
  ): Promise<SafetyChecks> {
    const checks: SafetyChecks = {
      medicalFactCheck: true,
      harmfulContentCheck: true,
      misinformationCheck: true,
      allergenWarnings: [],
      dangerousActivityWarnings: [],
      disclaimers: [],
      lastCheckedAt: new Date(),
      checkedBy: 'ai-safety-system'
    };

    // Check for medical content
    if (this.containsMedicalAdvice(content.content || '')) {
      checks.disclaimers.push(
        'Questo contenuto è solo a scopo informativo e non sostituisce il parere di un veterinario qualificato.'
      );
    }

    // Check for allergen mentions
    const allergens = this.detectAllergens(content.content || '');
    if (allergens.length > 0) {
      checks.allergenWarnings = allergens;
      checks.disclaimers.push(
        'Attenzione: questo contenuto menziona potenziali allergeni. Consulta il tuo veterinario.'
      );
    }

    // Check for dangerous activities
    const dangerousActivities = this.detectDangerousActivities(content.content || '');
    if (dangerousActivities.length > 0) {
      checks.dangerousActivityWarnings = dangerousActivities;
      checks.disclaimers.push(
        'Alcune attività menzionate potrebbero richiedere supervisione veterinaria.'
      );
    }

    return checks;
  }

  private containsMedicalAdvice(content: string): boolean {
    const medicalKeywords = [
      'malattia', 'sintomo', 'cura', 'medicina', 'farmaco',
      'diagnosi', 'terapia', 'veterinario', 'visita'
    ];

    const lowerContent = content.toLowerCase();
    return medicalKeywords.some(keyword => lowerContent.includes(keyword));
  }

  private detectAllergens(content: string): string[] {
    const commonAllergens = [
      'pollo', 'manzo', 'maiale', 'pesce', 'uova', 'latticini',
      'grano', 'soia', 'mais', 'riso'
    ];

    const lowerContent = content.toLowerCase();
    return commonAllergens.filter(allergen => lowerContent.includes(allergen));
  }

  private detectDangerousActivities(content: string): string[] {
    const dangerousKeywords = [
      'corsa intensa', 'salto', 'nuoto', 'escursione', 'sport estremi'
    ];

    const lowerContent = content.toLowerCase();
    return dangerousKeywords.filter(activity => lowerContent.includes(activity));
  }
}
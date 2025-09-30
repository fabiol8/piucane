'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { ContentItem, ContentAnalytics } from '@/types/content';

export default function NewsArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [article, setArticle] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const contentId = params.id as string;

  useEffect(() => {
    loadArticle();
    trackView();

    // Track reading progress
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrolled / total) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentId]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock article data for development
      const mockArticle: ContentItem = {
        contentId,
        type: 'article',
        title: 'Guida completa alla nutrizione del Labrador: tutto quello che devi sapere',
        subtitle: 'Consigli veterinari per una dieta sana e bilanciata',
        slug: 'guida-nutrizione-labrador',
        excerpt: 'Scopri i segreti di una corretta alimentazione per il tuo Labrador, con consigli pratici dai migliori veterinari',
        content: `
# La nutrizione del Labrador: una guida completa

I Labrador Retriever sono cani energici e socievoli che richiedono una nutrizione attentamente bilanciata per mantenere la loro salute ottimale e il loro carattere vivace.

## Caratteristiche nutrizionali specifiche

### Fabbisogno energetico
I Labrador sono cani di taglia medio-grande con un metabolismo attivo. Un Labrador adulto necessita generalmente di:
- **Maschi**: 1.800-2.400 calorie al giorno
- **Femmine**: 1.500-2.000 calorie al giorno

Questi valori possono variare in base a:
- Livello di attività fisica
- Età del cane
- Condizioni di salute specifiche
- Sterilizzazione/castrazione

### Composizione ideale della dieta

**Proteine (22-26%)**
Le proteine di alta qualità sono essenziali per:
- Mantenimento della massa muscolare
- Riparazione dei tessuti
- Supporto del sistema immunitario

Fonti raccomandate:
- Pollo senza pelle
- Pesce (salmone, merluzzo)
- Agnello magro
- Uova

**Grassi (8-15%)**
I grassi forniscono energia concentrata e acidi grassi essenziali:
- Omega-3 per il pelo lucido
- Omega-6 per la salute della pelle
- Supporto alle funzioni cognitive

**Carboidrati (30-50%)**
Forniscono energia sostenibile:
- Riso integrale
- Avena
- Patate dolci
- Verdure

## Gestione del peso

I Labrador hanno una predisposizione genetica al sovrappeso. Per prevenire l'obesità:

### Controllo delle porzioni
- Utilizza un misurino per le crocchette
- Segui le indicazioni del produttore
- Adatta le quantità in base all'attività

### Frequenza dei pasti
- **Cuccioli (2-6 mesi)**: 3-4 pasti al giorno
- **Giovani (6-12 mesi)**: 2-3 pasti al giorno
- **Adulti**: 2 pasti al giorno
- **Senior**: 2 pasti più piccoli

### Snack e premi
- Non superare il 10% delle calorie totali
- Preferisci snack naturali (carote, mela senza semi)
- Evita cibi umani dannosi

## Alimenti da evitare

⚠️ **ATTENZIONE**: Questi alimenti sono tossici per i cani:
- Cioccolato
- Uva e uvetta
- Cipolle e aglio
- Avocado
- Edulcoranti artificiali (xilitolo)
- Noci di macadamia
- Alcool

## Problemi di salute specifici

### Displasia dell'anca
- Mantieni un peso corporeo ottimale
- Utilizza integratori per le articolazioni (glucosamina, condroitina)
- Evita esercizi intensi durante la crescita

### Allergie alimentari
Sintomi comuni:
- Prurito eccessivo
- Problemi digestivi
- Infezioni ricorrenti dell'orecchio

Test di eliminazione:
1. Dieta ipoallergenica per 8-12 settimane
2. Reintroduzione graduale degli alimenti
3. Identificazione dell'allergene

### Problemi oculari
- Integratori con antiossidanti
- Vitamina A per la salute degli occhi
- Controlli veterinari regolari

## Fasi della vita

### Cuccioli (0-12 mesi)
- Cibo specifico per cuccioli di taglia grande
- Calcio controllato per crescita ossea corretta
- Proteine elevate (26-30%)
- Transizione graduale dal latte materno

### Adulti (1-7 anni)
- Dieta di mantenimento bilanciata
- Controllo del peso rigoroso
- Attività fisica regolare
- Controlli veterinari annuali

### Senior (7+ anni)
- Riduzione calorica del 10-20%
- Proteine di alta qualità facilmente digeribili
- Integratori per articolazioni
- Controlli veterinari semestrali

## Consigli pratici

### Transizione alimentare
Quando cambi cibo, fallo gradualmente:
- Giorni 1-2: 75% vecchio cibo + 25% nuovo
- Giorni 3-4: 50% vecchio cibo + 50% nuovo
- Giorni 5-6: 25% vecchio cibo + 75% nuovo
- Giorno 7+: 100% nuovo cibo

### Idratazione
- Acqua fresca sempre disponibile
- Cambia l'acqua quotidianamente
- Pulisci la ciotola regolarmente
- Monitora il consumo (aumento/diminuzione improvvisi)

### Supplementazione
Consulta sempre il veterinario prima di aggiungere integratori:
- Omega-3 per pelo e pelle
- Probiotici per la salute digestiva
- Glucosamina per le articolazioni
- Antiossidanti per il sistema immunitario

## Quando consultare il veterinario

Contatta immediatamente il veterinario se noti:
- Perdita di appetito per più di 24 ore
- Vomito o diarrea persistenti
- Cambiamenti improvvisi nel peso
- Letargia insolita
- Difficoltà nella deglutizione
- Gonfiore addominale

## Conclusioni

Una nutrizione corretta è la base per una vita lunga e sana del tuo Labrador. Ricorda che ogni cane è unico e potrebbe avere esigenze specifiche. Lavora sempre in collaborazione con il tuo veterinario di fiducia per creare il piano nutrizionale perfetto per il tuo amico a quattro zampe.

**Disclaimer**: Queste informazioni sono solo a scopo educativo e non sostituiscono il consiglio professionale del veterinario. Consulta sempre un professionista qualificato per consigli specifici sulla salute del tuo cane.
        `,
        htmlContent: '', // Would be generated from markdown
        generationType: 'human',
        targeting: {
          dogBreeds: ['Labrador Retriever'],
          dogAges: [{ min: 1, max: 10, unit: 'years' }],
          dogSizes: ['large'],
          experienceLevel: ['beginner', 'intermediate'],
          interests: ['nutrition', 'health']
        },
        safetyChecks: {
          medicalFactCheck: true,
          harmfulContentCheck: true,
          misinformationCheck: true,
          allergenWarnings: ['Pollo', 'Pesce'],
          dangerousActivityWarnings: [],
          disclaimers: [
            'Queste informazioni sono solo a scopo educativo e non sostituiscono il consiglio professionale del veterinario.'
          ],
          lastCheckedAt: new Date(),
          checkedBy: 'vet-team'
        },
        veterinaryApproval: {
          approvedBy: 'Dr. Marco Rossi',
          approvedAt: new Date('2024-01-15'),
          approvalNotes: 'Contenuto verificato e approvato dal team veterinario',
          reviewScore: 9.5,
          medicalAccuracy: 9.8,
          safetyRating: 9.7
        },
        author: {
          id: 'vet-001',
          name: 'Dr. Marco Rossi',
          role: 'veterinarian',
          credentials: ['DVM', 'Specialista in Nutrizione Animale'],
          bio: 'Veterinario con 15 anni di esperienza in nutrizione canina'
        },
        publishedAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        createdAt: new Date('2024-01-10'),
        status: 'published',
        seo: {
          metaTitle: 'Guida Nutrizione Labrador | PiùCane',
          metaDescription: 'Scopri come alimentare correttamente il tuo Labrador con i consigli dei veterinari',
          keywords: ['labrador', 'nutrizione', 'alimentazione', 'cane']
        },
        tags: ['nutrizione', 'labrador', 'salute', 'veterinario'],
        categories: ['Nutrizione', 'Salute'],
        readingTime: 12,
        engagement: {
          views: 2847,
          likes: 156,
          shares: 23,
          bookmarks: 89,
          comments: 34,
          avgRating: 4.8,
          totalRatings: 127,
          readCompletionRate: 0.78,
          bounceRate: 0.22,
          timeSpent: 8.5
        },
        featuredImage: {
          id: 'img-001',
          url: '/images/labrador-nutrition.jpg',
          altText: 'Labrador mangia crocchette da una ciotola',
          type: 'image',
          mimeType: 'image/jpeg',
          size: 245760,
          aiGenerated: false
        },
        language: 'it',
        isSponsored: false,
        accessibility: {
          hasAltText: true,
          hasTranscript: false,
          hasSubtitles: false,
          hasAudioDescription: false,
          colorContrastCompliant: true,
          screenReaderOptimized: true,
          keyboardNavigable: true,
          wcagLevel: 'AA'
        }
      };

      setArticle(mockArticle);
    } catch (err) {
      console.error('Failed to load article:', err);
      setError('Errore nel caricamento dell\'articolo');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    if (!user) return;

    // Track article view for analytics
    const analytics = {
      userId: user.uid,
      contentId,
      action: 'view',
      timestamp: new Date()
    };

    console.log('Tracking view:', analytics);
  };

  const handleLike = async () => {
    if (!user) return;

    setLiked(!liked);

    // In real implementation, update database
    console.log('Like toggled:', { contentId, liked: !liked, userId: user.uid });
  };

  const handleBookmark = async () => {
    if (!user) return;

    setBookmarked(!bookmarked);

    // In real implementation, update database
    console.log('Bookmark toggled:', { contentId, bookmarked: !bookmarked, userId: user.uid });
  };

  const handleShare = async (platform?: string) => {
    const url = window.location.href;
    const title = article?.title || 'Contenuto PiùCane';

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`);
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`);
    } else {
      // Copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copiato negli appunti!');
    }

    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm animate-pulse">
            <div className="h-64 bg-gray-200 rounded-t-2xl"></div>
            <div className="p-8 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="max-w-md mx-auto pt-20 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Articolo non trovato</h2>
            <p className="text-gray-600 mb-6">
              {error || 'L\'articolo richiesto non è disponibile'}
            </p>
            <button
              onClick={() => router.back()}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-orange-700 transition-colors"
            >
              Torna indietro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-orange-600 transition-all duration-300"
          style={{ width: `${readingProgress}%` }}
        ></div>
      </div>

      {/* Back Button */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Torna al feed</span>
          </button>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          {/* Featured Image */}
          {article.featuredImage && (
            <div className="h-64 bg-gradient-to-r from-orange-100 to-amber-100 flex items-center justify-center">
              <span className="text-6xl">🐕</span>
            </div>
          )}

          <div className="p-8">
            {/* Category & Tags */}
            <div className="flex items-center space-x-2 mb-4">
              {article.categories.map((category) => (
                <span
                  key={category}
                  className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {category}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>

            {/* Subtitle */}
            {article.subtitle && (
              <p className="text-xl text-gray-600 mb-6">
                {article.subtitle}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">👨‍⚕️</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{article.author.name}</div>
                  <div className="text-sm text-gray-600">
                    {article.author.credentials?.join(', ')}
                  </div>
                </div>
              </div>

              <div className="text-right text-sm text-gray-600">
                <div>{article.publishedAt?.toLocaleDateString('it-IT')}</div>
                <div>{article.readingTime} min di lettura</div>
              </div>
            </div>

            {/* Veterinary Approval */}
            {article.veterinaryApproval && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-green-800 font-medium">Approvato dal team veterinario</span>
                </div>
                <p className="text-green-700 text-sm mt-2">
                  Contenuto verificato da {article.veterinaryApproval.approvedBy} •
                  Accuratezza medica: {article.veterinaryApproval.medicalAccuracy}/10
                </p>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="prose prose-lg max-w-none">
            {article.content.split('\n').map((paragraph, index) => {
              if (paragraph.trim() === '') return <br key={index} />;

              if (paragraph.startsWith('# ')) {
                return <h1 key={index} className="text-3xl font-bold mt-8 mb-4 text-gray-900">{paragraph.slice(2)}</h1>;
              }

              if (paragraph.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold mt-6 mb-3 text-gray-900">{paragraph.slice(3)}</h2>;
              }

              if (paragraph.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-bold mt-4 mb-2 text-gray-900">{paragraph.slice(4)}</h3>;
              }

              if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                return <p key={index} className="font-bold text-gray-900 mt-4 mb-2">{paragraph.slice(2, -2)}</p>;
              }

              if (paragraph.startsWith('⚠️')) {
                return (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
                    <p className="text-red-800">{paragraph}</p>
                  </div>
                );
              }

              if (paragraph.startsWith('- ')) {
                return (
                  <ul key={index} className="list-disc list-inside my-2">
                    <li className="text-gray-700">{paragraph.slice(2)}</li>
                  </ul>
                );
              }

              return <p key={index} className="text-gray-700 mb-4 leading-relaxed">{paragraph}</p>;
            })}
          </div>

          {/* Disclaimers */}
          {article.safetyChecks.disclaimers.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-8">
              <h4 className="font-medium text-gray-900 mb-2">Disclaimer</h4>
              {article.safetyChecks.disclaimers.map((disclaimer, index) => (
                <p key={index} className="text-gray-600 text-sm">{disclaimer}</p>
              ))}
            </div>
          )}
        </div>

        {/* Engagement Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  liked
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{article.engagement.likes + (liked ? 1 : 0)}</span>
              </button>

              <button
                onClick={handleBookmark}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  bookmarked
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="w-5 h-5" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Salva</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>Condividi</span>
                </button>

                {showShareMenu && (
                  <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-40">
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <span>💬</span>
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <span>📘</span>
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <span>🐦</span>
                      <span>Twitter</span>
                    </button>
                    <button
                      onClick={() => handleShare()}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <span>🔗</span>
                      <span>Copia link</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{article.engagement.views} visualizzazioni</span>
              <span>•</span>
              <span>Rating: {article.engagement.avgRating}/5 ⭐</span>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Articoli correlati</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">
                  Articolo correlato {i}: Salute e benessere del Labrador
                </h4>
                <p className="text-gray-600 text-sm mb-2">
                  Consigli essenziali per mantenere il tuo Labrador in salute...
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>5 min lettura</span>
                  <span>Dr. Veterinario</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
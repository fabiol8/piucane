'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Cookie,
  Download,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  functional: boolean;
}

interface DataExportRequest {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'downloaded';
  requestedAt: Date;
  expiresAt: Date;
  downloadUrl?: string;
}

interface PrivacyManagerProps {
  className?: string;
}

export function PrivacyManager({ className }: PrivacyManagerProps) {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
    functional: false
  });

  const [consentTimestamp, setConsentTimestamp] = useState<Date | null>(null);
  const [dataExportRequests, setDataExportRequests] = useState<DataExportRequest[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadCurrentPreferences();
    loadDataExportRequests();
  }, []);

  const loadCurrentPreferences = () => {
    const savedConsent = localStorage.getItem('piucane_consent');
    const timestamp = localStorage.getItem('piucane_consent_timestamp');

    if (savedConsent) {
      setPreferences(JSON.parse(savedConsent));
    }

    if (timestamp) {
      setConsentTimestamp(new Date(timestamp));
    }
  };

  const loadDataExportRequests = async () => {
    try {
      // In a real app, this would fetch from your API
      const mockRequests: DataExportRequest[] = [
        {
          id: '1',
          status: 'ready',
          requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          downloadUrl: '/api/privacy/export/1'
        }
      ];
      setDataExportRequests(mockRequests);
    } catch (error) {
      console.error('Error loading export requests:', error);
    }
  };

  const updatePreferences = async (newPreferences: ConsentPreferences) => {
    setIsLoading(true);

    try {
      // Save locally
      localStorage.setItem('piucane_consent', JSON.stringify(newPreferences));
      localStorage.setItem('piucane_consent_timestamp', new Date().toISOString());

      // Update Google Analytics consent
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          'analytics_storage': newPreferences.analytics ? 'granted' : 'denied',
          'ad_storage': newPreferences.marketing ? 'granted' : 'denied',
          'ad_user_data': newPreferences.marketing ? 'granted' : 'denied',
          'ad_personalization': newPreferences.personalization ? 'granted' : 'denied',
          'functionality_storage': newPreferences.functional ? 'granted' : 'denied',
          'personalization_storage': newPreferences.personalization ? 'granted' : 'denied'
        });
      }

      // In a real app, you would also send this to your backend
      // await updateUserConsent(newPreferences);

      setPreferences(newPreferences);
      setConsentTimestamp(new Date());

      showNotification('success', 'Preferenze aggiornate con successo');

      // Fire custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('piucane_consent_updated', {
          detail: newPreferences
        }));
      }
    } catch (error) {
      showNotification('error', 'Errore nell\'aggiornamento delle preferenze');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    if (key === 'necessary') return;

    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };

    updatePreferences(newPreferences);
  };

  const requestDataExport = async () => {
    setIsLoading(true);

    try {
      // In a real app, this would call your API
      const newRequest: DataExportRequest = {
        id: Date.now().toString(),
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      setDataExportRequests(prev => [newRequest, ...prev]);
      showNotification('success', 'Richiesta di esportazione dati inviata. Riceverai un\'email quando sarà pronta.');
    } catch (error) {
      showNotification('error', 'Errore nella richiesta di esportazione');
    } finally {
      setIsLoading(false);
    }
  };

  const requestDataDeletion = async () => {
    setIsLoading(true);

    try {
      // In a real app, this would call your API to initiate account deletion
      showNotification('success', 'Richiesta di cancellazione dati inviata. Il processo richiederà fino a 30 giorni.');
      setShowDeleteConfirm(false);
    } catch (error) {
      showNotification('error', 'Errore nella richiesta di cancellazione');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExport = (exportRequest: DataExportRequest) => {
    if (exportRequest.downloadUrl) {
      // In a real app, this would download the file
      const link = document.createElement('a');
      link.href = exportRequest.downloadUrl;
      link.download = `piucane-data-export-${exportRequest.id}.zip`;
      link.click();

      showNotification('success', 'Download avviato');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getStatusColor = (status: DataExportRequest['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'ready': return 'text-green-600 bg-green-100';
      case 'downloaded': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: DataExportRequest['status']) => {
    switch (status) {
      case 'pending': return 'In attesa';
      case 'processing': return 'In elaborazione';
      case 'ready': return 'Pronto';
      case 'downloaded': return 'Scaricato';
      default: return 'Sconosciuto';
    }
  };

  return (
    <div className={cn("max-w-4xl mx-auto p-6", className)}>
      {notification && (
        <Alert className={cn(
          "mb-6",
          notification.type === 'success' ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
        )}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={notification.type === 'success' ? "text-green-800" : "text-red-800"}>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro Privacy</h1>
        <p className="text-gray-600">
          Gestisci le tue preferenze sulla privacy, i consensi e i tuoi dati personali.
        </p>
      </div>

      <Tabs defaultValue="consent" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consent">Consensi</TabsTrigger>
          <TabsTrigger value="data">I tuoi dati</TabsTrigger>
          <TabsTrigger value="export">Esporta dati</TabsTrigger>
          <TabsTrigger value="delete">Cancella account</TabsTrigger>
        </TabsList>

        {/* Consent Management */}
        <TabsContent value="consent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-orange-500" />
                Gestione Consensi
              </CardTitle>
              <CardDescription>
                Controlla come utilizziamo i tuoi dati e quali cookie sono attivi.
                {consentTimestamp && (
                  <span className="block mt-2 text-sm text-gray-500">
                    Ultimo aggiornamento: {consentTimestamp.toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <h3 className="font-medium text-gray-900">Cookie Necessari</h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Sempre attivi
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Essenziali per il funzionamento del sito web, sicurezza e autenticazione.
                    </p>
                    <p className="text-xs text-gray-500">
                      Include: Cookie di sessione, autenticazione, sicurezza CSRF, preferenze di lingua
                    </p>
                  </div>
                  <Switch checked={true} disabled className="ml-4" />
                </div>

                {/* Analytics */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <h3 className="font-medium text-gray-900">Analytics e Statistiche</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Ci aiutano a capire come utilizzi il sito per migliorare l'esperienza utente.
                    </p>
                    <p className="text-xs text-gray-500">
                      Include: Google Analytics, Hotjar, metriche di performance
                    </p>
                  </div>
                  <Switch
                    checked={preferences.analytics}
                    onCheckedChange={() => togglePreference('analytics')}
                    disabled={isLoading}
                    className="ml-4"
                  />
                </div>

                {/* Marketing */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-purple-500" />
                      <h3 className="font-medium text-gray-900">Marketing e Pubblicità</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Per mostrarti contenuti e offerte personalizzate sui nostri servizi e siti partner.
                    </p>
                    <p className="text-xs text-gray-500">
                      Include: Facebook Pixel, Google Ads, remarketing, email marketing
                    </p>
                  </div>
                  <Switch
                    checked={preferences.marketing}
                    onCheckedChange={() => togglePreference('marketing')}
                    disabled={isLoading}
                    className="ml-4"
                  />
                </div>

                {/* Personalization */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-indigo-500" />
                      <h3 className="font-medium text-gray-900">Personalizzazione</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Per personalizzare contenuti, raccomandazioni e funzionalità in base alle tue preferenze.
                    </p>
                    <p className="text-xs text-gray-500">
                      Include: Raccomandazioni prodotti, contenuti personalizzati, AI chat
                    </p>
                  </div>
                  <Switch
                    checked={preferences.personalization}
                    onCheckedChange={() => togglePreference('personalization')}
                    disabled={isLoading}
                    className="ml-4"
                  />
                </div>

                {/* Functional */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <h3 className="font-medium text-gray-900">Funzionalità Avanzate</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Abilita funzionalità come chat dal vivo, video player e servizi di terze parti.
                    </p>
                    <p className="text-xs text-gray-500">
                      Include: Chat widget, YouTube embed, mappe, servizi social
                    </p>
                  </div>
                  <Switch
                    checked={preferences.functional}
                    onCheckedChange={() => togglePreference('functional')}
                    disabled={isLoading}
                    className="ml-4"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Informazioni importanti</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Le tue preferenze vengono salvate per 13 mesi</li>
                  <li>• Puoi modificarle in qualsiasi momento</li>
                  <li>• I cookie necessari non possono essere disabilitati</li>
                  <li>• Consulta la nostra <a href="/privacy-policy" className="underline">Privacy Policy</a> per maggiori dettagli</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Overview */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                I tuoi dati
              </CardTitle>
              <CardDescription>
                Panoramica delle informazioni che abbiamo memorizzato sul tuo account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Dati dell'account</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Informazioni personali</p>
                        <p className="text-xs text-gray-500">Nome, cognome, data di nascita</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Contatti</p>
                        <p className="text-xs text-gray-500">Email, telefono</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Indirizzi</p>
                        <p className="text-xs text-gray-500">Indirizzo di spedizione e fatturazione</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Dati dell'app</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Heart className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Profili dei cani</p>
                        <p className="text-xs text-gray-500">Informazioni sui tuoi animali</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Cronologia ordini</p>
                        <p className="text-xs text-gray-500">Acquisti e abbonamenti</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Attività</p>
                        <p className="text-xs text-gray-500">Interazioni e preferenze</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Trasparenza dei dati</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Hai il diritto di conoscere, modificare o eliminare i tuoi dati personali.
                  Puoi richiedere una copia completa di tutti i dati che abbiamo su di te.
                </p>
                <a
                  href="/privacy-policy"
                  className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  Leggi la Privacy Policy completa
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Export */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-500" />
                Esporta i tuoi dati
              </CardTitle>
              <CardDescription>
                Richiedi una copia di tutti i dati che abbiamo memorizzato sul tuo account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Cosa include l'esportazione</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Informazioni dell'account e preferenze</li>
                  <li>• Profili dei cani e dati sanitari</li>
                  <li>• Cronologia ordini e pagamenti</li>
                  <li>• Messaggi e conversazioni chat</li>
                  <li>• Dati di utilizzo e analytics (se consentiti)</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Richiedi esportazione</h3>
                    <p className="text-sm text-gray-600">
                      Il processo richiede fino a 7 giorni. Riceverai un'email quando sarà pronto.
                    </p>
                  </div>
                  <Button
                    onClick={requestDataExport}
                    disabled={isLoading}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Richiedi esportazione
                  </Button>
                </div>

                {dataExportRequests.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Richieste precedenti</h4>
                    {dataExportRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              getStatusColor(request.status)
                            )}>
                              {getStatusText(request.status)}
                            </span>
                            <span className="text-sm text-gray-600">
                              Richiesta del {request.requestedAt.toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          {request.status === 'ready' && (
                            <p className="text-xs text-gray-500">
                              Disponibile fino al {request.expiresAt.toLocaleDateString('it-IT')}
                            </p>
                          )}
                        </div>
                        {request.status === 'ready' && (
                          <Button
                            size="sm"
                            onClick={() => downloadExport(request)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Scarica
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Deletion */}
        <TabsContent value="delete">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Cancella il tuo account
              </CardTitle>
              <CardDescription>
                Rimuovi permanentemente il tuo account e tutti i dati associati.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Attenzione:</strong> Questa azione è irreversibile. Una volta cancellato l'account,
                  non sarà possibile recuperare i dati.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Cosa verrà eliminato</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    Il tuo account e tutte le informazioni personali
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    Profili dei cani e dati sanitari
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    Cronologia ordini e abbonamenti
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    Messaggi e conversazioni
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    Punti fedeltà e progressi
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Informazioni importanti</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Gli abbonamenti attivi verranno cancellati
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    I dati di fatturazione potrebbero essere conservati per obblighi legali
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Il processo richiede fino a 30 giorni
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Riceverai un'email di conferma
                  </li>
                </ul>
              </div>

              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancella il mio account
                </Button>
              ) : (
                <div className="space-y-4">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Sei sicuro di voler cancellare il tuo account? Questa azione non può essere annullata.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Annulla
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={requestDataDeletion}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? 'Elaborazione...' : 'Conferma cancellazione'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
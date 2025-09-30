/**
 * Payment Methods Management Component with Stripe Integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { trackEvent } from '@/analytics/ga4';
import { accountApi } from '@/lib/api-client';

interface PaymentMethod {
  id: string;
  type: 'card' | 'sepa_debit' | 'paypal' | 'klarna';
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  holderName?: string;
  bankName?: string;
  country?: string;
  isDefault: boolean;
  billingDetails: {
    name: string;
    email: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  createdAt: Date;
}

export const PaymentManager: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await accountApi.getPaymentMethods();
      if (response.success) {
        setPaymentMethods(response.data || []);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleAddMethod = () => {
    setIsAddModalOpen(true);
    trackEvent('payment_method_add_start', {
      existing_count: paymentMethods.length,
    }, 'account.payment.add.button.click');
  };

  const handleDeleteMethod = (method: PaymentMethod) => {
    setDeletingMethod(method);
    setIsDeleteModalOpen(true);
    trackEvent('payment_method_delete_start', {
      payment_method_id: method.id,
      payment_method_type: method.type,
    }, 'account.payment.delete.button.click');
  };

  const handleSetDefault = async (method: PaymentMethod) => {
    if (method.isDefault) return;

    setLoading(true);
    try {
      const response = await accountApi.setDefaultPaymentMethod(method.id);
      if (response.success) {
        setPaymentMethods(prev => prev.map(pm => ({
          ...pm,
          isDefault: pm.id === method.id
        })));

        trackEvent('payment_method_default_set', {
          payment_method_id: method.id,
          payment_method_type: method.type,
        }, 'account.payment.set_default.button.click');

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: 'Metodo di pagamento predefinito aggiornato',
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Metodi di pagamento
          </h3>
          <p className="text-sm text-gray-600">
            Gestisci i tuoi metodi di pagamento per ordini e abbonamenti
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddMethod}
          ctaId="account.payment.add.button.click"
          rightIcon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        >
          Aggiungi metodo
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessun metodo di pagamento
              </h3>
              <p className="text-gray-600 mb-4">
                Aggiungi un metodo di pagamento per completare i tuoi ordini
              </p>
              <Button
                variant="primary"
                onClick={handleAddMethod}
                ctaId="account.payment.add_first.button.click"
              >
                Aggiungi il primo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paymentMethods.map(method => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onDelete={() => handleDeleteMethod(method)}
              onSetDefault={() => handleSetDefault(method)}
              loading={loading}
            />
          ))}
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 text-xl">🔒</div>
          <div>
            <h4 className="font-medium text-blue-900">Sicurezza garantita</h4>
            <p className="text-sm text-blue-700 mt-1">
              I tuoi dati di pagamento sono protetti con crittografia di livello bancario tramite Stripe.
              Non memorizziamo mai i dati completi della tua carta di credito.
            </p>
          </div>
        </div>
      </div>

      <StripePaymentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(paymentMethod) => {
          setPaymentMethods(prev => [...prev, paymentMethod]);
          setIsAddModalOpen(false);
        }}
      />

      <DeletePaymentMethodModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        method={deletingMethod}
        onConfirm={(deletedId) => {
          setPaymentMethods(prev => prev.filter(pm => pm.id !== deletedId));
          setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
};

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onDelete: () => void;
  onSetDefault: () => void;
  loading: boolean;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  onDelete,
  onSetDefault,
  loading,
}) => {
  const getMethodIcon = () => {
    switch (method.type) {
      case 'card':
        switch (method.brand?.toLowerCase()) {
          case 'visa': return '💳';
          case 'mastercard': return '💳';
          case 'american_express': return '💳';
          default: return '💳';
        }
      case 'sepa_debit':
        return '🏦';
      case 'paypal':
        return '🅿️';
      case 'klarna':
        return '🛒';
      default:
        return '💳';
    }
  };

  const getMethodDisplay = () => {
    switch (method.type) {
      case 'card':
        return (
          <div>
            <div className="font-medium">
              {method.brand?.toUpperCase()} •••• {method.last4}
            </div>
            <div className="text-sm text-gray-600">
              Scadenza {method.expMonth?.toString().padStart(2, '0')}/{method.expYear}
            </div>
            {method.holderName && (
              <div className="text-sm text-gray-600">
                {method.holderName}
              </div>
            )}
          </div>
        );
      case 'sepa_debit':
        return (
          <div>
            <div className="font-medium">Addebito SEPA</div>
            <div className="text-sm text-gray-600">
              {method.bankName} •••• {method.last4}
            </div>
          </div>
        );
      case 'paypal':
        return (
          <div>
            <div className="font-medium">PayPal</div>
            <div className="text-sm text-gray-600">
              {method.billingDetails.email}
            </div>
          </div>
        );
      case 'klarna':
        return (
          <div>
            <div className="font-medium">Klarna</div>
            <div className="text-sm text-gray-600">
              Paga in 3 rate senza interessi
            </div>
          </div>
        );
      default:
        return (
          <div>
            <div className="font-medium">Metodo di pagamento</div>
            <div className="text-sm text-gray-600">
              {method.type}
            </div>
          </div>
        );
    }
  };

  return (
    <Card className={`${method.isDefault ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">
              {getMethodIcon()}
            </div>
            <div>
              {getMethodDisplay()}
              {method.isDefault && (
                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-primary text-white rounded-full">
                  Predefinito
                </span>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {!method.isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSetDefault}
                loading={loading}
                ctaId="account.payment.set_default.button.click"
              >
                Predefinito
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              ctaId="account.payment.delete.button.click"
            >
              Rimuovi
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentMethod: PaymentMethod) => void;
}

const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedType, setSelectedType] = useState<'card' | 'sepa_debit' | 'paypal' | 'klarna'>('card');
  const [loading, setLoading] = useState(false);

  const handleAddPaymentMethod = async () => {
    setLoading(true);
    try {
      // This would normally integrate with Stripe Elements
      // For now, we'll simulate the process

      trackEvent('payment_method_setup_start', {
        payment_method_type: selectedType,
      });

      // Simulate Stripe setup intent creation and confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock payment method data
      const mockPaymentMethod: PaymentMethod = {
        id: `pm_${Date.now()}`,
        type: selectedType,
        brand: selectedType === 'card' ? 'visa' : undefined,
        last4: selectedType === 'card' ? '4242' : selectedType === 'sepa_debit' ? '1234' : undefined,
        expMonth: selectedType === 'card' ? 12 : undefined,
        expYear: selectedType === 'card' ? 2028 : undefined,
        holderName: selectedType === 'card' ? 'John Doe' : undefined,
        bankName: selectedType === 'sepa_debit' ? 'Intesa Sanpaolo' : undefined,
        country: 'IT',
        isDefault: false,
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com',
          address: {
            line1: 'Via Roma 123',
            city: 'Roma',
            state: 'RM',
            postalCode: '00100',
            country: 'IT',
          },
        },
        createdAt: new Date(),
      };

      trackEvent('payment_method_added', {
        payment_method_type: selectedType,
      });

      onSuccess(mockPaymentMethod);

      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Metodo di pagamento aggiunto con successo',
            type: 'success'
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Errore nell\'aggiunta del metodo di pagamento',
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Aggiungi metodo di pagamento"
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Seleziona il tipo di pagamento
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'card' as const, label: 'Carta di credito/debito', icon: '💳', description: 'Visa, Mastercard, American Express' },
              { type: 'sepa_debit' as const, label: 'Addebito SEPA', icon: '🏦', description: 'Addebito diretto dal conto bancario' },
              { type: 'paypal' as const, label: 'PayPal', icon: '🅿️', description: 'Paga con il tuo account PayPal' },
              { type: 'klarna' as const, label: 'Klarna', icon: '🛒', description: 'Paga in 3 rate senza interessi' },
            ].map(method => (
              <button
                key={method.type}
                onClick={() => setSelectedType(method.type)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedType === method.type
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{method.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{method.label}</div>
                    <div className="text-xs text-gray-600">{method.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Nota:</strong> Questa è una demo. In produzione, qui verrebbe mostrato il modulo Stripe Elements
            per inserire in sicurezza i dati del metodo di pagamento selezionato.
          </p>
        </div>

        <div className="text-xs text-gray-500 bg-green-50 p-3 rounded-lg">
          <p>
            🔒 <strong>Sicurezza garantita:</strong> I tuoi dati di pagamento sono protetti con crittografia di livello bancario.
            Non memorizziamo mai i dati completi della tua carta di credito.
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          ctaId="account.payment.modal.cancel.button.click"
        >
          Annulla
        </Button>
        <Button
          variant="primary"
          loading={loading}
          onClick={handleAddPaymentMethod}
          ctaId="account.payment.modal.add.button.click"
        >
          Aggiungi metodo
        </Button>
      </div>
    </Modal>
  );
};

interface DeletePaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: PaymentMethod | null;
  onConfirm: (id: string) => void;
}

const DeletePaymentMethodModal: React.FC<DeletePaymentMethodModalProps> = ({
  isOpen,
  onClose,
  method,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!method) return;

    setLoading(true);
    try {
      const response = await accountApi.detachPaymentMethod(method.id);
      if (response.success) {
        trackEvent('payment_method_deleted', {
          payment_method_id: method.id,
          payment_method_type: method.type,
        }, 'account.payment.modal.confirm_delete.button.click');

        onConfirm(method.id);

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: 'Metodo di pagamento rimosso',
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Errore nella rimozione',
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
    } finally {
      setLoading(false);
    }
  };

  const getMethodDisplay = () => {
    if (!method) return '';

    switch (method.type) {
      case 'card':
        return `${method.brand?.toUpperCase()} •••• ${method.last4}`;
      case 'sepa_debit':
        return `${method.bankName} •••• ${method.last4}`;
      case 'paypal':
        return method.billingDetails.email;
      case 'klarna':
        return 'Klarna';
      default:
        return method.type;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rimuovi metodo di pagamento"
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          Sei sicuro di voler rimuovere il metodo di pagamento{' '}
          <strong>{getMethodDisplay()}</strong>?
        </p>
        <p className="text-sm text-red-600">
          Questa azione non può essere annullata. Eventuali abbonamenti attivi che utilizzano questo metodo
          dovranno essere aggiornati con un nuovo metodo di pagamento.
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          ctaId="account.payment.modal.cancel_delete.button.click"
        >
          Annulla
        </Button>
        <Button
          variant="danger"
          loading={loading}
          onClick={handleConfirm}
          ctaId="account.payment.modal.confirm_delete.button.click"
        >
          Rimuovi
        </Button>
      </div>
    </Modal>
  );
};
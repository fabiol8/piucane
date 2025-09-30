/**
 * Address Management Component with CRUD operations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Form, FormField, FormLabel, FormInput, FormSelect } from '@/components/ui/form';
import { ConfirmationModal } from '@/components/ui/modal';
import { trackEvent } from '@/analytics/ga4';
import { accountApi } from '@/lib/api-client';
import { addressSchema, type Address } from '@/lib/validations';

interface AddressManagerProps {
  className?: string;
}

export const AddressManager: React.FC<AddressManagerProps> = ({ className }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

  // Load addresses on mount
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const response = await accountApi.getAddresses();
      if (response.success) {
        setAddresses(response.data || []);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowAddModal(true);
    trackEvent('navigation_click', {
      link_text: 'add_address',
      section: 'address_management',
    }, 'account.address.add.button.click');
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setShowAddModal(true);
    trackEvent('navigation_click', {
      link_text: 'edit_address',
      section: 'address_management',
      address_id: address.id,
    });
  };

  const handleDeleteAddress = (address: Address) => {
    setDeletingAddress(address);
    trackEvent('navigation_click', {
      link_text: 'delete_address',
      section: 'address_management',
      address_id: address.id,
    });
  };

  const handleSetDefault = async (address: Address) => {
    try {
      const response = await accountApi.setDefaultAddress(address.id!);
      if (response.success) {
        trackEvent('address_set_default', {
          address_id: address.id,
          label: address.label,
        }, 'account.address.set_default.button.click');

        await loadAddresses(); // Reload to get updated default status

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: `${address.label} impostato come indirizzo predefinito`,
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Errore nell\'impostazione dell\'indirizzo predefinito',
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deletingAddress?.id) return;

    try {
      const response = await accountApi.deleteAddress(deletingAddress.id);
      if (response.success) {
        trackEvent('address_deleted', {
          address_id: deletingAddress.id,
          label: deletingAddress.label,
        });

        await loadAddresses();
        setDeletingAddress(null);

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: 'Indirizzo eliminato con successo',
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Errore nell\'eliminazione dell\'indirizzo',
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Indirizzi di spedizione</h2>
          <p className="text-gray-600">Gestisci i tuoi indirizzi di consegna</p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddAddress}
          ctaId="account.address.add.button.click"
          rightIcon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        >
          Aggiungi indirizzo
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessun indirizzo salvato
              </h3>
              <p className="text-gray-600 mb-6">
                Aggiungi il tuo primo indirizzo di spedizione per velocizzare gli ordini
              </p>
              <Button
                variant="primary"
                onClick={handleAddAddress}
                ctaId="account.address.add.button.click"
              >
                Aggiungi il primo indirizzo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEditAddress}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddressModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        address={editingAddress}
        onSave={loadAddresses}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deletingAddress}
        onClose={() => setDeletingAddress(null)}
        onConfirm={confirmDelete}
        title="Elimina indirizzo"
        message={`Sei sicuro di voler eliminare l'indirizzo "${deletingAddress?.label}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        cancelText="Annulla"
        variant="danger"
      />
    </div>
  );
};

// Address Card Component
interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
  onSetDefault: (address: Address) => void;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}) => {
  return (
    <Card className={`transition-all ${address.isDefault ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-medium text-gray-900">
                {address.isDefault ? '🏠' : '📍'} {address.label}
              </h3>
              {address.isDefault && (
                <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                  Predefinito
                </span>
              )}
            </div>
            <div className="text-gray-600 space-y-1">
              <p className="font-medium">{address.recipient}</p>
              <p>{address.street}</p>
              <p>{address.zip} {address.city} ({address.region})</p>
              {address.phone && <p>📞 {address.phone}</p>}
            </div>
          </div>
          <div className="flex flex-col space-y-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(address)}
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              }
            >
              Modifica
            </Button>
            {!address.isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetDefault(address)}
                ctaId="account.address.set_default.button.click"
                leftIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5Z" />
                  </svg>
                }
              >
                Predefinito
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(address)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              }
            >
              Elimina
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Address Add/Edit Modal
interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: Address | null;
  onSave: () => void;
}

const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  address,
  onSave,
}) => {
  const isEditing = !!address;
  const [formData, setFormData] = useState<Partial<Address>>({
    label: '',
    recipient: '',
    street: '',
    zip: '',
    city: '',
    region: '',
    country: 'IT',
    phone: '',
    isDefault: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (address) {
        setFormData(address);
      } else {
        setFormData({
          label: '',
          recipient: '',
          street: '',
          zip: '',
          city: '',
          region: '',
          country: 'IT',
          phone: '',
          isDefault: false,
        });
      }
      setErrors({});
    }
  }, [isOpen, address]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    try {
      addressSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        if (err.path?.length > 0) {
          fieldErrors[err.path[0]] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let response;
      if (isEditing) {
        response = await accountApi.updateAddress(address.id!, formData);
      } else {
        response = await accountApi.addAddress(formData);
      }

      if (response.success) {
        trackEvent('address_saved', {
          action: isEditing ? 'update' : 'create',
          label: formData.label,
          is_default: formData.isDefault,
        }, isEditing ? 'account.address.update.button.click' : 'account.address.add.button.click');

        onSave();
        onClose();

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: isEditing ? 'Indirizzo aggiornato con successo' : 'Indirizzo aggiunto con successo',
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error saving address:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Errore nel salvare l\'indirizzo',
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
    } finally {
      setLoading(false);
    }
  };

  const regionOptions = [
    { value: 'RM', label: 'Roma' },
    { value: 'MI', label: 'Milano' },
    { value: 'NA', label: 'Napoli' },
    { value: 'TO', label: 'Torino' },
    { value: 'PA', label: 'Palermo' },
    { value: 'GE', label: 'Genova' },
    { value: 'BO', label: 'Bologna' },
    { value: 'FI', label: 'Firenze' },
    { value: 'BA', label: 'Bari' },
    { value: 'CT', label: 'Catania' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifica indirizzo' : 'Nuovo indirizzo'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            ctaId={isEditing ? 'account.address.update.button.click' : 'account.address.add.button.click'}
          >
            {isEditing ? 'Aggiorna' : 'Aggiungi'} indirizzo
          </Button>
        </>
      }
    >
      <Form onSubmit={handleSubmit}>
        <FormField>
          <FormLabel htmlFor="label" required>Etichetta</FormLabel>
          <FormInput
            id="label"
            type="text"
            value={formData.label || ''}
            onChange={(e) => handleInputChange('label', e.target.value)}
            error={errors.label}
            placeholder="Casa, Ufficio, ecc."
            required
          />
        </FormField>

        <FormField>
          <FormLabel htmlFor="recipient" required>Nome destinatario</FormLabel>
          <FormInput
            id="recipient"
            type="text"
            value={formData.recipient || ''}
            onChange={(e) => handleInputChange('recipient', e.target.value)}
            error={errors.recipient}
            placeholder="Mario Rossi"
            required
          />
        </FormField>

        <FormField>
          <FormLabel htmlFor="street" required>Indirizzo</FormLabel>
          <FormInput
            id="street"
            type="text"
            value={formData.street || ''}
            onChange={(e) => handleInputChange('street', e.target.value)}
            error={errors.street}
            placeholder="Via Roma 123, Scala A, Interno 5"
            required
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField>
            <FormLabel htmlFor="zip" required>CAP</FormLabel>
            <FormInput
              id="zip"
              type="text"
              value={formData.zip || ''}
              onChange={(e) => handleInputChange('zip', e.target.value)}
              error={errors.zip}
              placeholder="00100"
              maxLength={5}
              required
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="city" required>Città</FormLabel>
            <FormInput
              id="city"
              type="text"
              value={formData.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              error={errors.city}
              placeholder="Roma"
              required
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="region" required>Provincia</FormLabel>
            <FormSelect
              id="region"
              value={formData.region || ''}
              onChange={(e) => handleInputChange('region', e.target.value)}
              options={regionOptions}
              error={errors.region}
              placeholder="Seleziona"
              required
            />
          </FormField>
        </div>

        <FormField>
          <FormLabel htmlFor="phone">Telefono (opzionale)</FormLabel>
          <FormInput
            id="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            error={errors.phone}
            placeholder="+39 123 456 7890"
            hint="Per comunicazioni di consegna"
          />
        </FormField>

        <div className="flex items-center space-x-2">
          <input
            id="isDefault"
            type="checkbox"
            checked={formData.isDefault || false}
            onChange={(e) => handleInputChange('isDefault', e.target.checked)}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
            Imposta come indirizzo predefinito
          </label>
        </div>
      </Form>
    </Modal>
  );
};
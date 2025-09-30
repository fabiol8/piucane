/**
 * Billing Information Management Component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormLabel, FormInput, FormSelect, FormCheckbox } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { trackEvent } from '@/analytics/ga4';
import { accountApi } from '@/lib/api-client';
import { billingInfoSchema } from '@/lib/validations';

interface BillingInfo {
  id: string;
  type: 'personal' | 'business';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  vatNumber?: string;
  taxCode: string;
  pecEmail?: string;
  sdiCode?: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  invoiceFormat: 'pdf' | 'xml';
  autoInvoicing: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const BillingManager: React.FC = () => {
  const [billingInfos, setBillingInfos] = useState<BillingInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState<BillingInfo | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingInfo, setDeletingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    loadBillingInfos();
  }, []);

  const loadBillingInfos = async () => {
    try {
      const response = await accountApi.getBillingInfos();
      if (response.success) {
        setBillingInfos(response.data || []);
      }
    } catch (error) {
      console.error('Error loading billing infos:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleAddInfo = () => {
    setEditingInfo(null);
    setIsModalOpen(true);
    trackEvent('billing_add_start', {
      existing_count: billingInfos.length,
    }, 'account.billing.add.button.click');
  };

  const handleEditInfo = (info: BillingInfo) => {
    setEditingInfo(info);
    setIsModalOpen(true);
    trackEvent('billing_edit_start', {
      billing_id: info.id,
      billing_type: info.type,
    }, 'account.billing.edit.button.click');
  };

  const handleDeleteInfo = (info: BillingInfo) => {
    setDeletingInfo(info);
    setIsDeleteModalOpen(true);
    trackEvent('billing_delete_start', {
      billing_id: info.id,
      billing_type: info.type,
    }, 'account.billing.delete.button.click');
  };

  const handleSetDefault = async (info: BillingInfo) => {
    if (info.isDefault) return;

    setLoading(true);
    try {
      const response = await accountApi.setDefaultBilling(info.id);
      if (response.success) {
        setBillingInfos(prev => prev.map(b => ({
          ...b,
          isDefault: b.id === info.id
        })));

        trackEvent('billing_default_set', {
          billing_id: info.id,
          billing_type: info.type,
        }, 'account.billing.set_default.button.click');

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: 'Informazioni di fatturazione predefinite aggiornate',
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error setting default billing:', error);
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
            Informazioni di fatturazione
          </h3>
          <p className="text-sm text-gray-600">
            Gestisci le tue informazioni fiscali per ricevere fatture e ricevute
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddInfo}
          ctaId="account.billing.add.button.click"
          rightIcon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        >
          Aggiungi informazioni
        </Button>
      </div>

      {billingInfos.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessuna informazione di fatturazione
              </h3>
              <p className="text-gray-600 mb-4">
                Aggiungi le tue informazioni fiscali per ricevere fatture e ricevute
              </p>
              <Button
                variant="primary"
                onClick={handleAddInfo}
                ctaId="account.billing.add_first.button.click"
              >
                Aggiungi la prima
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {billingInfos.map(info => (
            <BillingCard
              key={info.id}
              info={info}
              onEdit={() => handleEditInfo(info)}
              onDelete={() => handleDeleteInfo(info)}
              onSetDefault={() => handleSetDefault(info)}
              loading={loading}
            />
          ))}
        </div>
      )}

      <BillingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingInfo={editingInfo}
        onSave={(savedInfo) => {
          if (editingInfo) {
            setBillingInfos(prev => prev.map(b => b.id === savedInfo.id ? savedInfo : b));
          } else {
            setBillingInfos(prev => [...prev, savedInfo]);
          }
          setIsModalOpen(false);
        }}
      />

      <DeleteBillingModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        info={deletingInfo}
        onConfirm={(deletedId) => {
          setBillingInfos(prev => prev.filter(b => b.id !== deletedId));
          setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
};

interface BillingCardProps {
  info: BillingInfo;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  loading: boolean;
}

const BillingCard: React.FC<BillingCardProps> = ({
  info,
  onEdit,
  onDelete,
  onSetDefault,
  loading,
}) => {
  return (
    <Card className={`${info.isDefault ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900">
                {info.type === 'business' ? (
                  <>
                    <span className="text-blue-600">🏢</span>
                    {info.companyName}
                  </>
                ) : (
                  <>
                    <span className="text-green-600">👤</span>
                    {info.firstName} {info.lastName}
                  </>
                )}
              </h4>
              {info.isDefault && (
                <span className="px-2 py-1 text-xs font-medium bg-primary text-white rounded-full">
                  Predefinita
                </span>
              )}
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div>
                <strong>Codice Fiscale:</strong> {info.taxCode}
              </div>
              {info.vatNumber && (
                <div>
                  <strong>P.IVA:</strong> {info.vatNumber}
                </div>
              )}
              {info.pecEmail && (
                <div>
                  <strong>PEC:</strong> {info.pecEmail}
                </div>
              )}
              {info.sdiCode && (
                <div>
                  <strong>Codice SDI:</strong> {info.sdiCode}
                </div>
              )}
              <div>
                <strong>Indirizzo:</strong> {info.address.street}, {info.address.city} {info.address.postalCode}
              </div>
              <div>
                <strong>Formato fattura:</strong> {info.invoiceFormat.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            {!info.isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSetDefault}
                loading={loading}
                ctaId="account.billing.set_default.button.click"
              >
                Predefinita
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              ctaId="account.billing.edit.button.click"
            >
              Modifica
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              ctaId="account.billing.delete.button.click"
            >
              Elimina
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingInfo: BillingInfo | null;
  onSave: (info: BillingInfo) => void;
}

const BillingModal: React.FC<BillingModalProps> = ({
  isOpen,
  onClose,
  editingInfo,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    type: 'personal' as 'personal' | 'business',
    firstName: '',
    lastName: '',
    companyName: '',
    vatNumber: '',
    taxCode: '',
    pecEmail: '',
    sdiCode: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'IT',
    },
    invoiceFormat: 'pdf' as 'pdf' | 'xml',
    autoInvoicing: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingInfo) {
      setFormData({
        type: editingInfo.type,
        firstName: editingInfo.firstName || '',
        lastName: editingInfo.lastName || '',
        companyName: editingInfo.companyName || '',
        vatNumber: editingInfo.vatNumber || '',
        taxCode: editingInfo.taxCode,
        pecEmail: editingInfo.pecEmail || '',
        sdiCode: editingInfo.sdiCode || '',
        address: editingInfo.address,
        invoiceFormat: editingInfo.invoiceFormat,
        autoInvoicing: editingInfo.autoInvoicing,
      });
    } else {
      setFormData({
        type: 'personal',
        firstName: '',
        lastName: '',
        companyName: '',
        vatNumber: '',
        taxCode: '',
        pecEmail: '',
        sdiCode: '',
        address: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'IT',
        },
        invoiceFormat: 'pdf',
        autoInvoicing: true,
      });
    }
    setErrors({});
  }, [editingInfo, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    try {
      billingInfoSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        if (err.path?.length > 0) {
          const fieldPath = err.path.join('.');
          fieldErrors[fieldPath] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      trackEvent('form_error', {
        form_name: 'billing_info',
        error_fields: Object.keys(errors),
      });
      return;
    }

    setLoading(true);
    try {
      const response = editingInfo
        ? await accountApi.updateBillingInfo(editingInfo.id, formData)
        : await accountApi.createBillingInfo(formData);

      if (response.success) {
        trackEvent(editingInfo ? 'billing_updated' : 'billing_created', {
          billing_type: formData.type,
          has_vat: !!formData.vatNumber,
          has_pec: !!formData.pecEmail,
          invoice_format: formData.invoiceFormat,
        });

        onSave(response.data);

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: editingInfo
                ? 'Informazioni di fatturazione aggiornate'
                : 'Informazioni di fatturazione salvate',
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error saving billing info:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Errore nel salvataggio delle informazioni',
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
      title={editingInfo ? 'Modifica informazioni di fatturazione' : 'Aggiungi informazioni di fatturazione'}
      size="lg"
    >
      <Form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <FormField>
            <FormLabel htmlFor="type" required>Tipo</FormLabel>
            <FormSelect
              id="type"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              error={errors.type}
              required
            >
              <option value="personal">Persona fisica</option>
              <option value="business">Azienda/Partita IVA</option>
            </FormSelect>
          </FormField>

          {formData.type === 'personal' ? (
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel htmlFor="firstName" required>Nome</FormLabel>
                <FormInput
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  error={errors.firstName}
                  required
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="lastName" required>Cognome</FormLabel>
                <FormInput
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  error={errors.lastName}
                  required
                />
              </FormField>
            </div>
          ) : (
            <div className="space-y-4">
              <FormField>
                <FormLabel htmlFor="companyName" required>Ragione sociale</FormLabel>
                <FormInput
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  error={errors.companyName}
                  required
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="vatNumber" required>Partita IVA</FormLabel>
                <FormInput
                  id="vatNumber"
                  type="text"
                  value={formData.vatNumber}
                  onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                  error={errors.vatNumber}
                  placeholder="IT12345678901"
                  required
                />
              </FormField>
            </div>
          )}

          <FormField>
            <FormLabel htmlFor="taxCode" required>Codice fiscale</FormLabel>
            <FormInput
              id="taxCode"
              type="text"
              value={formData.taxCode}
              onChange={(e) => handleInputChange('taxCode', e.target.value.toUpperCase())}
              error={errors.taxCode}
              placeholder="RSSMRA80A01H501Z"
              required
            />
          </FormField>

          {formData.type === 'business' && (
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel htmlFor="pecEmail">Email PEC</FormLabel>
                <FormInput
                  id="pecEmail"
                  type="email"
                  value={formData.pecEmail}
                  onChange={(e) => handleInputChange('pecEmail', e.target.value)}
                  error={errors.pecEmail}
                  placeholder="azienda@pec.it"
                  hint="Per fatturazione elettronica"
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="sdiCode">Codice SDI</FormLabel>
                <FormInput
                  id="sdiCode"
                  type="text"
                  value={formData.sdiCode}
                  onChange={(e) => handleInputChange('sdiCode', e.target.value.toUpperCase())}
                  error={errors.sdiCode}
                  placeholder="ABCDEFG"
                  hint="Alternativo alla PEC"
                />
              </FormField>
            </div>
          )}

          <div className="border-t pt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Indirizzo di fatturazione</h4>
            <div className="space-y-4">
              <FormField>
                <FormLabel htmlFor="address.street" required>Indirizzo</FormLabel>
                <FormInput
                  id="address.street"
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  error={errors['address.street']}
                  placeholder="Via Roma 123"
                  required
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="address.city" required>Città</FormLabel>
                  <FormInput
                    id="address.city"
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    error={errors['address.city']}
                    placeholder="Roma"
                    required
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="address.state" required>Provincia</FormLabel>
                  <FormInput
                    id="address.state"
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value.toUpperCase())}
                    error={errors['address.state']}
                    placeholder="RM"
                    maxLength={2}
                    required
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="address.postalCode" required>CAP</FormLabel>
                  <FormInput
                    id="address.postalCode"
                    type="text"
                    value={formData.address.postalCode}
                    onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                    error={errors['address.postalCode']}
                    placeholder="00100"
                    maxLength={5}
                    required
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="address.country" required>Paese</FormLabel>
                  <FormSelect
                    id="address.country"
                    value={formData.address.country}
                    onChange={(e) => handleInputChange('address.country', e.target.value)}
                    error={errors['address.country']}
                    required
                  >
                    <option value="IT">Italia</option>
                    <option value="SM">San Marino</option>
                    <option value="VA">Vaticano</option>
                  </FormSelect>
                </FormField>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Preferenze fatturazione</h4>
            <div className="space-y-4">
              <FormField>
                <FormLabel htmlFor="invoiceFormat" required>Formato fattura</FormLabel>
                <FormSelect
                  id="invoiceFormat"
                  value={formData.invoiceFormat}
                  onChange={(e) => handleInputChange('invoiceFormat', e.target.value)}
                  error={errors.invoiceFormat}
                  required
                >
                  <option value="pdf">PDF (standard)</option>
                  <option value="xml">XML (fatturazione elettronica)</option>
                </FormSelect>
              </FormField>
              <FormCheckbox
                label="Fatturazione automatica"
                checked={formData.autoInvoicing}
                onChange={(e) => handleInputChange('autoInvoicing', e.target.checked)}
                hint="Genera automaticamente fatture per gli ordini completati"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            ctaId="account.billing.modal.cancel.button.click"
          >
            Annulla
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            ctaId="account.billing.modal.save.button.click"
          >
            {editingInfo ? 'Aggiorna' : 'Salva'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

interface DeleteBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  info: BillingInfo | null;
  onConfirm: (id: string) => void;
}

const DeleteBillingModal: React.FC<DeleteBillingModalProps> = ({
  isOpen,
  onClose,
  info,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!info) return;

    setLoading(true);
    try {
      const response = await accountApi.deleteBillingInfo(info.id);
      if (response.success) {
        trackEvent('billing_deleted', {
          billing_id: info.id,
          billing_type: info.type,
        }, 'account.billing.modal.confirm_delete.button.click');

        onConfirm(info.id);

        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast', {
            detail: {
              message: 'Informazioni di fatturazione eliminate',
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error deleting billing info:', error);
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('toast', {
          detail: {
            message: 'Errore nell\'eliminazione',
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
      title="Elimina informazioni di fatturazione"
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          Sei sicuro di voler eliminare le informazioni di fatturazione per{' '}
          <strong>
            {info?.type === 'business' ? info.companyName : `${info?.firstName} ${info?.lastName}`}
          </strong>?
        </p>
        <p className="text-sm text-red-600">
          Questa azione non può essere annullata. Le fatture esistenti rimarranno invariate.
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          ctaId="account.billing.modal.cancel_delete.button.click"
        >
          Annulla
        </Button>
        <Button
          variant="danger"
          loading={loading}
          onClick={handleConfirm}
          ctaId="account.billing.modal.confirm_delete.button.click"
        >
          Elimina
        </Button>
      </div>
    </Modal>
  );
};
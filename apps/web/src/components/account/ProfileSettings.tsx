'use client'

/**
 * Profile Settings Component - User profile management
 * Handles personal information, addresses, and preferences
 */

import React, { useState, useRef } from 'react'
import {
  User,
  Camera,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Globe,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackCTA } from '@/analytics/ga4'
import type { UserProfile, UserAddress, ProfileUpdateForm, AddressUpdateForm } from '@/types/account'

interface ProfileSettingsProps {
  user: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
  loading: boolean
}

interface FormErrors {
  [key: string]: string
}

export function ProfileSettings({ user, onUpdate, loading }: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingAddress, setEditingAddress] = useState<string | null>(null)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileUpdateForm>({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone || '',
    dateOfBirth: user.dateOfBirth || ''
  })

  // Address form state
  const [addressForm, setAddressForm] = useState<AddressUpdateForm>({
    type: 'home',
    firstName: '',
    lastName: '',
    company: '',
    street: '',
    streetNumber: '',
    city: '',
    province: '',
    zipCode: '',
    country: 'Italia',
    phone: '',
    notes: '',
    isDefault: false
  })

  const validateProfileForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!profileForm.firstName.trim()) {
      newErrors.firstName = 'Il nome è obbligatorio'
    }

    if (!profileForm.lastName.trim()) {
      newErrors.lastName = 'Il cognome è obbligatorio'
    }

    if (profileForm.phone && !/^[\+]?[0-9\s\-\(\)]+$/.test(profileForm.phone)) {
      newErrors.phone = 'Formato telefono non valido'
    }

    if (profileForm.dateOfBirth && new Date(profileForm.dateOfBirth) > new Date()) {
      newErrors.dateOfBirth = 'Data di nascita non valida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateAddressForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!addressForm.firstName.trim()) newErrors.firstName = 'Nome obbligatorio'
    if (!addressForm.lastName.trim()) newErrors.lastName = 'Cognome obbligatorio'
    if (!addressForm.street.trim()) newErrors.street = 'Via obbligatoria'
    if (!addressForm.streetNumber.trim()) newErrors.streetNumber = 'Numero civico obbligatorio'
    if (!addressForm.city.trim()) newErrors.city = 'Città obbligatoria'
    if (!addressForm.province.trim()) newErrors.province = 'Provincia obbligatoria'
    if (!addressForm.zipCode.trim()) newErrors.zipCode = 'CAP obbligatorio'
    if (addressForm.zipCode && !/^\d{5}$/.test(addressForm.zipCode)) {
      newErrors.zipCode = 'CAP deve essere di 5 cifre'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProfileSave = async () => {
    if (!validateProfileForm()) return

    try {
      await onUpdate({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone || undefined,
        dateOfBirth: profileForm.dateOfBirth || undefined
      })

      setIsEditing(false)
      setSuccessMessage('Profilo aggiornato con successo!')
      setTimeout(() => setSuccessMessage(''), 3000)

      trackCTA({
        ctaId: 'profile.updated',
        event: 'profile_update',
        value: 'success',
        metadata: { fields: Object.keys(profileForm) }
      })
    } catch (error) {
      console.error('Profile update failed:', error)
      setErrors({ submit: 'Errore durante l\'aggiornamento del profilo' })
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ avatar: 'Il file deve essere inferiore a 5MB' })
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrors({ avatar: 'Il file deve essere un\'immagine' })
      return
    }

    try {
      // Here you would typically upload to a cloud service
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        await onUpdate({ avatar: base64 })
        setSuccessMessage('Avatar aggiornato con successo!')
        setTimeout(() => setSuccessMessage(''), 3000)
      }
      reader.readAsDataURL(file)

      trackCTA({
        ctaId: 'profile.avatar.updated',
        event: 'avatar_upload',
        value: 'success',
        metadata: { fileSize: file.size, fileType: file.type }
      })
    } catch (error) {
      console.error('Avatar upload failed:', error)
      setErrors({ avatar: 'Errore durante il caricamento dell\'avatar' })
    }
  }

  const handleAddressSubmit = async () => {
    if (!validateAddressForm()) return

    try {
      // Create new address object
      const newAddress: UserAddress = {
        id: Date.now().toString(), // In a real app, this would be generated by the server
        ...addressForm
      }

      const updatedAddresses = [...(user.address ? [user.address] : []), newAddress]
      await onUpdate({ address: newAddress })

      setShowAddAddress(false)
      setAddressForm({
        type: 'home',
        firstName: '',
        lastName: '',
        company: '',
        street: '',
        streetNumber: '',
        city: '',
        province: '',
        zipCode: '',
        country: 'Italia',
        phone: '',
        notes: '',
        isDefault: false
      })
      setSuccessMessage('Indirizzo aggiunto con successo!')
      setTimeout(() => setSuccessMessage(''), 3000)

      trackCTA({
        ctaId: 'profile.address.added',
        event: 'address_add',
        value: 'success',
        metadata: { addressType: addressForm.type }
      })
    } catch (error) {
      console.error('Address add failed:', error)
      setErrors({ submit: 'Errore durante l\'aggiunta dell\'indirizzo' })
    }
  }

  const provinces = [
    'Agrigento', 'Alessandria', 'Ancona', 'Aosta', 'Arezzo', 'Ascoli Piceno', 'Asti',
    'Avellino', 'Bari', 'Barletta-Andria-Trani', 'Belluno', 'Benevento', 'Bergamo',
    'Biella', 'Bologna', 'Bolzano', 'Brescia', 'Brindisi', 'Cagliari', 'Caltanissetta',
    'Campobasso', 'Caserta', 'Catania', 'Catanzaro', 'Chieti', 'Como', 'Cosenza',
    'Cremona', 'Crotone', 'Cuneo', 'Enna', 'Fermo', 'Ferrara', 'Firenze', 'Foggia',
    'Forlì-Cesena', 'Frosinone', 'Genova', 'Gorizia', 'Grosseto', 'Imperia', 'Isernia',
    'L\'Aquila', 'La Spezia', 'Latina', 'Lecce', 'Lecco', 'Livorno', 'Lodi', 'Lucca',
    'Macerata', 'Mantova', 'Massa-Carrara', 'Matera', 'Messina', 'Milano', 'Modena',
    'Monza e Brianza', 'Napoli', 'Novara', 'Nuoro', 'Oristano', 'Padova', 'Palermo',
    'Parma', 'Pavia', 'Perugia', 'Pesaro e Urbino', 'Pescara', 'Piacenza', 'Pisa',
    'Pistoia', 'Pordenone', 'Potenza', 'Prato', 'Ragusa', 'Ravenna', 'Reggio Calabria',
    'Reggio Emilia', 'Rieti', 'Rimini', 'Roma', 'Rovigo', 'Salerno', 'Sassari',
    'Savona', 'Siena', 'Siracusa', 'Sondrio', 'Sud Sardegna', 'Taranto', 'Teramo',
    'Terni', 'Torino', 'Trapani', 'Trento', 'Treviso', 'Trieste', 'Udine', 'Varese',
    'Venezia', 'Verbano-Cusio-Ossola', 'Vercelli', 'Verona', 'Vibo Valentia', 'Vicenza', 'Viterbo'
  ]

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informazioni personali
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <><X className="w-4 h-4 mr-2" />Annulla</>
              ) : (
                <><Edit className="w-4 h-4 mr-2" />Modifica</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-piucane-primary to-piucane-secondary flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-piucane-primary text-white rounded-full flex items-center justify-center hover:bg-piucane-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAvatarUpload(file)
                }}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Foto profilo</h3>
              <p className="text-sm text-gray-600 mt-1">
                Carica un'immagine per personalizzare il tuo profilo
              </p>
              {errors.avatar && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.avatar}
                </p>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Inserisci il tuo nome"
                />
              ) : (
                <p className="text-gray-900 py-2">{user.firstName}</p>
              )}
              {errors.firstName && (
                <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cognome *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Inserisci il tuo cognome"
                />
              ) : (
                <p className="text-gray-900 py-2">{user.lastName}</p>
              )}
              {errors.lastName && (
                <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <p className="text-gray-900 py-2 flex items-center gap-2">
                {user.email}
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Verificata
                </span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Telefono
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+39 123 456 7890"
                />
              ) : (
                <p className="text-gray-900 py-2">{user.phone || 'Non specificato'}</p>
              )}
              {errors.phone && (
                <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Data di nascita
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                    errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              ) : (
                <p className="text-gray-900 py-2">
                  {user.dateOfBirth
                    ? new Date(user.dateOfBirth).toLocaleDateString('it-IT')
                    : 'Non specificata'
                  }
                </p>
              )}
              {errors.dateOfBirth && (
                <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Livello fedeltà
              </label>
              <div className="flex items-center gap-2 py-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.membershipTier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                  user.membershipTier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                  user.membershipTier === 'silver' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {user.membershipTier.charAt(0).toUpperCase() + user.membershipTier.slice(1)}
                </span>
                <span className="text-sm text-gray-600">
                  ({user.loyaltyPoints} punti)
                </span>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleProfileSave}
                loading={loading}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Salva modifiche
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="flex-1"
              >
                Annulla
              </Button>
            </div>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-red-800 text-sm">{errors.submit}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Indirizzi
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddAddress(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi indirizzo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {user.address ? (
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {user.address.type}
                    </span>
                    {user.address.isDefault && (
                      <span className="text-xs bg-piucane-light text-piucane-primary px-2 py-1 rounded">
                        Predefinito
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900">
                    {user.address.firstName} {user.address.lastName}
                  </p>
                  {user.address.company && (
                    <p className="text-gray-600">{user.address.company}</p>
                  )}
                  <p className="text-gray-600">
                    {user.address.street} {user.address.streetNumber}
                  </p>
                  <p className="text-gray-600">
                    {user.address.zipCode} {user.address.city} ({user.address.province})
                  </p>
                  {user.address.phone && (
                    <p className="text-gray-600 mt-1">{user.address.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nessun indirizzo salvato</p>
              <p className="text-sm">Aggiungi un indirizzo per velocizzare i tuoi acquisti</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Address Modal */}
      {showAddAddress && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Aggiungi nuovo indirizzo</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddAddress(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo indirizzo *
                  </label>
                  <select
                    value={addressForm.type}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, type: e.target.value as 'home' | 'work' | 'other' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
                  >
                    <option value="home">Casa</option>
                    <option value="work">Lavoro</option>
                    <option value="other">Altro</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded text-piucane-primary focus:ring-piucane-primary"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">
                    Imposta come predefinito
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={addressForm.firstName}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    value={addressForm.lastName}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                      errors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Azienda (opzionale)
                  </label>
                  <input
                    type="text"
                    value={addressForm.company}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Via *
                  </label>
                  <input
                    type="text"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                      errors.street ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numero civico *
                  </label>
                  <input
                    type="text"
                    value={addressForm.streetNumber}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, streetNumber: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                      errors.streetNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Città *
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                      errors.city ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia *
                  </label>
                  <select
                    value={addressForm.province}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, province: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                      errors.province ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleziona provincia</option>
                    {provinces.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CAP *
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={addressForm.zipCode}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, zipCode: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary ${
                      errors.zipCode ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefono (opzionale)
                  </label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note aggiuntive
                  </label>
                  <textarea
                    rows={2}
                    value={addressForm.notes}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-piucane-primary"
                    placeholder="Es. Scala A, Piano 2, Citofono Rossi..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleAddressSubmit}
                  loading={loading}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salva indirizzo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddAddress(false)}
                  className="flex-1"
                >
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
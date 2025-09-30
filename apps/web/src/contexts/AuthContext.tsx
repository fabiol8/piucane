'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  dogs: Dog[];
  subscriptions: any[];
  orders: any[];
  gamification: {
    level: number;
    xp: number;
    totalXp: number;
    badges: any[];
    missions: any[];
  };
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    language: 'it' | 'en';
    currency: 'EUR' | 'USD';
  };
  gdprConsent?: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
    advertising: boolean;
    consentDate: string;
  };
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  weight: number;
  age: number;
  birthDate: string;
  allergies: string[];
  specialNeeds: string[];
  activityLevel: 'low' | 'medium' | 'high';
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  gdprConsent: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
    advertising: boolean;
  };
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingConsent?: boolean;
}

interface AuthContextType {
  user: User | null;
  currentDog: Dog | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setCurrentDog: (dog: Dog) => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  updateConsent: (consent: User['gdprConsent']) => Promise<{ success: boolean; error?: string }>;
  exportData: (options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// For backward compatibility
export const useApp = useAuth;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentDog, setCurrentDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // User is signed in, fetch profile from our API
        await fetchUserProfile(firebaseUser);
      } else {
        // User is signed out
        setUser(null);
        setCurrentDog(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Set first dog as current if user has dogs
    if (user?.dogs && user.dogs.length > 0 && !currentDog) {
      setCurrentDog(user.dogs[0]);
    }
  }, [user, currentDog]);

  const fetchUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUser(result.user);
        }
      } else {
        console.error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      // Call our API to get user data
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);

        // Track analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'login', {
            method: 'email',
            user_id: result.user.id
          });
        }

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Login failed:', error);

      let errorMessage = 'Errore durante l\'accesso';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Utente non trovato';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Password non corretta';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email non valida';
      }

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      // Call our API to register user (which creates Firebase Auth user)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        // Sign in the newly created user
        await signInWithEmailAndPassword(auth, data.email, data.password);

        // Track analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'sign_up', {
            method: 'email',
            user_id: result.userId
          });
        }

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Errore durante la registrazione' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setCurrentDog(null);

      // Track analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'logout', {
          user_id: user?.id
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (firebaseUser) {
      await fetchUserProfile(firebaseUser);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!firebaseUser) {
        return { success: false, error: 'Utente non autenticato' };
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        await refreshUser(); // Refresh user data

        // Track analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'profile_update', {
            user_id: user?.id
          });
        }

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, error: 'Errore nell\'aggiornamento del profilo' };
    }
  };

  const updateConsent = async (consent: User['gdprConsent']): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!firebaseUser) {
        return { success: false, error: 'Utente non autenticato' };
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/consent', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(consent)
      });

      const result = await response.json();

      if (result.success) {
        await refreshUser(); // Refresh user data

        // Track analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'gdpr_consent_update', {
            user_id: user?.id
          });
        }

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Consent update failed:', error);
      return { success: false, error: 'Errore nell\'aggiornamento del consenso' };
    }
  };

  const exportData = async (options?: any): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      if (!firebaseUser) {
        return { success: false, error: 'Utente non autenticato' };
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options || {})
      });

      const result = await response.json();

      if (result.success) {
        // Track analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'gdpr_data_export', {
            user_id: user?.id
          });
        }

        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Data export failed:', error);
      return { success: false, error: 'Errore nell\'esportazione dei dati' };
    }
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!firebaseUser) {
        return { success: false, error: 'Utente non autenticato' };
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        // Track analytics before logout
        if (typeof gtag !== 'undefined') {
          gtag('event', 'account_delete', {
            user_id: user?.id
          });
        }

        // User will be automatically signed out
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Account deletion failed:', error);
      return { success: false, error: 'Errore nell\'eliminazione dell\'account' };
    }
  };

  const value = {
    user,
    currentDog,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    setCurrentDog,
    refreshUser,
    updateProfile,
    updateConsent,
    exportData,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// For backward compatibility
export const AppProvider = AuthProvider;
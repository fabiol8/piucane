/**
 * API Client with error handling, retry logic, and offline support
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    // Get auth token if available
    const token = this.getAuthToken();

    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    let lastError: any;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        const contentType = response.headers.get('content-type');
        let data: any;

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          throw new Error(data.message || `HTTP ${response.status}`);
        }

        return {
          data,
          status: response.status,
          success: true,
        };
      } catch (error: any) {
        lastError = error;

        // Don't retry on auth errors or client errors
        if (error.status >= 400 && error.status < 500) {
          break;
        }

        // Wait before retry
        if (attempt < this.retryAttempts) {
          await new Promise(resolve =>
            setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    return {
      error: lastError?.message || 'Network error',
      status: lastError?.status || 500,
      success: false,
    };
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  setAuthToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Generic CRUD methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    });
  }
}

export const apiClient = new ApiClient();

// Specific API methods
export const accountApi = {
  getProfile: () => apiClient.get('/account/profile'),
  updateProfile: (data: any) => apiClient.patch('/account/profile', data),
  updateNotifications: (data: any) => apiClient.patch('/account/notifications', data),
  setup2FA: () => apiClient.post('/account/2fa/setup'),
  verify2FA: (code: string) => apiClient.post('/account/2fa/verify', { code }),

  // Addresses
  getAddresses: () => apiClient.get('/account/addresses'),
  addAddress: (data: any) => apiClient.post('/account/addresses', data),
  updateAddress: (id: string, data: any) => apiClient.patch(`/account/addresses/${id}`, data),
  deleteAddress: (id: string) => apiClient.delete(`/account/addresses/${id}`),
  setDefaultAddress: (id: string) => apiClient.patch(`/account/addresses/${id}/default`, {}),

  // Billing
  getBilling: () => apiClient.get('/account/billing'),
  updateBilling: (data: any) => apiClient.patch('/account/billing', data),

  // Billing Infos
  getBillingInfos: () => apiClient.get('/account/billing-infos'),
  createBillingInfo: (data: any) => apiClient.post('/account/billing-infos', data),
  updateBillingInfo: (id: string, data: any) => apiClient.patch(`/account/billing-infos/${id}`, data),
  deleteBillingInfo: (id: string) => apiClient.delete(`/account/billing-infos/${id}`),
  setDefaultBilling: (id: string) => apiClient.patch(`/account/billing-infos/${id}/default`, {}),

  // Payment methods
  getPaymentMethods: () => apiClient.get('/account/payment-methods'),
  attachPaymentMethod: (setupIntentClientSecret: string) =>
    apiClient.post('/account/payment-methods/attach', { setupIntentClientSecret }),
  detachPaymentMethod: (id: string) => apiClient.delete(`/account/payment-methods/${id}`),
  setDefaultPaymentMethod: (id: string) =>
    apiClient.post('/account/payment-methods/default', { paymentMethodId: id }),
};

export const dogsApi = {
  list: () => apiClient.get('/dogs'),
  get: (id: string) => apiClient.get(`/dogs/${id}`),
  create: (data: any) => apiClient.post('/dogs', data),
  update: (id: string, data: any) => apiClient.patch(`/dogs/${id}`, data),
  delete: (id: string) => apiClient.delete(`/dogs/${id}`),
  uploadPhoto: (id: string, file: File) => apiClient.uploadFile(`/dogs/${id}/photos`, file),

  // Vaccines
  getVaccines: (id: string) => apiClient.get(`/dogs/${id}/vaccines`),
  addVaccine: (id: string, data: any) => apiClient.post(`/dogs/${id}/vaccines`, data),
  updateVaccine: (dogId: string, vaccineId: string, data: any) =>
    apiClient.patch(`/dogs/${dogId}/vaccines/${vaccineId}`, data),
  deleteVaccine: (dogId: string, vaccineId: string) =>
    apiClient.delete(`/dogs/${dogId}/vaccines/${vaccineId}`),

  // Vets
  getVets: (id: string) => apiClient.get(`/dogs/${id}/vets`),
  linkVet: (id: string, data: any) => apiClient.post(`/dogs/${id}/vets`, data),
  unlinkVet: (dogId: string, linkId: string) => apiClient.delete(`/dogs/${dogId}/vets/${linkId}`),

  // Recommendations
  getRecommendations: (id: string) => apiClient.get(`/dogs/${id}/recommendations`),
};

export const ordersApi = {
  list: (params?: any) => apiClient.get('/orders', params),
  get: (id: string) => apiClient.get(`/orders/${id}`),
  reportIssue: (id: string, data: any) => apiClient.post(`/orders/${id}/issue`, data),
};

export const subscriptionsApi = {
  list: () => apiClient.get('/subscriptions'),
  get: (id: string) => apiClient.get(`/subscriptions/${id}`),
  create: (data: any) => apiClient.post('/subscriptions', data),
  update: (id: string, data: any) => apiClient.patch(`/subscriptions/${id}`, data),
  changeDate: (id: string, nextShipAt: string) =>
    apiClient.patch(`/subscriptions/${id}/change-date`, { nextShipAt }),
  setAddressOverride: (id: string, addressId: string) =>
    apiClient.patch(`/subscriptions/${id}/address-override`, { addressId }),
  skip: (id: string) => apiClient.post(`/subscriptions/${id}/skip`, {}),
  pause: (id: string, duration?: number, reason?: string) =>
    apiClient.post(`/subscriptions/${id}/pause`, { duration, reason }),
  cancel: (id: string, reason: string) =>
    apiClient.post(`/subscriptions/${id}/cancel`, { reason }),
  addOnce: (id: string, productId: string, quantity: number) =>
    apiClient.post(`/subscriptions/${id}/add-once`, { productId, quantity }),
};

export const inboxApi = {
  getMessages: (params?: any) => apiClient.get('/inbox', params),
  markRead: (messageIds: string[]) => apiClient.post('/inbox/mark-read', { ids: messageIds }),
  markAllRead: () => apiClient.post('/inbox/mark-all-read', {}),
};

export const chatApi = {
  getThreads: () => apiClient.get('/chat/threads'),
  getThread: (id: string) => apiClient.get(`/chat/threads/${id}`),
  getMessages: (threadId: string, params?: any) =>
    apiClient.get(`/chat/threads/${threadId}/messages`, params),
  sendMessage: (threadId: string, data: any) =>
    apiClient.post(`/chat/threads/${threadId}/messages`, data),
  createThread: (data: any) => apiClient.post('/chat/threads', data),
};

export const missionsApi = {
  getActive: () => apiClient.get('/missions/active'),
  getCompleted: () => apiClient.get('/missions/completed'),
  get: (id: string) => apiClient.get(`/missions/${id}`),
  completeStep: (id: string, stepData?: any) =>
    apiClient.post(`/missions/${id}/complete-step`, stepData),
  complete: (id: string) => apiClient.post(`/missions/${id}/complete`, {}),
};

export const rewardsApi = {
  list: (status?: 'active' | 'redeemed' | 'expired') =>
    apiClient.get('/rewards', status ? { status } : undefined),
  redeem: (id: string, orderId?: string) =>
    apiClient.post(`/rewards/${id}/redeem`, orderId ? { orderId } : {}),
};

export const remindersApi = {
  list: (dogId?: string) => apiClient.get('/reminders', dogId ? { dogId } : undefined),
  create: (data: any) => apiClient.post('/reminders', data),
  update: (id: string, data: any) => apiClient.patch(`/reminders/${id}`, data),
  delete: (id: string) => apiClient.delete(`/reminders/${id}`),
  batchCreate: (reminders: any[]) => apiClient.post('/reminders/batch', { reminders }),
};

export const vetsApi = {
  search: (query: string) => apiClient.get('/vets/search', { query }),
  create: (data: any) => apiClient.post('/vets', data),
  get: (id: string) => apiClient.get(`/vets/${id}`),
  getAvailability: (id: string, date: string) =>
    apiClient.get(`/vets/${id}/availability`, { date }),

  // Appointments
  getAppointments: () => apiClient.get('/veterinary/appointments'),
  createAppointment: (data: any) => apiClient.post('/veterinary/appointments', data),
  updateAppointment: (id: string, data: any) => apiClient.patch(`/veterinary/appointments/${id}`, data),
  cancelAppointment: (id: string, reason: string) =>
    apiClient.post(`/veterinary/appointments/${id}/cancel`, { reason }),

  // Health Reminders
  getReminders: () => apiClient.get('/veterinary/reminders'),
  createReminder: (data: any) => apiClient.post('/veterinary/reminders', data),
  updateReminder: (id: string, data: any) => apiClient.patch(`/veterinary/reminders/${id}`, data),
  completeReminder: (id: string) => apiClient.post(`/veterinary/reminders/${id}/complete`, {}),
  deleteReminder: (id: string) => apiClient.delete(`/veterinary/reminders/${id}`),

  // Medical Records
  getMedicalRecords: (dogId: string) => apiClient.get(`/dogs/${dogId}/medical-records`),
  createMedicalRecord: (dogId: string, data: any) => apiClient.post(`/dogs/${dogId}/medical-records`, data),

  // Prescriptions
  getPrescriptions: (dogId: string) => apiClient.get(`/dogs/${dogId}/prescriptions`),
  createPrescription: (data: any) => apiClient.post('/veterinary/prescriptions', data),
};

export const onboardingApi = {
  start: () => apiClient.post('/onboarding/start', {}),
  saveStep: (step: number, data: any) => apiClient.patch('/onboarding/step', { step, data }),
  complete: (data: any) => apiClient.post('/onboarding/complete', data),
  getDraft: () => apiClient.get('/onboarding/draft'),
};

export const inboxApi = {
  getMessages: () => apiClient.get('/inbox/messages'),
  getMessage: (id: string) => apiClient.get(`/inbox/messages/${id}`),
  markAsRead: (id: string) => apiClient.patch(`/inbox/messages/${id}/read`, {}),
  markAllAsRead: () => apiClient.patch('/inbox/messages/read-all', {}),
  deleteMessage: (id: string) => apiClient.delete(`/inbox/messages/${id}`),
  archiveMessage: (id: string) => apiClient.patch(`/inbox/messages/${id}/archive`, {}),
};

export const chatApi = {
  getConversations: () => apiClient.get('/chat/conversations'),
  getConversation: (id: string) => apiClient.get(`/chat/conversations/${id}`),
  createConversation: (data: any) => apiClient.post('/chat/conversations', data),
  getMessages: (conversationId: string) => apiClient.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: any) => apiClient.post(`/chat/conversations/${conversationId}/messages`, data),
  markConversationAsRead: (conversationId: string) => apiClient.patch(`/chat/conversations/${conversationId}/read`, {}),
  closeConversation: (conversationId: string) => apiClient.patch(`/chat/conversations/${conversationId}/close`, {}),
  uploadAttachment: (conversationId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/chat/conversations/${conversationId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const missionsApi = {
  getMissions: () => apiClient.get('/gamification/missions'),
  getMission: (id: string) => apiClient.get(`/gamification/missions/${id}`),
  startMission: (id: string) => apiClient.post(`/gamification/missions/${id}/start`, {}),
  claimReward: (id: string) => apiClient.post(`/gamification/missions/${id}/claim`, {}),
  getUserStats: () => apiClient.get('/gamification/stats'),
  getBadges: () => apiClient.get('/gamification/badges'),
  getLeaderboard: (type: 'weekly' | 'monthly' | 'all_time') =>
    apiClient.get('/gamification/leaderboard', { type }),
  updateProgress: (missionId: string, progress: any) =>
    apiClient.patch(`/gamification/missions/${missionId}/progress`, progress),
};
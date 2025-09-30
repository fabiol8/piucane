// Jest setup file - runs before each test suite

// Firebase Admin mock (for server-side tests)
jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(() => mockFirestore),
    doc: jest.fn(() => mockFirestore),
    get: jest.fn(() => Promise.resolve({
      exists: true,
      data: () => ({}),
      id: 'mock-id'
    })),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    where: jest.fn(() => mockFirestore),
    orderBy: jest.fn(() => mockFirestore),
    limit: jest.fn(() => mockFirestore)
  };

  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
      applicationDefault: jest.fn()
    },
    firestore: jest.fn(() => mockFirestore),
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-uid' })),
      getUser: jest.fn(() => Promise.resolve({ uid: 'test-uid', email: 'test@example.com' })),
      setCustomUserClaims: jest.fn(() => Promise.resolve())
    })),
    messaging: jest.fn(() => ({
      send: jest.fn(() => Promise.resolve('mock-message-id'))
    }))
  };
});

// Firebase Client SDK mock (for client-side tests)
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({
    user: { uid: 'test-uid', email: 'test@example.com' }
  })),
  signOut: jest.fn(() => Promise.resolve())
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({})
  })),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [],
    empty: true
  })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn()
}));

// Stripe mock
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(() => Promise.resolve({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test'
        })),
        retrieve: jest.fn(() => Promise.resolve({
          id: 'cs_test_123',
          payment_status: 'paid'
        }))
      }
    },
    paymentIntents: {
      create: jest.fn(() => Promise.resolve({ id: 'pi_test_123' })),
      retrieve: jest.fn(() => Promise.resolve({ id: 'pi_test_123', status: 'succeeded' }))
    },
    refunds: {
      create: jest.fn(() => Promise.resolve({ id: 'ref_test_123', status: 'succeeded' }))
    }
  }));
});

// SendGrid mock
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(() => Promise.resolve([{ statusCode: 202 }]))
}));

// Twilio mock
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({
        sid: 'SM_test_123',
        status: 'sent'
      }))
    }
  }));
});

// Google Generative AI (Gemini) mock
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(() => Promise.resolve({
        response: {
          text: () => 'Mock AI response'
        }
      }))
    }))
  }))
}));

// Next.js router mock
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}));

// Environment variables for tests
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'demo-test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

// Global test utilities
global.testUtils = {
  // Mock user factory
  createMockUser: (overrides = {}) => ({
    uid: 'test-uid-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    ...overrides
  }),

  // Mock dog profile factory
  createMockDog: (overrides = {}) => ({
    id: 'dog-test-123',
    userId: 'test-uid-123',
    name: 'Rex',
    breed: 'labrador_retriever',
    weight: 25,
    birthDate: new Date('2022-01-01'),
    ...overrides
  }),

  // Mock product factory
  createMockProduct: (overrides = {}) => ({
    id: 'prod-test-123',
    sku: 'FOOD-ADULT-12KG',
    name: 'Crocchette Adult 12kg',
    price: 29.99,
    subscriberPrice: 24.99,
    stockQuantity: 100,
    ...overrides
  }),

  // Wait helper for async tests
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Console error/warn suppression for known issues
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  // Suppress specific known warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
     args[0].includes('Warning: ReactDOM.render'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  // Suppress specific known warnings
  if (
    typeof args[0] === 'string' &&
    args[0].includes('componentWillReceiveProps')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Cleanup after all tests
afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
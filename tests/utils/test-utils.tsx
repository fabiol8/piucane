import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { jest } from '@jest/globals'
import { axe, toHaveNoViolations } from 'jest-axe'

// Mock router for Next.js components
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  beforePopState: jest.fn(),
  isFallback: false,
  isLocaleDomain: true,
  isReady: true,
  defaultLocale: 'it',
  domainLocales: [],
  isPreview: false,
}

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock next/navigation for App Router
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Test wrapper component
interface TestProviderProps {
  children: React.ReactNode
}

const TestProvider: React.FC<TestProviderProps> = ({ children }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<any>
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  return render(ui, {
    wrapper: options?.wrapper || TestProvider,
    ...options,
  })
}

// Mock data generators
export const mockDogProfile = {
  id: 'test-dog-1',
  userId: 'test-user-1',
  name: 'Luna',
  breed: 'Labrador Retriever',
  isMongrrel: false,
  gender: 'femmina' as const,
  isNeutered: true,
  birthDate: '2020-03-15',
  weight: {
    current: 28.5,
    idealMin: 25,
    idealMax: 32,
    history: [
      { id: 'w1', weight: 28.5, date: '2024-01-15', notes: 'Peso stabile' },
    ]
  },
  bodyConditionScore: 5,
  microchipId: '123456789012345',
  photos: [],
  createdAt: '2023-12-01T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
}

export const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  firstName: 'Mario',
  lastName: 'Rossi',
  phone: '+39 123 456 7890',
  dateOfBirth: '1985-06-15',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

export const mockOrder = {
  id: 'test-order-1',
  userId: 'test-user-1',
  status: 'completed' as const,
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      name: 'Cibo Secco Cane Adulto',
      quantity: 2,
      price: 29.99,
      image: '/images/products/dry-food.jpg'
    }
  ],
  subtotal: 59.98,
  shipping: 4.99,
  tax: 0,
  total: 64.97,
  shippingAddress: {
    street: 'Via Roma 123',
    city: 'Milano',
    postalCode: '20100',
    province: 'MI',
    country: 'IT'
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-16T10:00:00Z'
}

// Accessibility testing helper
export const runAxeTest = async (container: HTMLElement) => {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

// Event testing helpers
export const mockGtag = jest.fn()
global.gtag = mockGtag

export const expectAnalyticsEvent = (eventName: string, parameters?: object) => {
  expect(mockGtag).toHaveBeenCalledWith('event', eventName, parameters)
}

// Form testing helpers
export const fillForm = async (getByLabelText: any, formData: Record<string, string>) => {
  for (const [field, value] of Object.entries(formData)) {
    const input = getByLabelText(new RegExp(field, 'i'))
    await userEvent.clear(input)
    await userEvent.type(input, value)
  }
}

// Wait for async operations
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 100))

// API mocking helpers
export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
})

export const mockApiError = (message: string, status = 500) => ({
  ok: false,
  status,
  json: async () => ({ error: message }),
  text: async () => JSON.stringify({ error: message }),
})

// Storage testing helpers
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}

// File upload testing
export const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Date testing helpers
export const mockDate = (dateString: string) => {
  const mockDate = new Date(dateString)
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate)
  return mockDate
}

// Viewport testing
export const setMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  })
  window.dispatchEvent(new Event('resize'))
}

export const setDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1920,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 1080,
  })
  window.dispatchEvent(new Event('resize'))
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'
export { customRender as render }
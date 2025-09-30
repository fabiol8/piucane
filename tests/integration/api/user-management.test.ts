import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock Firebase admin
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}

const mockAuth = {
  createUser: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  setCustomUserClaims: jest.fn(),
}

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: () => mockFirestore,
  auth: () => mockAuth,
}))

// Mock API handlers
import { createUser, getUserProfile, updateUserProfile, deleteUser } from '@/api/users'

describe('User Management API Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup default mock responses
    mockFirestore.collection.mockReturnThis()
    mockFirestore.doc.mockReturnThis()
    mockFirestore.where.mockReturnThis()
    mockFirestore.orderBy.mockReturnThis()
    mockFirestore.limit.mockReturnThis()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('User Creation', () => {
    it('should create new user successfully', async () => {
      const userData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        phone: '+39 123 456 7890',
        dateOfBirth: '1985-06-15',
      }

      // Mock Firebase Auth user creation
      mockAuth.createUser.mockResolvedValue({
        uid: 'test-user-id',
        email: userData.email,
      })

      // Mock Firestore document creation
      mockFirestore.set.mockResolvedValue(undefined)

      const result = await createUser(userData)

      expect(result).toEqual({
        success: true,
        userId: 'test-user-id',
        user: expect.objectContaining({
          id: 'test-user-id',
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        }),
      })

      // Verify Firebase Auth was called
      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: userData.email,
        emailVerified: false,
        disabled: false,
      })

      // Verify Firestore was called
      expect(mockFirestore.collection).toHaveBeenCalledWith('users')
      expect(mockFirestore.doc).toHaveBeenCalledWith('test-user-id')
      expect(mockFirestore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          dateOfBirth: userData.dateOfBirth,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      )
    })

    it('should handle duplicate email error', async () => {
      const userData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'existing@example.com',
        phone: '+39 123 456 7890',
      }

      // Mock Firebase Auth error
      mockAuth.createUser.mockRejectedValue({
        code: 'auth/email-already-exists',
        message: 'The email address is already in use.',
      })

      const result = await createUser(userData)

      expect(result).toEqual({
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'Un account con questa email esiste già.',
      })
    })

    it('should validate required fields', async () => {
      const incompleteData = {
        firstName: 'Mario',
        // Missing required fields
      }

      const result = await createUser(incompleteData as any)

      expect(result).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Dati obbligatori mancanti.',
        fields: expect.arrayContaining(['lastName', 'email']),
      })
    })

    it('should validate email format', async () => {
      const userData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'invalid-email',
        phone: '+39 123 456 7890',
      }

      const result = await createUser(userData)

      expect(result).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Formato email non valido.',
      })
    })

    it('should validate phone format', async () => {
      const userData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario@example.com',
        phone: '123', // Invalid phone
      }

      const result = await createUser(userData)

      expect(result).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Formato telefono non valido.',
      })
    })
  })

  describe('User Profile Retrieval', () => {
    it('should get user profile successfully', async () => {
      const userId = 'test-user-id'
      const mockUserData = {
        id: userId,
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario@example.com',
        phone: '+39 123 456 7890',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      // Mock Firestore get
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => mockUserData,
      })

      const result = await getUserProfile(userId)

      expect(result).toEqual({
        success: true,
        user: mockUserData,
      })

      expect(mockFirestore.collection).toHaveBeenCalledWith('users')
      expect(mockFirestore.doc).toHaveBeenCalledWith(userId)
    })

    it('should handle user not found', async () => {
      const userId = 'non-existent-user'

      // Mock Firestore get - user not found
      mockFirestore.get.mockResolvedValue({
        exists: false,
      })

      const result = await getUserProfile(userId)

      expect(result).toEqual({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      })
    })

    it('should include user dogs in profile', async () => {
      const userId = 'test-user-id'
      const mockUserData = {
        id: userId,
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario@example.com',
      }

      const mockDogs = [
        {
          id: 'dog-1',
          name: 'Luna',
          breed: 'Labrador',
          userId,
        },
        {
          id: 'dog-2',
          name: 'Max',
          breed: 'Golden Retriever',
          userId,
        },
      ]

      // Mock user document
      mockFirestore.get.mockResolvedValueOnce({
        exists: true,
        data: () => mockUserData,
      })

      // Mock dogs query
      const mockDogsSnapshot = {
        docs: mockDogs.map(dog => ({
          id: dog.id,
          data: () => dog,
        })),
      }
      mockFirestore.get.mockResolvedValueOnce(mockDogsSnapshot)

      const result = await getUserProfile(userId, { includeDogs: true })

      expect(result).toEqual({
        success: true,
        user: {
          ...mockUserData,
          dogs: mockDogs,
        },
      })
    })
  })

  describe('User Profile Update', () => {
    it('should update user profile successfully', async () => {
      const userId = 'test-user-id'
      const updateData = {
        firstName: 'Mario Updated',
        phone: '+39 987 654 3210',
      }

      // Mock Firestore update
      mockFirestore.update.mockResolvedValue(undefined)

      // Mock get updated user
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => ({
          id: userId,
          firstName: updateData.firstName,
          lastName: 'Rossi',
          email: 'mario@example.com',
          phone: updateData.phone,
          updatedAt: expect.any(Date),
        }),
      })

      const result = await updateUserProfile(userId, updateData)

      expect(result).toEqual({
        success: true,
        user: expect.objectContaining({
          id: userId,
          firstName: updateData.firstName,
          phone: updateData.phone,
        }),
      })

      expect(mockFirestore.update).toHaveBeenCalledWith({
        ...updateData,
        updatedAt: expect.any(Date),
      })
    })

    it('should validate update data', async () => {
      const userId = 'test-user-id'
      const invalidUpdateData = {
        email: 'invalid-email',
      }

      const result = await updateUserProfile(userId, invalidUpdateData)

      expect(result).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Formato email non valido.',
      })
    })

    it('should not allow updating protected fields', async () => {
      const userId = 'test-user-id'
      const protectedUpdateData = {
        id: 'different-id',
        createdAt: new Date(),
        emailVerified: true,
      }

      const result = await updateUserProfile(userId, protectedUpdateData as any)

      expect(result).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Campi protetti non modificabili.',
        fields: ['id', 'createdAt', 'emailVerified'],
      })
    })
  })

  describe('User Deletion', () => {
    it('should delete user successfully with data cleanup', async () => {
      const userId = 'test-user-id'

      // Mock user exists check
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => ({ id: userId }),
      })

      // Mock data cleanup queries
      const mockDogsSnapshot = {
        docs: [
          { id: 'dog-1', ref: { delete: jest.fn() } },
          { id: 'dog-2', ref: { delete: jest.fn() } },
        ],
      }
      const mockOrdersSnapshot = {
        docs: [
          { id: 'order-1', ref: { update: jest.fn() } },
        ],
      }

      mockFirestore.get
        .mockResolvedValueOnce(mockDogsSnapshot) // Dogs query
        .mockResolvedValueOnce(mockOrdersSnapshot) // Orders query

      // Mock Firebase Auth deletion
      mockAuth.deleteUser.mockResolvedValue(undefined)

      // Mock Firestore user deletion
      mockFirestore.delete.mockResolvedValue(undefined)

      const result = await deleteUser(userId)

      expect(result).toEqual({
        success: true,
        message: 'Account eliminato con successo.',
      })

      // Verify all cleanup operations
      expect(mockAuth.deleteUser).toHaveBeenCalledWith(userId)
      expect(mockFirestore.delete).toHaveBeenCalled()

      // Verify dogs were deleted
      mockDogsSnapshot.docs.forEach(doc => {
        expect(doc.ref.delete).toHaveBeenCalled()
      })

      // Verify orders were anonymized
      mockOrdersSnapshot.docs.forEach(doc => {
        expect(doc.ref.update).toHaveBeenCalledWith({
          userId: null,
          userDeleted: true,
          userDeletedAt: expect.any(Date),
        })
      })
    })

    it('should handle user not found during deletion', async () => {
      const userId = 'non-existent-user'

      // Mock user not found
      mockFirestore.get.mockResolvedValue({
        exists: false,
      })

      const result = await deleteUser(userId)

      expect(result).toEqual({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      })
    })

    it('should handle partial deletion failures gracefully', async () => {
      const userId = 'test-user-id'

      // Mock user exists
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => ({ id: userId }),
      })

      // Mock successful data queries but Auth deletion failure
      mockFirestore.get
        .mockResolvedValueOnce({ docs: [] }) // Dogs
        .mockResolvedValueOnce({ docs: [] }) // Orders

      mockAuth.deleteUser.mockRejectedValue(new Error('Auth deletion failed'))

      const result = await deleteUser(userId)

      expect(result).toEqual({
        success: false,
        error: 'DELETION_FAILED',
        message: 'Errore durante l\'eliminazione dell\'account.',
      })
    })
  })

  describe('User Search and Filtering', () => {
    it('should search users by email', async () => {
      const searchEmail = 'mario@example.com'
      const mockUsers = [
        {
          id: 'user-1',
          firstName: 'Mario',
          lastName: 'Rossi',
          email: searchEmail,
        },
      ]

      const mockSnapshot = {
        docs: mockUsers.map(user => ({
          id: user.id,
          data: () => user,
        })),
      }

      mockFirestore.get.mockResolvedValue(mockSnapshot)

      const result = await searchUsers({ email: searchEmail })

      expect(result).toEqual({
        success: true,
        users: mockUsers,
        total: mockUsers.length,
      })

      expect(mockFirestore.where).toHaveBeenCalledWith('email', '==', searchEmail)
    })

    it('should filter users by creation date range', async () => {
      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-12-31')

      const mockUsers = [
        {
          id: 'user-1',
          firstName: 'Mario',
          lastName: 'Rossi',
          createdAt: new Date('2023-06-15'),
        },
      ]

      const mockSnapshot = {
        docs: mockUsers.map(user => ({
          id: user.id,
          data: () => user,
        })),
      }

      mockFirestore.get.mockResolvedValue(mockSnapshot)

      const result = await searchUsers({
        createdAfter: startDate,
        createdBefore: endDate,
      })

      expect(result).toEqual({
        success: true,
        users: mockUsers,
        total: mockUsers.length,
      })

      expect(mockFirestore.where).toHaveBeenCalledWith('createdAt', '>=', startDate)
      expect(mockFirestore.where).toHaveBeenCalledWith('createdAt', '<=', endDate)
    })

    it('should paginate user results', async () => {
      const limit = 10
      const offset = 20

      const mockUsers = Array.from({ length: limit }, (_, i) => ({
        id: `user-${i + offset}`,
        firstName: `User${i + offset}`,
        lastName: 'Test',
        email: `user${i + offset}@example.com`,
      }))

      const mockSnapshot = {
        docs: mockUsers.map(user => ({
          id: user.id,
          data: () => user,
        })),
      }

      mockFirestore.get.mockResolvedValue(mockSnapshot)

      const result = await searchUsers({}, { limit, offset })

      expect(result).toEqual({
        success: true,
        users: mockUsers,
        total: mockUsers.length,
        pagination: {
          limit,
          offset,
          hasMore: expect.any(Boolean),
        },
      })

      expect(mockFirestore.limit).toHaveBeenCalledWith(limit)
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc')
    })
  })
})
import { NextRequest, NextResponse } from 'next/server';

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'demo@piucane.com',
  name: 'Demo User',
  avatar: null,
  dogs: [
    {
      id: 'dog-123',
      name: 'Luna',
      breed: 'Golden Retriever',
      weight: 28,
      age: 48, // months
      birthDate: '2020-01-15',
      allergies: ['pollo', 'grano'],
      specialNeeds: ['joint-support'],
      activityLevel: 'high'
    }
  ],
  subscriptions: [],
  orders: [],
  gamification: {
    level: 12,
    xp: 2850,
    totalXp: 3200,
    badges: [],
    missions: []
  }
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Mock authentication
    if (email && password) {
      return NextResponse.json({
        success: true,
        user: mockUser,
        token: 'mock-jwt-token'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Mock user session check
  const authHeader = request.headers.get('authorization');

  if (authHeader === 'Bearer mock-jwt-token') {
    return NextResponse.json({
      success: true,
      user: mockUser
    });
  }

  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
import { Request, Response } from 'express';
import { db } from '../../config/firebase';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, name, phone } = req.body;

    const userRef = db.collection('users').doc();
    await userRef.set({
      email,
      name,
      phone,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      role: 'user'
    });

    res.status(201).json({
      message: 'User created successfully',
      userId: userRef.id
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    res.json({
      id: userDoc.id,
      ...userData
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { name, phone, preferences } = req.body;

    await db.collection('users').doc(req.user.uid).update({
      name,
      phone,
      preferences,
      updatedAt: new Date()
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
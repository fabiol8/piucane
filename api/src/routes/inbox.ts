import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { db } from '../config/firebase';
import { z } from 'zod';

const router = Router();

const sendMessageSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'document', 'system']).optional().default('text'),
  metadata: z.object({
    orderId: z.string().optional(),
    dogId: z.string().optional(),
    subscriptionId: z.string().optional()
  }).optional()
});

const markReadSchema = z.object({
  messageIds: z.array(z.string())
});

router.get('/conversations', auth, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Get all conversations where user is participant
    const conversationsSnapshot = await db.collection('conversations')
      .where('participants', 'array-contains', req.user!.uid)
      .orderBy('lastMessageAt', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum)
      .get();

    const conversations = await Promise.all(
      conversationsSnapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Get unread count for this user
        const unreadSnapshot = await db.collection('messages')
          .where('conversationId', '==', doc.id)
          .where('readBy', 'not-in', [req.user!.uid])
          .where('senderId', '!=', req.user!.uid)
          .get();

        // Get other participant info (for 1:1 conversations)
        const otherParticipantId = data.participants.find((p: string) => p !== req.user!.uid);
        let otherParticipant = null;

        if (otherParticipantId && data.type === 'direct') {
          const userDoc = await db.collection('users').doc(otherParticipantId).get();
          if (userDoc.exists) {
            const userData = userDoc.data()!;
            otherParticipant = {
              id: otherParticipantId,
              name: userData.displayName || userData.email,
              avatar: userData.photoURL,
              role: userData.role
            };
          }
        }

        return {
          id: doc.id,
          ...data,
          unreadCount: unreadSnapshot.size,
          otherParticipant
        };
      })
    );

    res.json({
      conversations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: conversations.length === limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/conversations/:id/messages', auth, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Verify user has access to this conversation
    const conversationDoc = await db.collection('conversations').doc(req.params.id).get();
    if (!conversationDoc.exists) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversationDoc.data()!;
    if (!conversation.participants.includes(req.user!.uid)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messagesSnapshot = await db.collection('messages')
      .where('conversationId', '==', req.params.id)
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum)
      .get();

    const messages = await Promise.all(
      messagesSnapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Get sender info
        let sender = null;
        if (data.senderId) {
          const senderDoc = await db.collection('users').doc(data.senderId).get();
          if (senderDoc.exists) {
            const senderData = senderDoc.data()!;
            sender = {
              id: data.senderId,
              name: senderData.displayName || senderData.email,
              avatar: senderData.photoURL,
              role: senderData.role
            };
          }
        }

        return {
          id: doc.id,
          ...data,
          sender,
          isRead: data.readBy?.includes(req.user!.uid) || false
        };
      })
    );

    // Mark messages as read
    const unreadMessages = messages.filter(m => !m.isRead && m.senderId !== req.user!.uid);
    if (unreadMessages.length > 0) {
      const batch = db.batch();
      unreadMessages.forEach(message => {
        const messageRef = db.collection('messages').doc(message.id);
        batch.update(messageRef, {
          readBy: [...(message.readBy || []), req.user!.uid],
          readAt: new Date()
        });
      });
      await batch.commit();
    }

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: messages.length === limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/conversations/:id/messages', auth, requireAuth, validateBody(sendMessageSchema), async (req, res) => {
  try {
    const { content, type = 'text', metadata } = req.body;

    // Verify conversation exists and user has access
    const conversationDoc = await db.collection('conversations').doc(req.params.id).get();
    if (!conversationDoc.exists) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversationDoc.data()!;
    if (!conversation.participants.includes(req.user!.uid)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messageData = {
      conversationId: req.params.id,
      senderId: req.user!.uid,
      content,
      type,
      metadata: metadata || {},
      readBy: [req.user!.uid],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const messageRef = await db.collection('messages').add(messageData);

    // Update conversation last message
    await db.collection('conversations').doc(req.params.id).update({
      lastMessage: content,
      lastMessageAt: new Date(),
      lastMessageBy: req.user!.uid,
      updatedAt: new Date()
    });

    // Send real-time notifications to other participants
    const otherParticipants = conversation.participants.filter((p: string) => p !== req.user!.uid);
    await Promise.all(
      otherParticipants.map(participantId =>
        sendMessageNotification(participantId, {
          conversationId: req.params.id,
          messageId: messageRef.id,
          content,
          senderName: req.user!.displayName || req.user!.email
        })
      )
    );

    res.json({
      id: messageRef.id,
      ...messageData
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/conversations', auth, requireAuth, async (req, res) => {
  try {
    const { participantId, initialMessage } = req.body;

    // Check if conversation already exists between these users
    const existingConversation = await db.collection('conversations')
      .where('participants', 'array-contains', req.user!.uid)
      .where('type', '==', 'direct')
      .get();

    let conversationId = null;

    for (const doc of existingConversation.docs) {
      const data = doc.data();
      if (data.participants.includes(participantId) && data.participants.length === 2) {
        conversationId = doc.id;
        break;
      }
    }

    // Create new conversation if none exists
    if (!conversationId) {
      const conversationData = {
        participants: [req.user!.uid, participantId],
        type: 'direct',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: initialMessage || '',
        lastMessageAt: new Date(),
        lastMessageBy: req.user!.uid
      };

      const conversationRef = await db.collection('conversations').add(conversationData);
      conversationId = conversationRef.id;
    }

    // Send initial message if provided
    if (initialMessage) {
      await db.collection('messages').add({
        conversationId,
        senderId: req.user!.uid,
        content: initialMessage,
        type: 'text',
        readBy: [req.user!.uid],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await db.collection('conversations').doc(conversationId).update({
        lastMessage: initialMessage,
        lastMessageAt: new Date(),
        lastMessageBy: req.user!.uid,
        updatedAt: new Date()
      });
    }

    res.json({ conversationId });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/notifications', auth, requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, read } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    let query = db.collection('notifications')
      .where('userId', '==', req.user!.uid)
      .orderBy('createdAt', 'desc');

    if (type) {
      query = query.where('type', '==', type);
    }

    if (read !== undefined) {
      query = query.where('read', '==', read === 'true');
    }

    const snapshot = await query.limit(limitNum).offset((pageNum - 1) * limitNum).get();
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: notifications.length === limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:id/read', auth, requireAuth, async (req, res) => {
  try {
    const notificationDoc = await db.collection('notifications').doc(req.params.id).get();

    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = notificationDoc.data()!;

    if (notification.userId !== req.user!.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.collection('notifications').doc(req.params.id).update({
      read: true,
      readAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.put('/notifications/mark-all-read', auth, requireAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.user!.uid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: new Date(),
        updatedAt: new Date()
      });
    });

    await batch.commit();

    res.json({ message: `${snapshot.size} notifications marked as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

router.get('/unread-count', auth, requireAuth, async (req, res) => {
  try {
    const [messagesSnapshot, notificationsSnapshot] = await Promise.all([
      db.collection('messages')
        .where('readBy', 'not-in', [req.user!.uid])
        .where('senderId', '!=', req.user!.uid)
        .get(),
      db.collection('notifications')
        .where('userId', '==', req.user!.uid)
        .where('read', '==', false)
        .get()
    ]);

    res.json({
      messages: messagesSnapshot.size,
      notifications: notificationsSnapshot.size,
      total: messagesSnapshot.size + notificationsSnapshot.size
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Helper function to send push notifications
async function sendMessageNotification(userId: string, messageData: any) {
  try {
    // Get user's FCM tokens
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.fcmTokens || userData.fcmTokens.length === 0) {
      return;
    }

    const notification = {
      title: `Nuovo messaggio da ${messageData.senderName}`,
      body: messageData.content.length > 100
        ? messageData.content.substring(0, 100) + '...'
        : messageData.content,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `conversation-${messageData.conversationId}`,
      data: {
        type: 'message',
        conversationId: messageData.conversationId,
        messageId: messageData.messageId
      }
    };

    // Send to all user's devices
    const promises = userData.fcmTokens.map((token: string) =>
      fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: token,
          notification,
          data: notification.data
        })
      })
    );

    await Promise.allSettled(promises);

    // Store notification in database
    await db.collection('notifications').add({
      userId,
      type: 'message',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      read: false,
      createdAt: new Date()
    });

  } catch (error) {
    console.error('Error sending message notification:', error);
  }
}

export default router;
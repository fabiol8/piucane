import { db } from '../config/firebase';
import { logger } from './logger';

interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  metadata?: {
    timestamp?: string;
    source?: string;
    version?: string;
  };
}

interface CTAEvent {
  ctaId: string;
  userId?: string;
  sessionId?: string;
  elementType?: string;
  location?: string;
  properties?: Record<string, any>;
}

/**
 * Track analytics event to Firestore
 */
export const trackEvent = async (event: AnalyticsEvent): Promise<void> => {
  try {
    const eventData = {
      ...event,
      timestamp: new Date(),
      source: 'api',
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Store in Firestore analytics collection
    await db.collection('analytics').add(eventData);

    logger.info('Analytics event tracked', {
      event: event.event,
      userId: event.userId,
      timestamp: eventData.timestamp
    });

  } catch (error) {
    // Don't fail the main request if analytics tracking fails
    logger.error('Failed to track analytics event', error);
  }
};

/**
 * Track CTA interaction
 */
export const trackCTA = async (ctaEvent: CTAEvent): Promise<void> => {
  try {
    const ctaData = {
      ...ctaEvent,
      timestamp: new Date(),
      source: 'api',
      environment: process.env.NODE_ENV || 'development'
    };

    // Store in Firestore CTA tracking collection
    await db.collection('ctaTracking').add(ctaData);

    // Also track as general analytics event
    await trackEvent({
      event: 'cta_interaction',
      userId: ctaEvent.userId,
      sessionId: ctaEvent.sessionId,
      properties: {
        ctaId: ctaEvent.ctaId,
        elementType: ctaEvent.elementType,
        location: ctaEvent.location,
        ...ctaEvent.properties
      }
    });

    logger.info('CTA interaction tracked', {
      ctaId: ctaEvent.ctaId,
      userId: ctaEvent.userId,
      timestamp: ctaData.timestamp
    });

  } catch (error) {
    logger.error('Failed to track CTA interaction', error);
  }
};

/**
 * Track user journey step
 */
export const trackJourneyStep = async (
  userId: string,
  step: string,
  properties?: Record<string, any>
): Promise<void> => {
  await trackEvent({
    event: 'journey_step',
    userId,
    properties: {
      step,
      ...properties
    }
  });
};

/**
 * Track business metric
 */
export const trackBusinessMetric = async (
  metric: string,
  value: number,
  properties?: Record<string, any>
): Promise<void> => {
  try {
    const metricData = {
      metric,
      value,
      timestamp: new Date(),
      properties: properties || {},
      environment: process.env.NODE_ENV || 'development'
    };

    await db.collection('businessMetrics').add(metricData);

    logger.info('Business metric tracked', {
      metric,
      value,
      timestamp: metricData.timestamp
    });

  } catch (error) {
    logger.error('Failed to track business metric', error);
  }
};

/**
 * Track error for analytics
 */
export const trackError = async (
  error: Error,
  context?: Record<string, any>
): Promise<void> => {
  await trackEvent({
    event: 'error_occurred',
    properties: {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      ...context
    }
  });
};

/**
 * Track performance metric
 */
export const trackPerformance = async (
  operation: string,
  duration: number,
  properties?: Record<string, any>
): Promise<void> => {
  await trackEvent({
    event: 'performance_metric',
    properties: {
      operation,
      duration,
      ...properties
    }
  });
};

/**
 * Batch track multiple events (for better performance)
 */
export const trackEventsBatch = async (events: AnalyticsEvent[]): Promise<void> => {
  try {
    const batch = db.batch();

    events.forEach(event => {
      const eventData = {
        ...event,
        timestamp: new Date(),
        source: 'api',
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      const docRef = db.collection('analytics').doc();
      batch.set(docRef, eventData);
    });

    await batch.commit();

    logger.info('Analytics events batch tracked', {
      eventCount: events.length,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Failed to track analytics events batch', error);
  }
};

/**
 * Create a session-based analytics tracker
 */
export class SessionAnalytics {
  private sessionId: string;
  private userId?: string;
  private startTime: Date;

  constructor(sessionId: string, userId?: string) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.startTime = new Date();
  }

  async track(event: string, properties?: Record<string, any>): Promise<void> {
    await trackEvent({
      event,
      userId: this.userId,
      sessionId: this.sessionId,
      properties: {
        sessionDuration: Date.now() - this.startTime.getTime(),
        ...properties
      }
    });
  }

  async trackCTA(ctaId: string, properties?: Record<string, any>): Promise<void> {
    await trackCTA({
      ctaId,
      userId: this.userId,
      sessionId: this.sessionId,
      properties
    });
  }

  async endSession(): Promise<void> {
    const sessionDuration = Date.now() - this.startTime.getTime();

    await this.track('session_end', {
      sessionDuration,
      endTime: new Date().toISOString()
    });
  }
}

// Export types for use in other modules
export type { AnalyticsEvent, CTAEvent };
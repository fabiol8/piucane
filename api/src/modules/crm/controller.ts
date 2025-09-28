import { Request, Response } from 'express';
import { z } from 'zod';
import { CustomerSegmentationEngine } from './segmentation';
import { CustomerJourneyEngine } from './journey-engine';
import {
  CustomerProfile,
  CustomerSegment,
  CustomerJourney,
  JourneyParticipant,
  CampaignTemplate,
  PersonalizationRule,
  CRMEvent,
  CRMAnalytics,
  SegmentInsights
} from './types';

// Validation schemas
const segmentSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'in', 'not_in', 'contains', 'not_contains', 'exists', 'not_exists', 'between']),
    value: z.any(),
    logicalOperator: z.enum(['AND', 'OR']).optional()
  })),
  isActive: z.boolean().default(true)
});

const journeySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  triggerConditions: z.array(z.any()),
  steps: z.array(z.any()),
  isActive: z.boolean().default(true),
  settings: z.object({
    maxParticipants: z.number().optional(),
    endDate: z.date().optional(),
    timezone: z.string().default('Europe/Rome'),
    workingHours: z.object({
      start: z.string(),
      end: z.string()
    }).optional(),
    blacklistDays: z.array(z.string()).optional()
  })
});

const eventSchema = z.object({
  userId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.any()),
  source: z.enum(['web', 'mobile', 'api', 'system']).default('api'),
  sessionId: z.string().optional(),
  deviceInfo: z.object({
    userAgent: z.string(),
    ip: z.string(),
    location: z.object({
      city: z.string(),
      country: z.string()
    }).optional()
  }).optional()
});

export class CRMController {
  private segmentationEngine: CustomerSegmentationEngine;
  private journeyEngine: CustomerJourneyEngine;

  constructor() {
    this.segmentationEngine = new CustomerSegmentationEngine();
    this.journeyEngine = new CustomerJourneyEngine(this.segmentationEngine);
  }

  // Customer Segmentation Endpoints
  async getSegments(req: Request, res: Response): Promise<void> {
    try {
      const segments = this.segmentationEngine.getAllSegments();
      res.json({
        success: true,
        data: segments,
        total: segments.length
      });
    } catch (error) {
      console.error('Error getting segments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve segments'
      });
    }
  }

  async getSegment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const segment = this.segmentationEngine.getSegment(id);

      if (!segment) {
        res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: segment
      });
    } catch (error) {
      console.error('Error getting segment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve segment'
      });
    }
  }

  async createSegment(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = segmentSchema.parse(req.body);

      const segment: CustomerSegment = {
        id: `segment_${Date.now()}`,
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.user?.uid || 'system'
      };

      this.segmentationEngine.addSegment(segment);

      res.status(201).json({
        success: true,
        data: segment
      });
    } catch (error) {
      console.error('Error creating segment:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create segment'
        });
      }
    }
  }

  async updateSegment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = segmentSchema.partial().parse(req.body);

      const success = this.segmentationEngine.updateSegment(id, updates);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
        return;
      }

      const updatedSegment = this.segmentationEngine.getSegment(id);
      res.json({
        success: true,
        data: updatedSegment
      });
    } catch (error) {
      console.error('Error updating segment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update segment'
      });
    }
  }

  async deleteSegment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = this.segmentationEngine.deleteSegment(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Segment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting segment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete segment'
      });
    }
  }

  async evaluateUserSegments(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // TODO: Fetch user profile from database
      const userProfile: CustomerProfile = req.body.profile;

      if (!userProfile) {
        res.status(400).json({
          success: false,
          error: 'User profile is required'
        });
        return;
      }

      const segments = await this.segmentationEngine.evaluateCustomerSegments(userProfile);

      res.json({
        success: true,
        data: {
          userId,
          segments,
          segmentCount: segments.length
        }
      });
    } catch (error) {
      console.error('Error evaluating user segments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate user segments'
      });
    }
  }

  async getSegmentInsights(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const period = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      // TODO: Fetch customer profiles from database
      const profiles: CustomerProfile[] = [];

      const insights = await this.segmentationEngine.generateSegmentInsights(id, profiles, period);

      if (!insights) {
        res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error getting segment insights:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve segment insights'
      });
    }
  }

  // Customer Journey Endpoints
  async getJourneys(req: Request, res: Response): Promise<void> {
    try {
      const journeys = this.journeyEngine.getAllJourneys();
      res.json({
        success: true,
        data: journeys,
        total: journeys.length
      });
    } catch (error) {
      console.error('Error getting journeys:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve journeys'
      });
    }
  }

  async getJourney(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const journey = this.journeyEngine.getJourney(id);

      if (!journey) {
        res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
        return;
      }

      res.json({
        success: true,
        data: journey
      });
    } catch (error) {
      console.error('Error getting journey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve journey'
      });
    }
  }

  async createJourney(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = journeySchema.parse(req.body);

      const journey: CustomerJourney = {
        id: `journey_${Date.now()}`,
        ...validatedData,
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          totalDropped: 0,
          conversionRate: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.user?.uid || 'system'
      };

      this.journeyEngine.addJourney(journey);

      res.status(201).json({
        success: true,
        data: journey
      });
    } catch (error) {
      console.error('Error creating journey:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create journey'
        });
      }
    }
  }

  async updateJourney(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = journeySchema.partial().parse(req.body);

      const success = this.journeyEngine.updateJourney(id, updates);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
        return;
      }

      const updatedJourney = this.journeyEngine.getJourney(id);
      res.json({
        success: true,
        data: updatedJourney
      });
    } catch (error) {
      console.error('Error updating journey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update journey'
      });
    }
  }

  async deleteJourney(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = this.journeyEngine.deleteJourney(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Journey deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting journey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete journey'
      });
    }
  }

  async pauseJourney(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = this.journeyEngine.pauseJourney(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Journey paused successfully'
      });
    } catch (error) {
      console.error('Error pausing journey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause journey'
      });
    }
  }

  async resumeJourney(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = this.journeyEngine.resumeJourney(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Journey resumed successfully'
      });
    } catch (error) {
      console.error('Error resuming journey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resume journey'
      });
    }
  }

  async getJourneyParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, status } = req.query;

      let participants = this.journeyEngine.getJourneyParticipants(id);

      // Filter by status if provided
      if (status) {
        participants = participants.filter(p => p.status === status);
      }

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);
      const paginatedParticipants = participants.slice(skip, skip + Number(limit));

      res.json({
        success: true,
        data: paginatedParticipants,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: participants.length,
          totalPages: Math.ceil(participants.length / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting journey participants:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve journey participants'
      });
    }
  }

  async getUserJourneys(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status } = req.query;

      let participations = this.journeyEngine.getUserParticipations(userId);

      // Filter by status if provided
      if (status) {
        participations = participations.filter(p => p.status === status);
      }

      res.json({
        success: true,
        data: participations,
        total: participations.length
      });
    } catch (error) {
      console.error('Error getting user journeys:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user journeys'
      });
    }
  }

  // Campaign Template Endpoints
  async getCampaignTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { type, publicOnly } = req.query;

      let templates = this.journeyEngine.getAllCampaignTemplates();

      if (publicOnly === 'true') {
        templates = this.journeyEngine.getPublicCampaignTemplates();
      }

      if (type) {
        templates = templates.filter(t => t.type === type);
      }

      res.json({
        success: true,
        data: templates,
        total: templates.length
      });
    } catch (error) {
      console.error('Error getting campaign templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve campaign templates'
      });
    }
  }

  async getCampaignTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = this.journeyEngine.getCampaignTemplate(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Campaign template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error getting campaign template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve campaign template'
      });
    }
  }

  // Event Processing Endpoints
  async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = eventSchema.parse(req.body);

      const event: CRMEvent = {
        id: `event_${Date.now()}`,
        ...validatedData,
        timestamp: new Date(),
        processed: false
      };

      // Process event through journey engine
      await this.journeyEngine.processUserEvent(
        event.userId,
        event.eventType,
        event.eventData
      );

      // TODO: Store event in database
      console.log('Event tracked:', event);

      res.status(201).json({
        success: true,
        data: {
          eventId: event.id,
          processed: true
        }
      });
    } catch (error) {
      console.error('Error tracking event:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to track event'
        });
      }
    }
  }

  // Analytics Endpoints
  async getCRMAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, segmentId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const period = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      // TODO: Calculate real analytics from database
      const analytics: CRMAnalytics = {
        period,
        overview: {
          totalCustomers: 1500,
          newCustomers: 120,
          activeCustomers: 850,
          churnedCustomers: 45,
          totalRevenue: 125000,
          averageLifetimeValue: 450,
          customerAcquisitionCost: 35,
          churnRate: 3.2,
          retentionRate: 78.5
        },
        segments: [],
        journeys: [],
        channels: []
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting CRM analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics'
      });
    }
  }

  async getCustomerProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // TODO: Fetch real customer profile from database
      const profile: CustomerProfile = {
        userId,
        demographics: {
          registrationDate: new Date(),
          source: 'web'
        },
        behavioral: {
          totalOrders: 5,
          totalSpent: 450,
          averageOrderValue: 90,
          orderFrequency: 1.2,
          hasActiveSubscription: true,
          favoriteCategories: ['cibo', 'salute'],
          preferredChannel: 'email',
          engagementScore: 75,
          churnRisk: 'low'
        },
        lifecycle: {
          stage: 'active',
          customerLifetimeValue: 450,
          predictedLifetimeValue: 850
        },
        dogs: {
          totalDogs: 1,
          breeds: ['Golden Retriever'],
          ages: [3],
          sizes: ['large'],
          healthConditions: []
        },
        preferences: {
          marketingConsent: true,
          emailFrequency: 'weekly',
          productInterests: ['cibo', 'salute'],
          priceRange: 'standard'
        },
        segments: [],
        lastUpdated: new Date()
      };

      // Evaluate current segments
      profile.segments = await this.segmentationEngine.evaluateCustomerSegments(profile);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Error getting customer profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve customer profile'
      });
    }
  }

  async updateCustomerProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // TODO: Update customer profile in database
      console.log(`Updating profile for user ${userId}:`, updates);

      res.json({
        success: true,
        message: 'Customer profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating customer profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update customer profile'
      });
    }
  }
}
/**
 * Authentication & Authorization Security System - PiùCane
 * Sistema di sicurezza avanzato per autenticazione, autorizzazione e protezione sessioni
 */

import { trackCTA } from '@/analytics/ga4';
import { dataProtectionManager } from './data-protection';

export interface User {
  id: string;
  email: string;
  role: 'customer' | 'admin' | 'veterinarian' | 'support' | 'moderator';
  permissions: string[];
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    verified: boolean;
    twoFactorEnabled: boolean;
  };
  security: {
    lastLogin: string;
    failedAttempts: number;
    lockedUntil?: string;
    passwordChangedAt: string;
    sessions: UserSession[];
  };
  preferences: {
    sessionTimeout: number; // minutes
    requireReauth: string[]; // actions requiring re-authentication
    allowedIPs?: string[];
    deviceTrust: boolean;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    location?: string;
    trusted: boolean;
  };
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  active: boolean;
  permissions: string[];
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  type: 'login_success' | 'login_failed' | 'logout' | 'password_change' | 'permission_denied' | 'suspicious_activity';
  details: {
    ip: string;
    userAgent: string;
    location?: string;
    reason?: string;
    resource?: string;
  };
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface RateLimitRule {
  endpoint: string;
  windowMs: number; // time window in milliseconds
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  blockDuration?: number; // block duration in milliseconds
}

class AuthSecurityManager {
  private sessions: Map<string, UserSession> = new Map();
  private rateLimitTracking: Map<string, Array<{ timestamp: number; success: boolean }>> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private trustedDevices: Map<string, string[]> = new Map(); // userId -> deviceIds[]

  private readonly rateLimitRules: RateLimitRule[] = [
    {
      endpoint: '/api/auth/login',
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      skipSuccessfulRequests: true,
      blockDuration: 30 * 60 * 1000 // 30 minutes
    },
    {
      endpoint: '/api/auth/password-reset',
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      blockDuration: 60 * 60 * 1000 // 1 hour
    },
    {
      endpoint: '/api/auth/2fa-verify',
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 3,
      blockDuration: 15 * 60 * 1000 // 15 minutes
    },
    {
      endpoint: '/api/sensitive',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10
    }
  ];

  // Rate limiting
  checkRateLimit(identifier: string, endpoint: string, success: boolean = true): boolean {
    const rule = this.rateLimitRules.find(r => endpoint.startsWith(r.endpoint));
    if (!rule) return true;

    const key = `${identifier}:${endpoint}`;
    const now = Date.now();
    const requests = this.rateLimitTracking.get(key) || [];

    // Remove old requests outside window
    const validRequests = requests.filter(req =>
      now - req.timestamp < rule.windowMs &&
      (!rule.skipSuccessfulRequests || !req.success)
    );

    // Add current request
    validRequests.push({ timestamp: now, success });
    this.rateLimitTracking.set(key, validRequests);

    // Check if limit exceeded
    const relevant = rule.skipSuccessfulRequests
      ? validRequests.filter(req => !req.success)
      : validRequests;

    const limitExceeded = relevant.length > rule.maxRequests;

    if (limitExceeded) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        details: {
          ip: identifier,
          userAgent: '',
          reason: `Rate limit exceeded for ${endpoint}`,
          resource: endpoint
        },
        severity: 'medium'
      });

      // Apply block if configured
      if (rule.blockDuration) {
        this.blockIdentifier(identifier, rule.blockDuration);
      }
    }

    return !limitExceeded;
  }

  // Authentication methods
  async authenticateUser(email: string, password: string, deviceInfo: any): Promise<{ success: boolean; user?: User; session?: UserSession; error?: string }> {
    const identifier = deviceInfo.ip;

    // Check rate limiting
    if (!this.checkRateLimit(identifier, '/api/auth/login', false)) {
      await this.logSecurityEvent({
        type: 'login_failed',
        details: {
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          reason: 'Rate limit exceeded'
        },
        severity: 'high'
      });

      return { success: false, error: 'Too many login attempts. Please try again later.' };
    }

    try {
      // Validate credentials (in produzione: hash comparison)
      const user = await this.validateCredentials(email, password);

      if (!user) {
        await this.handleFailedLogin(email, deviceInfo);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.security.lockedUntil && new Date(user.security.lockedUntil) > new Date()) {
        await this.logSecurityEvent({
          userId: user.id,
          type: 'login_failed',
          details: {
            ip: deviceInfo.ip,
            userAgent: deviceInfo.userAgent,
            reason: 'Account locked'
          },
          severity: 'medium'
        });

        return { success: false, error: 'Account temporarily locked. Please try again later.' };
      }

      // Create session
      const session = await this.createSession(user, deviceInfo);

      // Reset failed attempts on successful login
      user.security.failedAttempts = 0;
      user.security.lastLogin = new Date().toISOString();

      // Check if device is trusted
      const deviceTrusted = this.isDeviceTrusted(user.id, deviceInfo.deviceId);

      await this.logSecurityEvent({
        userId: user.id,
        type: 'login_success',
        details: {
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          location: await this.getLocationFromIP(deviceInfo.ip)
        },
        severity: deviceTrusted ? 'low' : 'medium'
      });

      // Update rate limit with success
      this.checkRateLimit(identifier, '/api/auth/login', true);

      trackCTA({
        ctaId: 'auth.login.success',
        event: 'login',
        value: 'successful',
        metadata: {
          userId: user.id,
          deviceTrusted,
          twoFactorEnabled: user.profile.twoFactorEnabled
        }
      });

      return { success: true, user, session };

    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  private async handleFailedLogin(email: string, deviceInfo: any): Promise<void> {
    // Try to find user by email to increment failed attempts
    const user = await this.findUserByEmail(email);

    if (user) {
      user.security.failedAttempts++;

      // Lock account after 5 failed attempts
      if (user.security.failedAttempts >= 5) {
        user.security.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      }

      await this.logSecurityEvent({
        userId: user.id,
        type: 'login_failed',
        details: {
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          reason: 'Invalid password'
        },
        severity: user.security.failedAttempts >= 3 ? 'high' : 'medium'
      });
    } else {
      // Log failed attempt even if user doesn't exist (for monitoring)
      await this.logSecurityEvent({
        type: 'login_failed',
        details: {
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          reason: 'User not found'
        },
        severity: 'low'
      });
    }
  }

  // Session management
  async createSession(user: User, deviceInfo: any): Promise<UserSession> {
    const sessionId = this.generateSecureToken();
    const deviceId = deviceInfo.deviceId || this.generateDeviceId(deviceInfo);

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      deviceId,
      deviceInfo: {
        userAgent: deviceInfo.userAgent,
        ip: deviceInfo.ip,
        location: await this.getLocationFromIP(deviceInfo.ip),
        trusted: this.isDeviceTrusted(user.id, deviceId)
      },
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + user.preferences.sessionTimeout * 60 * 1000).toISOString(),
      active: true,
      permissions: user.permissions
    };

    this.sessions.set(sessionId, session);
    user.security.sessions.push(session);

    // Limit concurrent sessions
    await this.enforceSessionLimits(user);

    return session;
  }

  async validateSession(sessionId: string): Promise<{ valid: boolean; session?: UserSession; user?: User }> {
    const session = this.sessions.get(sessionId);

    if (!session || !session.active) {
      return { valid: false };
    }

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      await this.invalidateSession(sessionId);
      return { valid: false };
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();

    // Get user data
    const user = await this.findUserById(session.userId);
    if (!user) {
      await this.invalidateSession(sessionId);
      return { valid: false };
    }

    return { valid: true, session, user };
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
      this.sessions.delete(sessionId);

      await this.logSecurityEvent({
        userId: session.userId,
        type: 'logout',
        details: {
          ip: session.deviceInfo.ip,
          userAgent: session.deviceInfo.userAgent,
          reason: 'Session invalidated'
        },
        severity: 'low'
      });
    }
  }

  async invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const userSessions = Array.from(this.sessions.values()).filter(
      session => session.userId === userId && session.id !== exceptSessionId
    );

    for (const session of userSessions) {
      await this.invalidateSession(session.id);
    }
  }

  // Authorization
  checkPermission(user: User, permission: string, resource?: string): boolean {
    // Admin has all permissions
    if (user.role === 'admin') return true;

    // Check specific permission
    if (user.permissions.includes(permission)) return true;

    // Check role-based permissions
    const rolePermissions = this.getRolePermissions(user.role);
    if (rolePermissions.includes(permission)) return true;

    // Resource-specific authorization
    if (resource) {
      return this.checkResourceAccess(user, permission, resource);
    }

    return false;
  }

  private getRolePermissions(role: string): string[] {
    const permissions = {
      customer: [
        'profile:read', 'profile:update',
        'dogs:read', 'dogs:create', 'dogs:update', 'dogs:delete',
        'orders:read', 'orders:create',
        'subscriptions:read', 'subscriptions:create', 'subscriptions:update',
        'reviews:create', 'reviews:update'
      ],
      veterinarian: [
        'dogs:read', 'dogs:health:read', 'dogs:health:update',
        'consultations:read', 'consultations:create', 'consultations:update',
        'recommendations:create'
      ],
      support: [
        'users:read', 'orders:read', 'orders:update',
        'tickets:read', 'tickets:create', 'tickets:update',
        'refunds:create'
      ],
      moderator: [
        'reviews:read', 'reviews:moderate',
        'content:moderate', 'reports:handle'
      ],
      admin: ['*'] // All permissions
    };

    return permissions[role] || [];
  }

  private checkResourceAccess(user: User, permission: string, resource: string): boolean {
    // Resource ownership checks
    if (resource.startsWith('user:')) {
      const resourceUserId = resource.split(':')[1];
      return user.id === resourceUserId;
    }

    if (resource.startsWith('dog:')) {
      // Check if user owns the dog
      return this.userOwnsDog(user.id, resource.split(':')[1]);
    }

    if (resource.startsWith('order:')) {
      // Check if user owns the order
      return this.userOwnsOrder(user.id, resource.split(':')[1]);
    }

    return false;
  }

  // Two-Factor Authentication
  async enableTwoFactor(userId: string, method: 'totp' | 'sms' | 'email'): Promise<{ secret?: string; qrCode?: string; backupCodes: string[] }> {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('User not found');

    const backupCodes = this.generateBackupCodes();

    if (method === 'totp') {
      const secret = this.generateTOTPSecret();
      const qrCode = this.generateQRCode(user.email, secret);

      // Store secret securely
      await this.storeTwoFactorSecret(userId, secret);

      return { secret, qrCode, backupCodes };
    }

    return { backupCodes };
  }

  async verifyTwoFactor(userId: string, code: string, method: 'totp' | 'sms' | 'email' | 'backup'): Promise<boolean> {
    if (!this.checkRateLimit(userId, '/api/auth/2fa-verify', false)) {
      return false;
    }

    const user = await this.findUserById(userId);
    if (!user) return false;

    let isValid = false;

    switch (method) {
      case 'totp':
        isValid = await this.verifyTOTP(userId, code);
        break;
      case 'backup':
        isValid = await this.verifyBackupCode(userId, code);
        break;
      default:
        isValid = false;
    }

    // Update rate limit
    this.checkRateLimit(userId, '/api/auth/2fa-verify', isValid);

    if (isValid) {
      await this.logSecurityEvent({
        userId,
        type: 'login_success',
        details: {
          ip: '',
          userAgent: '',
          reason: '2FA verification successful'
        },
        severity: 'low'
      });
    } else {
      await this.logSecurityEvent({
        userId,
        type: 'login_failed',
        details: {
          ip: '',
          userAgent: '',
          reason: '2FA verification failed'
        },
        severity: 'medium'
      });
    }

    return isValid;
  }

  // Device trust management
  trustDevice(userId: string, deviceId: string): void {
    const trustedDevices = this.trustedDevices.get(userId) || [];
    if (!trustedDevices.includes(deviceId)) {
      trustedDevices.push(deviceId);
      this.trustedDevices.set(userId, trustedDevices);
    }
  }

  isDeviceTrusted(userId: string, deviceId: string): boolean {
    const trustedDevices = this.trustedDevices.get(userId) || [];
    return trustedDevices.includes(deviceId);
  }

  // Security monitoring
  private async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: this.generateSecureToken(),
      timestamp: new Date().toISOString(),
      resolved: false,
      ...event
    };

    this.securityEvents.push(securityEvent);

    // Alert on critical events
    if (event.severity === 'critical') {
      await this.alertSecurityTeam(securityEvent);
    }

    // Auto-response for high severity events
    if (event.severity === 'high') {
      await this.autoSecurityResponse(securityEvent);
    }
  }

  async getSecurityEvents(userId?: string, severity?: string): Promise<SecurityEvent[]> {
    let events = this.securityEvents;

    if (userId) {
      events = events.filter(event => event.userId === userId);
    }

    if (severity) {
      events = events.filter(event => event.severity === severity);
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Utility methods
  private async validateCredentials(email: string, password: string): Promise<User | null> {
    // In produzione: hash password e confronta con database
    // Per ora: simulazione
    if (email === 'demo@piucane.com' && password === 'Demo123!') {
      return {
        id: 'user_demo',
        email,
        role: 'customer',
        permissions: [],
        profile: {
          firstName: 'Demo',
          lastName: 'User',
          verified: true,
          twoFactorEnabled: false
        },
        security: {
          lastLogin: new Date().toISOString(),
          failedAttempts: 0,
          passwordChangedAt: new Date().toISOString(),
          sessions: []
        },
        preferences: {
          sessionTimeout: 60, // 1 hour
          requireReauth: ['payment', 'profile_update'],
          deviceTrust: true
        }
      };
    }

    return null;
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    // In produzione: query database
    return null;
  }

  private async findUserById(userId: string): Promise<User | null> {
    // In produzione: query database
    return null;
  }

  private generateSecureToken(): string {
    return crypto.getRandomValues(new Uint8Array(32)).reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
  }

  private generateDeviceId(deviceInfo: any): string {
    // Generate device fingerprint
    const fingerprint = `${deviceInfo.userAgent}_${deviceInfo.ip}_${deviceInfo.screen}`;
    return this.hashString(fingerprint);
  }

  private hashString(input: string): string {
    // In produzione: usa crypto library appropriata
    return btoa(input).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private async getLocationFromIP(ip: string): Promise<string> {
    // In produzione: usa servizio geolocalizzazione
    return 'Italy';
  }

  private async enforceSessionLimits(user: User): Promise<void> {
    const maxSessions = 5;
    const activeSessions = user.security.sessions.filter(s => s.active);

    if (activeSessions.length > maxSessions) {
      // Remove oldest sessions
      const sessionsToRemove = activeSessions
        .sort((a, b) => new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime())
        .slice(0, activeSessions.length - maxSessions);

      for (const session of sessionsToRemove) {
        await this.invalidateSession(session.id);
      }
    }
  }

  private userOwnsDog(userId: string, dogId: string): boolean {
    // In produzione: query database
    return true; // Simplified
  }

  private userOwnsOrder(userId: string, orderId: string): boolean {
    // In produzione: query database
    return true; // Simplified
  }

  private blockIdentifier(identifier: string, duration: number): void {
    // Implement blocking logic (Redis, database, etc.)
    console.log(`Blocking ${identifier} for ${duration}ms`);
  }

  private generateTOTPSecret(): string {
    return this.generateSecureToken().substring(0, 32);
  }

  private generateQRCode(email: string, secret: string): string {
    // Generate TOTP QR code URL
    return `otpauth://totp/PiùCane:${email}?secret=${secret}&issuer=PiùCane`;
  }

  private async storeTwoFactorSecret(userId: string, secret: string): Promise<void> {
    // Store encrypted secret in database
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
  }

  private async verifyTOTP(userId: string, code: string): Promise<boolean> {
    // Implement TOTP verification
    return code === '123456'; // Simplified
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    // Implement backup code verification
    return false; // Simplified
  }

  private async alertSecurityTeam(event: SecurityEvent): Promise<void> {
    console.log('🚨 Critical Security Alert:', event);
  }

  private async autoSecurityResponse(event: SecurityEvent): Promise<void> {
    console.log('🤖 Auto Security Response:', event);
  }
}

// Singleton instance
export const authSecurityManager = new AuthSecurityManager();

// Utility functions for middleware
export function requireAuth(requiredPermission?: string) {
  return async (req: any, res: any, next: any) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validation = await authSecurityManager.validateSession(sessionId);

    if (!validation.valid) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (requiredPermission && !authSecurityManager.checkPermission(validation.user!, requiredPermission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.user = validation.user;
    req.session = validation.session;
    next();
  };
}

export function requireRole(requiredRole: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

export function rateLimit(endpoint: string) {
  return (req: any, res: any, next: any) => {
    const identifier = req.ip || req.connection.remoteAddress;

    if (!authSecurityManager.checkRateLimit(identifier, endpoint)) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    next();
  };
}
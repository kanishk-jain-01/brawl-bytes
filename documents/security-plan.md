# Security Plan

## Overview

Security is critical for protecting user data in Brawl Bytes. This document outlines comprehensive security measures including input validation, data protection, and threat mitigation strategies.

## Data Protection & Privacy

### 1. User Data Security

```typescript
interface UserDataProtection {
  // Password security
  passwordHashing: {
    algorithm: 'bcrypt';
    saltRounds: 12;
    pepperKey: string; // Additional secret
  };
  
  // Session management
  sessionSecurity: {
    tokenExpiry: 604800; // 7 days
    refreshTokenRotation: true;
    secureHttpOnly: true;
    sameSiteStrict: true;
  };
  
  // Data encryption
  dataEncryption: {
    algorithm: 'AES-256-GCM';
    keyRotation: 2592000; // 30 days
    fieldEncryption: ['email', 'personalInfo'];
  };
}

class UserDataSecurityService {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    const pepper = process.env.PASSWORD_PEPPER;
    const pepperedPassword = password + pepper;
    return await bcrypt.hash(pepperedPassword, salt);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const pepper = process.env.PASSWORD_PEPPER;
    const pepperedPassword = password + pepper;
    return await bcrypt.compare(pepperedPassword, hash);
  }

  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  encryptSensitiveData(data: string): string {
    const cipher = crypto.createCipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
}
```

### 2. API Security

```typescript
interface APISecurityConfig {
  // Rate limiting
  rateLimiting: {
    windowMs: 900000; // 15 minutes
    maxRequests: 100;
    skipSuccessfulRequests: false;
    skipFailedRequests: false;
  };
  
  // Request validation
  requestValidation: {
    maxBodySize: '10mb';
    maxUrlLength: 2048;
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'];
    requiredHeaders: ['authorization', 'content-type'];
  };
  
  // CORS configuration
  corsConfig: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
    credentials: true;
    maxAge: 86400; // 24 hours
  };
}

class APISecurityMiddleware {
  static validateRequest(req: Request, res: Response, next: NextFunction) {
    // Check content type
    if (req.method === 'POST' && !req.is('application/json')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }
    
    // Validate request size
    if (req.get('content-length') && 
        parseInt(req.get('content-length')!) > 10485760) { // 10MB
      return res.status(413).json({ error: 'Request too large' });
    }
    
    // Sanitize input
    this.sanitizeInput(req.body);
    
    next();
  }

  static sanitizeInput(data: any): void {
    if (typeof data === 'string') {
      // Remove potentially dangerous characters
      return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        data[key] = this.sanitizeInput(data[key]);
      }
    }
  }
}
```

## Authentication & Authorization

To standardize credential handling and reduce custom security code, **Passport.js** is used throughout the backend:

* **Local Strategy (`passport-local`)** – verifies email + password during `/auth/login`.
* **JWT Strategy (`passport-jwt`)** – protects all REST endpoints, Socket.io namespaces, and admin tools. Tokens are signed with `JWT_SECRET`, expire after `JWT_EXPIRES_IN`, and use `jti` for revocation.
* **Refresh Tokens** – 30-day JWTs stored in the `user_sessions` table. Rotation on every refresh mitigates replay attacks.
* **Optional OAuth providers** – Google & Discord can be added by uncommenting the `OAUTH_*` variables in `.env`.

Each Express route should include `passport.authenticate('jwt')` where applicable, and Socket.io connections are validated via `io.use(jwtGuard)`. See `documents/authentication.md` for full flow diagrams and acceptance criteria.

## Network Security

### 1. Connection Security
### **[POST-MVP] Connection Security**

```typescript
interface NetworkSecurity {
  // SSL/TLS configuration
  tlsConfig: {
    minVersion: 'TLSv1.2';
    cipherSuites: [
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256'
    ];
    certificateValidation: true;
  };
  
  // WebSocket security
  websocketSecurity: {
    maxConnections: 1000;
    heartbeatInterval: 25000;
    heartbeatTimeout: 60000;
    maxMessageSize: 1048576; // 1MB
  };
  
  // DDoS protection
  ddosProtection: {
    maxConnectionsPerIP: 5;
    connectionTimeout: 30000;
    banDuration: 3600000; // 1 hour
  };
}

class NetworkSecurityManager {
  private connectionCounts: Map<string, number> = new Map();
  private bannedIPs: Set<string> = new Set();
  private suspiciousIPs: Map<string, SuspiciousActivity> = new Map();

  validateConnection(socket: Socket): boolean {
    const clientIP = this.getClientIP(socket);
    
    // Check if IP is banned
    if (this.bannedIPs.has(clientIP)) {
      socket.disconnect(true);
      return false;
    }
    
    // Check connection limits
    const currentConnections = this.connectionCounts.get(clientIP) || 0;
    if (currentConnections >= 5) {
      this.flagSuspiciousIP(clientIP, 'connection_limit_exceeded');
      socket.disconnect(true);
      return false;
    }
    
    // Update connection count
    this.connectionCounts.set(clientIP, currentConnections + 1);
    
    return true;
  }

  flagSuspiciousIP(ip: string, reason: string): void {
    const activity = this.suspiciousIPs.get(ip) || {
      violations: [],
      firstSeen: Date.now()
    };
    
    activity.violations.push({
      reason,
      timestamp: Date.now()
    });
    
    this.suspiciousIPs.set(ip, activity);
    
    // Auto-ban if too many violations
    if (activity.violations.length >= 3) {
      this.banIP(ip, 3600000); // 1 hour ban
    }
  }
}
```

### 2. Message Authentication
### **[POST-MVP] Message Authentication**

```typescript
interface MessageAuthentication {
  // Message signing
  messageSignature: {
    algorithm: 'HMAC-SHA256';
    secretKey: string;
    timestampWindow: 300000; // 5 minutes
  };
  
  // Replay attack prevention
  replayProtection: {
    nonceSize: 16;
    nonceExpiry: 300000; // 5 minutes
    nonceStorage: 'redis';
  };
}

class MessageAuthenticator {
  private usedNonces: Set<string> = new Set();

  signMessage(message: any, timestamp: number): string {
    const payload = JSON.stringify({ ...message, timestamp });
    const signature = crypto
      .createHmac('sha256', process.env.MESSAGE_SECRET!)
      .update(payload)
      .digest('hex');
    
    return signature;
  }

  verifyMessage(message: any, signature: string, timestamp: number): boolean {
    // Check timestamp window
    const now = Date.now();
    if (Math.abs(now - timestamp) > 300000) { // 5 minutes
      return false;
    }
    
    // Check nonce for replay attacks
    if (message.nonce && this.usedNonces.has(message.nonce)) {
      return false;
    }
    
    // Verify signature
    const expectedSignature = this.signMessage(message, timestamp);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    
    if (isValid && message.nonce) {
      this.usedNonces.add(message.nonce);
      
      // Clean up old nonces
      setTimeout(() => {
        this.usedNonces.delete(message.nonce);
      }, 300000);
    }
    
    return isValid;
  }
}
```

## Monitoring & Incident Response

### 1. Security Monitoring

```typescript
interface SecurityMonitoring {
  // Metrics to track
  metrics: {
    failedLogins: number;
    suspiciousConnections: number;
    bannedPlayers: number;
    securityViolations: number;
  };
  
  // Alerting thresholds
  alertThresholds: {
    failedLoginsPerMinute: 10;
    suspiciousConnectionsPerMinute: 20;
  };
  
  // Logging configuration
  securityLogging: {
    level: 'info';
    retention: '90d';
    encryption: true;
    fields: ['timestamp', 'userId', 'action', 'ip', 'userAgent'];
  };
}

class SecurityMonitor {
  private metrics: SecurityMetrics = {
    failedLogins: 0,
    suspiciousConnections: 0,
    bannedPlayers: 0,
    securityViolations: 0
  };

  logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details
    };
    
    // Log to secure storage
    this.writeToSecureLog(logEntry);
    
    // Update metrics
    this.updateMetrics(event);
    
    // Check for alert conditions
    this.checkAlertConditions(event);
  }

  private checkAlertConditions(event: SecurityEvent): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Check failed login rate
    const recentFailedLogins = this.getEventsInTimeRange(
      'failed_login', oneMinuteAgo, now
    );
    
    if (recentFailedLogins.length > 10) {
      this.sendSecurityAlert('high_failed_login_rate', {
        count: recentFailedLogins.length,
        timeframe: '1 minute'
      });
    }
    
    // Check for coordinated attacks
    const suspiciousIPs = this.detectCoordinatedAttack(event);
    if (suspiciousIPs.length > 0) {
      this.sendSecurityAlert('coordinated_attack', {
        ips: suspiciousIPs,
        pattern: 'multiple_violations'
      });
    }
  }
}
```

### 2. Incident Response

```typescript
interface IncidentResponse {
  // Response procedures
  procedures: {
    dataBreachSuspicion: 'isolate_investigate_notify';
    ddosAttack: 'ratelimit_block_mitigate';
    accountCompromise: 'suspend_notify_investigate';
  };
  
  // Escalation levels
  escalationLevels: {
    low: 'log_monitor';
    medium: 'alert_investigate';
    high: 'immediate_response';
    critical: 'emergency_protocol';
  };
  
  // Response team contacts
  responseTeam: {
    security: 'security@brawlbytes.com';
    development: 'dev@brawlbytes.com';
    legal: 'legal@brawlbytes.com';
  };
}

class IncidentResponseSystem {
  async handleDataBreachSuspicion(suspiciousActivity: SuspiciousActivity): Promise<void> {
    // Immediate containment
    await this.isolateAffectedSystems(suspiciousActivity.affectedSystems);
    
    // Investigate
    const investigation = await this.startInvestigation({
      type: 'data_breach_suspicion',
      activity: suspiciousActivity,
      startTime: Date.now()
    });
    
    // Notify stakeholders
    await this.notifySecurityTeam(investigation);
    
    // If confirmed breach, follow legal requirements
    if (investigation.confirmed) {
      await this.initiateBreachProtocol(investigation);
    }
  }
}
```

## Compliance & Legal

### 1. Data Protection Compliance

```typescript
interface DataProtectionCompliance {
  // GDPR compliance
  gdprCompliance: {
    dataProcessingBasis: 'legitimate_interest';
    dataRetentionPeriod: '2_years';
    rightToErasure: true;
    dataPortability: true;
    consentManagement: true;
  };
  
  // CCPA compliance
  ccpaCompliance: {
    dataDisclosure: true;
    optOutRights: true;
    dataCategories: ['personal', 'gameplay', 'technical'];
    thirdPartySharing: false;
  };
  
  // Children's privacy (COPPA)
  coppaCompliance: {
    ageVerification: true;
    parentalConsent: true;
    dataMinimization: true;
    noTargetedAds: true;
  };
}

class ComplianceManager {
  async handleDataDeletionRequest(userId: string): Promise<void> {
    // Verify user identity
    const verified = await this.verifyUserIdentity(userId);
    if (!verified) {
      throw new Error('Identity verification failed');
    }
    
    // Check for legal holds
    const legalHolds = await this.checkLegalHolds(userId);
    if (legalHolds.length > 0) {
      throw new Error('Data deletion blocked by legal hold');
    }
    
    // Delete user data
    await this.deleteUserData(userId);
    
    // Log compliance action
    await this.logComplianceAction({
      type: 'data_deletion',
      userId,
      timestamp: Date.now(),
      requestedBy: 'user'
    });
  }

  async generateDataExport(userId: string): Promise<UserDataExport> {
    const userData = await this.collectUserData(userId);
    
    return {
      personalData: userData.profile,
      gameplayData: userData.matches,
      accountData: userData.settings,
      exportDate: new Date().toISOString(),
      format: 'json'
    };
  }
}
```

## Security Testing

### 1. Penetration Testing

```typescript
interface SecurityTesting {
  // Testing schedule
  testingSchedule: {
    penetrationTesting: 'quarterly';
    vulnerabilityScanning: 'monthly';
    codeReview: 'per_release';
  };
  
  // Testing scope
  testingScope: {
    network: ['ddos', 'mitm', 'injection'];
    application: ['xss', 'csrf', 'auth_bypass'];
    infrastructure: ['server_hardening', 'database_security'];
  };
}

class SecurityTestSuite {
  async runSecurityTests(): Promise<TestResults> {
    const tests = [
      this.testAuthenticationSecurity(),
      this.testInputValidation(),
      this.testDataEncryption(),
      this.testRateLimiting()
    ];
    
    const results = await Promise.all(tests);
    
    return {
      totalTests: tests.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      details: results
    };
  }

  async testAuthenticationSecurity(): Promise<TestResult> {
    // Test authentication mechanisms
    const authResult = await this.testAuthenticationFlow();
    
    return {
      testName: 'authentication_security',
      passed: authResult.secure,
      details: 'Authentication should properly validate credentials and sessions'
    };
  }
}
```

This comprehensive security plan ensures robust protection against data breaches and other security threats while maintaining compliance with privacy regulations. 
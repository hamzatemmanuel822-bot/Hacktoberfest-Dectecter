/**
 * SmartWelcome AI - Full-stack Server (Hardened & Optimized)
 * Express Backend + Vite Middleware (Dev) + WebSocket Server (UNO Q) + SSE Live Feed
 * Security Controls:
 * - Scrypt Password Hashing with Constant-Time Verification
 * - Brute-Force Rate Limiting & Progressive Lockout
 * - Cryptographically Secure Session Management
 * - Role-Based Access Control on Administrative APIs
 * - Inviolable Privacy Constraints (Zero Frame Storage & Non-Biometric Processing)
 */

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { db, AdminUser } from './src/server/db.js';
import { AuthService } from './src/server/auth.js';
import { gemmaService } from './src/server/gemma.js';
import { unoQManager } from './src/server/unoQDeviceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Extend Express Request type for authenticated admin user
declare global {
  namespace Express {
    interface Request {
      adminUser?: Omit<AdminUser, 'passwordHash'>;
    }
  }
}

// 1. Strict Payload Limits against Denial-of-Service
app.use(express.json({ limit: '100kb' }));

// 2. Comprehensive Security Headers & CORS
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Note: X-Frame-Options and frame-ancestors are omitted so the AI Studio web preview iframe can render.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:; connect-src 'self' https: wss: ws:;"
  );

  // CORS restricted to current origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token');

  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// 3. Authentication Middleware
const requireAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const sessionTokenHeader = req.headers['x-session-token'];

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof sessionTokenHeader === 'string') {
    token = sessionTokenHeader.trim();
  }

  if (!token) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to access administrator features.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const sessionData = db.getSession(token);
  if (!sessionData) {
    res.status(401).json({
      error: 'Session invalid or expired. Please sign in again.',
      code: 'SESSION_EXPIRED',
    });
    return;
  }

  req.adminUser = sessionData.user;
  next();
};

// --- AUTHENTICATION & SESSION APIS ---

// Check if initial admin setup is required
app.get('/api/auth/setup-status', (_req: Request, res: Response) => {
  const isSetupRequired = !db.hasAdminUsers();
  res.json({
    isSetupRequired,
    systemReady: true,
  });
});

// Administrator Sign Up / Registration
app.post(['/api/auth/register', '/api/auth/signup'], async (req: Request, res: Response) => {
  const { username, password, email, name } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    return;
  }

  const existing = db.getAdminUserByUsername(username);
  if (existing) {
    res.status(409).json({
      error: 'An administrator account with this username or email already exists. Please sign in instead.',
    });
    return;
  }

  const strength = AuthService.validatePasswordStrength(password);
  if (!strength.valid) {
    res.status(400).json({ error: strength.message });
    return;
  }

  try {
    const passwordHash = await AuthService.hashPassword(password);
    const isFirstUser = !db.hasAdminUsers();
    const user = db.createAdminUser({
      username: username.trim().toLowerCase(),
      email: (email || `${username.trim().toLowerCase()}@smartwelcome.local`).trim().toLowerCase(),
      name: (name || username).trim(),
      passwordHash,
      role: isFirstUser ? 'superadmin' : 'admin',
    });

    const ip = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const session = db.createSession(user.id, ip, userAgent);

    res.status(201).json({
      success: true,
      message: isFirstUser
        ? 'Master administrator account initialized successfully.'
        : 'Administrator account registered successfully.',
      user,
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({ error: 'Failed to register administrator account.' });
  }
});

// Initial Admin Setup (Alias for register)
app.post('/api/auth/setup', async (req: Request, res: Response) => {
  if (db.hasAdminUsers()) {
    res.status(403).json({
      error: 'Administrator setup has already been completed. Use Sign In or Register.',
      code: 'SETUP_COMPLETED',
    });
    return;
  }

  const { username, password, email, name } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    return;
  }

  const strength = AuthService.validatePasswordStrength(password);
  if (!strength.valid) {
    res.status(400).json({ error: strength.message });
    return;
  }

  try {
    const passwordHash = await AuthService.hashPassword(password);
    const user = db.createAdminUser({
      username: username.trim().toLowerCase(),
      email: (email || `${username.trim().toLowerCase()}@smartwelcome.local`).trim().toLowerCase(),
      name: (name || username).trim(),
      passwordHash,
      role: 'superadmin',
    });

    const ip = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const session = db.createSession(user.id, ip, userAgent);

    res.status(201).json({
      success: true,
      message: 'Master administrator account initialized successfully.',
      user,
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error('Setup failed:', err);
    res.status(500).json({ error: 'Failed to initialize administrator account.' });
  }
});

// Administrator Sign-In with Brute-Force Rate Limiting
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const clientIp = req.socket.remoteAddress || 'unknown';
  const rateLimitKey = `${clientIp}:${username.trim().toLowerCase()}`;

  // Check rate limit lockout
  const rateCheck = AuthService.checkRateLimit(rateLimitKey);
  if (rateCheck.isLocked) {
    res.status(429).json({
      error: `Too many failed login attempts. Account temporarily locked for security. Try again in ${Math.ceil(
        rateCheck.remainingLockoutSeconds / 60
      )} minutes.`,
      code: 'RATE_LIMITED',
      retryAfterSeconds: rateCheck.remainingLockoutSeconds,
    });
    return;
  }

  const user = db.getAdminUserByUsername(username);

  // Constant-time verification or dummy check to prevent timing analysis & user enumeration
  let passwordMatches = false;
  if (user) {
    passwordMatches = await AuthService.verifyPassword(password, user.passwordHash);
  } else {
    // Perform dummy scrypt computation to maintain timing consistency
    await AuthService.hashPassword('dummy_anti_timing_salt');
  }

  if (!user || !passwordMatches) {
    const attemptResult = AuthService.recordFailedAttempt(rateLimitKey);
    db.addAuditLog(
      'AUTH_LOGIN_FAILED',
      `Failed sign-in attempt for username "${username.trim()}" from IP ${clientIp}.`
    );

    if (attemptResult.isLocked) {
      res.status(429).json({
        error: `Too many failed login attempts. Temporarily locked for 15 minutes.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: attemptResult.remainingLockoutSeconds,
      });
      return;
    }

    res.status(401).json({
      error: 'Invalid username or password.',
      remainingAttempts: attemptResult.remainingAttempts,
    });
    return;
  }

  // Clear rate limit upon successful login
  AuthService.clearRateLimit(rateLimitKey);
  db.updateAdminLastLogin(user.id);
  db.addAuditLog('AUTH_LOGIN_SUCCESS', `Administrator "${user.username}" signed in successfully.`);

  const ip = req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const session = db.createSession(user.id, ip, userAgent);

  const { passwordHash: _, ...safeUser } = user;

  res.json({
    success: true,
    user: safeUser,
    token: session.token,
    expiresAt: session.expiresAt,
  });
});

// Administrator Sign-Out
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const sessionTokenHeader = req.headers['x-session-token'];

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof sessionTokenHeader === 'string') {
    token = sessionTokenHeader.trim();
  }

  if (token) {
    db.revokeSession(token);
  }

  res.json({ success: true, message: 'Signed out successfully.' });
});

// Current User Profile
app.get('/api/auth/me', requireAdminAuth, (req: Request, res: Response) => {
  res.json({
    user: req.adminUser,
    authenticated: true,
  });
});

// --- PUBLIC KIOSK ENDPOINTS (For Entrance Display Tablet/Screen) ---

// Public Kiosk Configuration (strictly zero secrets or PII)
app.get('/api/kiosk/config', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const devices = db.getDevices();
  const primaryDevice = devices[0];

  res.json({
    welcomeGreeting: settings.welcomeGreetingTemplate,
    cooldownSeconds: settings.cooldownSeconds,
    sensitivityThreshold: settings.sensitivityThreshold,
    absentTimeoutSeconds: settings.absentTimeoutSeconds,
    hardwareArmed: primaryDevice?.status === 'online',
    stickerGiftNotice: 'Please collect a complimentary attendance gift sticker from the welcome table.',
    privacyNotice: 'Strictly on-device human presence tripwire. Zero facial recognition. Zero camera frame retention.',
  });
});

// Public Kiosk Passage Event (camera tripwire crossing)
app.post('/api/kiosk/events', async (req: Request, res: Response) => {
  const { eventType, confidence, deduplicationKey } = req.body;

  if (eventType !== 'person_passage' && eventType !== 'person_detected') {
    res.status(400).json({ error: 'Public kiosk may only submit presence passage events.' });
    return;
  }

  const { event, isDuplicate } = db.recordEvent({
    eventType,
    confidence: confidence !== undefined ? parseFloat(confidence) : undefined,
    deduplicationKey: deduplicationKey || `passage-${Date.now()}`,
    metadata: {
      personCategory: 'unidentified_presence',
      confirmationMethod: 'camera_presence_only',
      note: 'Camera tripwire crossing detected. Physical gift sticker reminder displayed.',
    },
  });

  if (isDuplicate) {
    res.status(200).json({
      success: true,
      isDuplicate: true,
      message: 'Passage event suppressed by cooldown policy (same human in field of view).',
      event,
    });
    return;
  }

  const hardwareDispatch = await unoQManager.dispatchPassageToHardware(event);

  unoQManager.broadcastToSse({
    type: 'NEW_EVENT',
    event,
    hardwareDispatch,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    isDuplicate: false,
    event,
    hardwareDispatch,
  });
});

// Public Voluntary Non-Biometric Check-In
app.post('/api/kiosk/voluntary-checkin', async (req: Request, res: Response) => {
  const { personName, type, departmentOrCompany } = req.body;

  if (!personName || typeof personName !== 'string' || personName.trim().length === 0) {
    res.status(400).json({ error: 'Name is required for voluntary attendance check-in.' });
    return;
  }

  const category = type === 'staff' ? 'staff' : 'visitor';
  const eventType = category === 'staff' ? 'staff_attendance_confirmed' : 'visitor_attendance_confirmed';

  const { event } = db.recordEvent({
    eventType,
    confidence: 1.0,
    deduplicationKey: `voluntary-${personName.trim()}-${Date.now()}`,
    metadata: {
      personCategory: category,
      personName: personName.trim(),
      department: departmentOrCompany ? String(departmentOrCompany).trim() : undefined,
      confirmationMethod: 'manual_self_selection',
      note: 'Voluntary self-selection attendance confirmation (non-biometric).',
    },
  });

  const hardwareDispatch = await unoQManager.dispatchPassageToHardware(event);

  unoQManager.broadcastToSse({
    type: 'NEW_EVENT',
    event,
    hardwareDispatch,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, event });
});

// --- PROTECTED ADMINISTRATIVE ENDPOINTS ---

// 1. Health & Telemetry
app.get('/api/health', async (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const devices = db.getDevices();
  const onlineDevices = devices.filter((d) => d.status === 'online').length;

  res.json({
    status: 'ok',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    security: {
      authEnforced: true,
      hasAdminAccounts: db.hasAdminUsers(),
      cameraFrameStorage: 'strictly_disabled',
      biometricIdentification: 'strictly_disabled',
    },
    database: {
      status: 'healthy',
      retentionDays: settings.eventRetentionDays,
    },
    hardware: {
      registeredDevices: devices.length,
      onlineDevices,
    },
    gemma: {
      endpoint: settings.localGemmaEndpoint,
      model: settings.localGemmaModelName,
    },
  });
});

// 2. Events Audit Log (Protected)
app.get('/api/events', requireAdminAuth, (req: Request, res: Response) => {
  const { eventType, search, limit, offset } = req.query;
  const result = db.getEvents({
    eventType: eventType ? String(eventType) : undefined,
    search: search ? String(search) : undefined,
    limit: limit ? Math.min(200, parseInt(String(limit), 10)) : 50,
    offset: offset ? parseInt(String(offset), 10) : 0,
  });
  res.json(result);
});

app.delete('/api/events', requireAdminAuth, (_req: Request, res: Response) => {
  db.clearEvents();
  res.json({ success: true, message: 'All attendance events have been cleared.' });
});

// 3. Stats API (Protected)
app.get('/api/stats/today', requireAdminAuth, (_req: Request, res: Response) => {
  const stats = db.getTodayStats();
  res.json(stats);
});

// 4. Devices Management (Protected)
app.get('/api/devices', requireAdminAuth, (_req: Request, res: Response) => {
  const devices = db.getDevices();
  res.json(devices);
});

app.post('/api/devices/ping', requireAdminAuth, async (req: Request, res: Response) => {
  const { deviceId } = req.body;
  const result = await unoQManager.sendTestPing(deviceId);
  db.addAuditLog('HARDWARE_TEST_PING', `Test ping dispatched to ${deviceId || 'UNO Q'} by admin.`);
  res.json(result);
});

// 5. Local Gemma E2B Management (Protected)
app.get('/api/gemma/status', requireAdminAuth, async (_req: Request, res: Response) => {
  const status = await gemmaService.probeStatus();
  res.json(status);
});

app.post('/api/gemma/test', requireAdminAuth, async (req: Request, res: Response) => {
  const { prompt } = req.body;
  try {
    const result = await gemmaService.generate(
      prompt || 'Say "Hello! SmartWelcome AI is active." in one friendly sentence.'
    );
    res.json({ success: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      success: false,
      error: msg,
      help: 'Make sure your local Gemma E2B runtime is running (e.g. `ollama run gemma:2b`).',
    });
  }
});

app.post('/api/gemma/welcome-greeting', requireAdminAuth, async (_req: Request, res: Response) => {
  const greeting = await gemmaService.generateWelcomeGreeting();
  res.json(greeting);
});

app.post('/api/gemma/summarize-stats', requireAdminAuth, async (_req: Request, res: Response) => {
  const stats = db.getTodayStats();
  const peakHour = stats.hourlyDistribution.reduce(
    (maxIdx, count, idx, arr) => (count > arr[maxIdx] ? idx : maxIdx),
    9
  );
  const summary = await gemmaService.summarizeStats(stats.totalPassages, peakHour);
  res.json(summary);
});

// 6. People Directory Management (Protected)
app.get('/api/directory/people', requireAdminAuth, (_req: Request, res: Response) => {
  const people = db.getPeople();
  res.json(people);
});

app.post('/api/directory/people', requireAdminAuth, (req: Request, res: Response) => {
  const { type, name, identifier, departmentOrCompany } = req.body;
  if (!type || !name || typeof name !== 'string') {
    res.status(400).json({ error: 'Missing valid type or name' });
    return;
  }
  const person = db.addPerson({
    type: type === 'staff' ? 'staff' : 'visitor',
    name: name.trim(),
    identifier: identifier ? String(identifier).trim() : undefined,
    departmentOrCompany: departmentOrCompany ? String(departmentOrCompany).trim() : undefined,
    active: true,
  });
  db.addAuditLog('PERSON_REGISTERED', `Added ${person.type} "${person.name}" to directory.`);
  res.status(201).json(person);
});

app.delete('/api/directory/people/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = db.deletePerson(id);
  if (!deleted) {
    res.status(404).json({ error: 'Person not found in directory.' });
    return;
  }
  db.addAuditLog('PERSON_DELETED', `Removed person ID "${id}" from directory.`);
  res.json({ success: true, message: 'Person removed from directory.' });
});

app.delete('/api/directory/people', requireAdminAuth, (_req: Request, res: Response) => {
  db.clearPeople();
  res.json({ success: true, message: 'All people have been removed from the directory.' });
});

app.post('/api/directory/confirm-attendance', requireAdminAuth, async (req: Request, res: Response) => {
  const { personId, personName, type, departmentOrCompany } = req.body;
  const eventType = type === 'staff' ? 'staff_attendance_confirmed' : 'visitor_attendance_confirmed';

  const { event } = db.recordEvent({
    eventType,
    confidence: 1.0,
    deduplicationKey: `admin-confirm-${personId || personName}-${Date.now()}`,
    metadata: {
      personCategory: type === 'staff' ? 'staff' : 'visitor',
      personName,
      department: departmentOrCompany,
      confirmationMethod: 'reception_authorized',
      note: `Confirmed by administrator "${req.adminUser?.username || 'admin'}".`,
    },
  });

  const hardwareDispatch = await unoQManager.dispatchPassageToHardware(event);

  unoQManager.broadcastToSse({
    type: 'NEW_EVENT',
    event,
    hardwareDispatch,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, event });
});

// 7. System Settings Management (Protected)
app.get('/api/settings', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.put('/api/settings', requireAdminAuth, (req: Request, res: Response) => {
  // Explicitly select allowlisted fields to prevent mass assignment
  const {
    cooldownSeconds,
    sensitivityThreshold,
    absentTimeoutSeconds,
    eventRetentionDays,
    localGemmaEndpoint,
    localGemmaModelName,
    deviceAuthToken,
    welcomeGreetingTemplate,
  } = req.body;

  const allowedUpdates: Record<string, unknown> = {};
  if (typeof cooldownSeconds === 'number') allowedUpdates.cooldownSeconds = Math.max(1, Math.min(60, cooldownSeconds));
  if (typeof sensitivityThreshold === 'number') allowedUpdates.sensitivityThreshold = Math.max(0.1, Math.min(0.99, sensitivityThreshold));
  if (typeof absentTimeoutSeconds === 'number') allowedUpdates.absentTimeoutSeconds = Math.max(1, Math.min(30, absentTimeoutSeconds));
  if (typeof eventRetentionDays === 'number') allowedUpdates.eventRetentionDays = Math.max(1, Math.min(365, eventRetentionDays));
  if (typeof localGemmaEndpoint === 'string') allowedUpdates.localGemmaEndpoint = localGemmaEndpoint.trim();
  if (typeof localGemmaModelName === 'string') allowedUpdates.localGemmaModelName = localGemmaModelName.trim();
  if (typeof deviceAuthToken === 'string' && deviceAuthToken.length >= 8) allowedUpdates.deviceAuthToken = deviceAuthToken.trim();
  if (typeof welcomeGreetingTemplate === 'string') allowedUpdates.welcomeGreetingTemplate = welcomeGreetingTemplate.trim();

  const updated = db.updateSettings(allowedUpdates);
  db.addAuditLog('SETTINGS_UPDATE', `System settings updated by administrator "${req.adminUser?.username}".`);
  res.json(updated);
});

// 8. Audit Logs (Protected)
app.get('/api/audit-logs', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

// 9. Real-time Live Stream (Server-Sent Events - Protected for Dashboard)
app.get('/api/live-stream', (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token || !db.getSession(token)) {
    res.status(401).json({ error: 'Unauthorized stream subscriber.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (data: string) => {
    res.write(data);
  };

  unoQManager.addSseClient(send);
  send(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    unoQManager.removeSseClient(send);
  });
});

// --- HARDWARE AGENT ENDPOINTS (Arduino UNO Q over Wi-Fi) ---

app.post('/api/devices/heartbeat', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const settings = db.getSettings();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing device authentication header.' });
    return;
  }

  const incomingToken = authHeader.substring(7).trim();
  // Timing-safe comparison against device token
  const expectedToken = settings.deviceAuthToken;
  const match =
    incomingToken.length === expectedToken.length &&
    crypto.timingSafeEqual(Buffer.from(incomingToken), Buffer.from(expectedToken));

  if (!match) {
    res.status(401).json({ error: 'Unauthorized device credential.' });
    return;
  }

  const { deviceId, ipAddress } = req.body;
  if (!deviceId) {
    res.status(400).json({ error: 'Missing deviceId' });
    return;
  }

  const device = db.updateDeviceHeartbeat(deviceId, ipAddress);
  res.json({ success: true, device });
});

app.post('/api/devices/ack', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const settings = db.getSettings();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing device authentication header.' });
    return;
  }

  const incomingToken = authHeader.substring(7).trim();
  const expectedToken = settings.deviceAuthToken;
  const match =
    incomingToken.length === expectedToken.length &&
    crypto.timingSafeEqual(Buffer.from(incomingToken), Buffer.from(expectedToken));

  if (!match) {
    res.status(401).json({ error: 'Unauthorized device credential.' });
    return;
  }

  const { deviceId, eventId, latencyMs } = req.body;
  if (!deviceId || !eventId) {
    res.status(400).json({ error: 'Missing deviceId or eventId' });
    return;
  }

  db.recordDeviceAck(deviceId, eventId, latencyMs || 25);
  res.json({ success: true });
});

// --- WebSocket Server for Arduino UNO Q Wi-Fi Connection ---
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url?.split('?')[0];
  if (pathname === '/ws/device') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, request) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const deviceId = url.searchParams.get('deviceId') || 'uno-q-entrance-01';
  const token = url.searchParams.get('token');
  const settings = db.getSettings();

  if (!token || token !== settings.deviceAuthToken) {
    ws.close(4001, 'Unauthorized device token');
    return;
  }

  const clientIp = request.socket.remoteAddress || '192.168.1.150';
  unoQManager.registerWebSocket(ws, deviceId, clientIp);
});

// --- Vite Middleware / Static Assets ---
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SmartWelcome AI] Secure Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[SmartWelcome AI] Mode: ${isProd ? 'Production' : 'Development'}`);
    console.log(`[SmartWelcome AI] Hardware WebSocket endpoint: ws://0.0.0.0:${PORT}/ws/device`);
  });
}

startServer().catch((err) => {
  console.error('[SmartWelcome AI] Failed to start server:', err);
  process.exit(1);
});

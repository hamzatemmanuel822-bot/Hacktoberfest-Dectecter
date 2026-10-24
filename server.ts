/**
 * SmartWelcome AI - Full-stack Server
 * Express Backend + Vite Middleware (Dev) + WebSocket Server (UNO Q) + SSE Live Feed
 */

import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db.js';
import { gemmaService } from './src/server/gemma.js';
import { unoQManager } from './src/server/unoQDeviceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// CORS & Security Headers
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// --- API Routes ---

// 1. Health & Telemetry
app.get('/api/health', async (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const devices = db.getDevices();
  const onlineDevices = devices.filter((d) => d.status === 'online').length;

  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: 'healthy',
      retentionDays: settings.eventRetentionDays,
      cameraFrameStorage: 'strictly_disabled',
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

// 2. Events API
app.get('/api/events', (req: Request, res: Response) => {
  const { eventType, search, limit, offset } = req.query;
  const result = db.getEvents({
    eventType: eventType ? String(eventType) : undefined,
    search: search ? String(search) : undefined,
    limit: limit ? parseInt(String(limit), 10) : 50,
    offset: offset ? parseInt(String(offset), 10) : 0,
  });
  res.json(result);
});

app.post('/api/events', async (req: Request, res: Response) => {
  const { eventType, confidence, deduplicationKey, metadata } = req.body;

  if (!eventType) {
    res.status(400).json({ error: 'Missing required field: eventType' });
    return;
  }

  // Record event with automatic cooldown and duplicate suppression
  const { event, isDuplicate } = db.recordEvent({
    eventType,
    confidence: confidence !== undefined ? parseFloat(confidence) : undefined,
    deduplicationKey: deduplicationKey || `key-${Date.now()}`,
    metadata: metadata || {},
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

  // Dispatch hardware indicator to Arduino UNO Q over Wi-Fi
  const hardwareDispatch = await unoQManager.dispatchPassageToHardware(event);

  // Broadcast to live SSE stream for instant UI update
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

// 3. Stats API
app.get('/api/stats/today', (_req: Request, res: Response) => {
  const stats = db.getTodayStats();
  res.json(stats);
});

// 4. Devices API
app.get('/api/devices', (_req: Request, res: Response) => {
  const devices = db.getDevices();
  res.json(devices);
});

app.post('/api/devices/ping', async (req: Request, res: Response) => {
  const { deviceId } = req.body;
  const result = await unoQManager.sendTestPing(deviceId);
  res.json(result);
});

// Device agent endpoints for Arduino UNO Q
app.post('/api/devices/heartbeat', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const settings = db.getSettings();

  if (authHeader && authHeader.replace('Bearer ', '') !== settings.deviceAuthToken) {
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
  const { deviceId, eventId, latencyMs } = req.body;
  if (!deviceId || !eventId) {
    res.status(400).json({ error: 'Missing deviceId or eventId' });
    return;
  }

  db.recordDeviceAck(deviceId, eventId, latencyMs || 25);
  res.json({ success: true });
});

// 5. Local Gemma E2B Integration API
app.get('/api/gemma/status', async (_req: Request, res: Response) => {
  const status = await gemmaService.probeStatus();
  res.json(status);
});

app.post('/api/gemma/test', async (req: Request, res: Response) => {
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

app.post('/api/gemma/welcome-greeting', async (_req: Request, res: Response) => {
  const greeting = await gemmaService.generateWelcomeGreeting();
  res.json(greeting);
});

app.post('/api/gemma/summarize-stats', async (_req: Request, res: Response) => {
  const stats = db.getTodayStats();
  const peakHour = stats.hourlyDistribution.reduce(
    (maxIdx, count, idx, arr) => (count > arr[maxIdx] ? idx : maxIdx),
    9
  );
  const summary = await gemmaService.summarizeStats(stats.totalPassages, peakHour);
  res.json(summary);
});

// 6. People Directory API (Explicit non-biometric attendance)
app.get('/api/directory/people', (_req: Request, res: Response) => {
  const people = db.getPeople();
  res.json(people);
});

app.post('/api/directory/people', (req: Request, res: Response) => {
  const { type, name, identifier, departmentOrCompany } = req.body;
  if (!type || !name) {
    res.status(400).json({ error: 'Missing type or name' });
    return;
  }
  const person = db.addPerson({
    type,
    name,
    identifier,
    departmentOrCompany,
    active: true,
  });
  res.status(201).json(person);
});

app.post('/api/directory/confirm-attendance', async (req: Request, res: Response) => {
  const { personId, personName, type, departmentOrCompany, confirmationMethod } = req.body;
  const eventType = type === 'staff' ? 'staff_attendance_confirmed' : 'visitor_attendance_confirmed';

  const { event } = db.recordEvent({
    eventType,
    confidence: 1.0,
    deduplicationKey: `explicit-${personId || personName}-${Date.now()}`,
    metadata: {
      personCategory: type,
      personName,
      department: departmentOrCompany,
      confirmationMethod: confirmationMethod || 'manual_self_selection',
      note: 'Explicit self-selection attendance confirmation (non-biometric).',
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

// 7. Settings API
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.put('/api/settings', (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  db.addAuditLog('SETTINGS_UPDATE', 'System configuration updated by administrator.');
  res.json(updated);
});

// 8. Audit Logs API
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

// 9. Real-time Live Stream (Server-Sent Events)
app.get('/api/live-stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (data: string) => {
    res.write(data);
  };

  unoQManager.addSseClient(send);
  // Send initial ping
  send(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    unoQManager.removeSseClient(send);
  });
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

  if (token && token !== settings.deviceAuthToken) {
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
    console.log(`[SmartWelcome AI] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[SmartWelcome AI] Environment: ${isProd ? 'Production' : 'Development'}`);
    console.log(`[SmartWelcome AI] WebSocket endpoint: ws://0.0.0.0:${PORT}/ws/device`);
  });
}

startServer().catch((err) => {
  console.error('[SmartWelcome AI] Failed to start server:', err);
  process.exit(1);
});

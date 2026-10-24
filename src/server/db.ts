/**
 * SmartWelcome AI - Persistent Data Store
 * Stores passage events, device state, confirmed attendance, and settings.
 * Persists data to JSON file with atomic write semantics and schema versioning.
 */

import fs from 'fs';
import path from 'path';

export interface PassageEvent {
  id: string;
  eventType: 'person_detected' | 'person_passage' | 'staff_attendance_confirmed' | 'visitor_attendance_confirmed' | 'device_acknowledged' | 'device_offline' | 'device_error';
  timestamp: string; // ISO UTC
  confidence?: number;
  deduplicationKey: string;
  processingStatus: 'recorded' | 'dispatched_to_hardware' | 'acknowledged' | 'hardware_pending' | 'hardware_failed';
  hardwareAckLatencyMs?: number;
  metadata?: {
    personCategory?: 'unidentified_presence' | 'staff' | 'visitor';
    personName?: string;
    department?: string;
    confirmationMethod?: 'manual_self_selection' | 'reception_authorized' | 'camera_presence_only';
    passageDurationSeconds?: number;
    gemmaAssistedNote?: string;
    note?: string;
  };
}

export interface DeviceInfo {
  deviceId: string;
  name: string;
  ipAddress: string;
  firmwareVersion: string;
  agentVersion: string;
  status: 'online' | 'offline' | 'error';
  lastHeartbeat: string | null;
  lastAck: string | null;
  lastError: string | null;
  totalAcks: number;
  totalEventsReceived: number;
  hardwareCapabilities: {
    hasBuiltinLed: boolean;
    hasMatrix: boolean;
    matrixRows: number;
    matrixCols: number;
    supportedBridgeRpcMethods: string[];
  };
}

export interface PersonRecord {
  id: string;
  type: 'staff' | 'visitor';
  name: string;
  identifier?: string; // staff ID or visitor badge #
  departmentOrCompany?: string;
  active: boolean;
  createdAt: string;
}

export interface SystemSettings {
  cooldownSeconds: number; // default 5s
  sensitivityThreshold: number; // 0.60
  absentTimeoutSeconds: number; // 3s
  cameraFrameStorageEnabled: false; // strictly false for privacy
  eventRetentionDays: number; // 30
  localGemmaEndpoint: string; // default http://localhost:11434
  localGemmaModelName: string; // default gemma:2b or custom
  deviceAuthToken: string; // secure token for UNO Q Wi-Fi
  welcomeGreetingTemplate: string;
}

interface DatabaseSchema {
  version: number;
  events: PassageEvent[];
  devices: DeviceInfo[];
  people: PersonRecord[];
  settings: SystemSettings;
  auditLogs: {
    id: string;
    timestamp: string;
    action: string;
    details: string;
  }[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smartwelcome_db.json');

const DEFAULT_SETTINGS: SystemSettings = {
  cooldownSeconds: 5,
  sensitivityThreshold: 0.65,
  absentTimeoutSeconds: 3,
  cameraFrameStorageEnabled: false,
  eventRetentionDays: 30,
  localGemmaEndpoint: 'http://localhost:11434',
  localGemmaModelName: 'gemma:2b',
  deviceAuthToken: 'uno_q_secret_token_77a9',
  welcomeGreetingTemplate: 'Welcome! Please feel free to take an attendance gift sticker from the welcome desk.',
};

const DEFAULT_DEVICES: DeviceInfo[] = [
  {
    deviceId: 'uno-q-entrance-01',
    name: 'Main Entrance UNO Q',
    ipAddress: '192.168.1.145',
    firmwareVersion: '1.2.0-zephyr-u585',
    agentVersion: '1.0.4-linux-qrb2210',
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    lastAck: new Date(Date.now() - 45000).toISOString(),
    lastError: null,
    totalAcks: 24,
    totalEventsReceived: 25,
    hardwareCapabilities: {
      hasBuiltinLed: true,
      hasMatrix: true,
      matrixRows: 8,
      matrixCols: 12,
      supportedBridgeRpcMethods: ['setLedState', 'displayWelcomeMatrix', 'getBoardTelemetry'],
    },
  },
];

const DEFAULT_PEOPLE: PersonRecord[] = [
  {
    id: 'staff-001',
    type: 'staff',
    name: 'Alice Johnson',
    identifier: 'ENG-104',
    departmentOrCompany: 'Engineering',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-002',
    type: 'staff',
    name: 'David Chen',
    identifier: 'OPS-210',
    departmentOrCompany: 'Operations',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vis-001',
    type: 'visitor',
    name: 'Sarah Connor',
    identifier: 'VIS-902',
    departmentOrCompany: 'Tech Ventures Ltd',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all required fields exist
        return {
          version: parsed.version || 1,
          events: parsed.events || [],
          devices: parsed.devices && parsed.devices.length ? parsed.devices : DEFAULT_DEVICES,
          people: parsed.people && parsed.people.length ? parsed.people : DEFAULT_PEOPLE,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          auditLogs: parsed.auditLogs || [],
        };
      }
    } catch (err) {
      console.warn('Failed to load database, initializing defaults:', err);
    }

    const initialData: DatabaseSchema = {
      version: 1,
      events: this.generateInitialEvents(),
      devices: DEFAULT_DEVICES,
      people: DEFAULT_PEOPLE,
      settings: DEFAULT_SETTINGS,
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'SYSTEM_INIT',
          details: 'SmartWelcome AI Database Initialized with persistent storage.',
        },
      ],
    };

    this.save(initialData);
    return initialData;
  }

  private generateInitialEvents(): PassageEvent[] {
    const now = Date.now();
    return [
      {
        id: 'evt-1001',
        eventType: 'person_passage',
        timestamp: new Date(now - 3600000 * 2).toISOString(),
        confidence: 0.94,
        deduplicationKey: `passage-${now - 3600000 * 2}`,
        processingStatus: 'acknowledged',
        hardwareAckLatencyMs: 38,
        metadata: {
          personCategory: 'unidentified_presence',
          confirmationMethod: 'camera_presence_only',
          note: 'Automatic camera tripwire crossing detected. Sticker reminder displayed.',
        },
      },
      {
        id: 'evt-1002',
        eventType: 'person_passage',
        timestamp: new Date(now - 3600000 * 1.5).toISOString(),
        confidence: 0.88,
        deduplicationKey: `passage-${now - 3600000 * 1.5}`,
        processingStatus: 'acknowledged',
        hardwareAckLatencyMs: 42,
        metadata: {
          personCategory: 'unidentified_presence',
          confirmationMethod: 'camera_presence_only',
        },
      },
      {
        id: 'evt-1003',
        eventType: 'staff_attendance_confirmed',
        timestamp: new Date(now - 3600000).toISOString(),
        confidence: 1.0,
        deduplicationKey: `staff-confirm-${now - 3600000}`,
        processingStatus: 'acknowledged',
        hardwareAckLatencyMs: 35,
        metadata: {
          personCategory: 'staff',
          personName: 'Alice Johnson',
          department: 'Engineering',
          confirmationMethod: 'manual_self_selection',
          note: 'Explicit self-checkin at kiosk console (non-biometric).',
        },
      },
    ];
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // --- Events API ---
  public getEvents(options?: {
    eventType?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): { events: PassageEvent[]; total: number } {
    let filtered = [...this.data.events];

    if (options?.eventType && options.eventType !== 'all') {
      filtered = filtered.filter((e) => e.eventType === options.eventType);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          e.metadata?.personName?.toLowerCase().includes(q) ||
          e.metadata?.note?.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = filtered.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return {
      events: filtered.slice(offset, offset + limit),
      total,
    };
  }

  public recordEvent(event: Omit<PassageEvent, 'id' | 'timestamp' | 'processingStatus'>): {
    event: PassageEvent;
    isDuplicate: boolean;
  } {
    const now = Date.now();
    const cooldownMs = this.data.settings.cooldownSeconds * 1000;

    // Check recent passage events for deduplication
    const recentPassage = this.data.events.find((e) => {
      const isPassage = e.eventType === 'person_passage' || e.eventType === 'person_detected';
      const withinCooldown = now - new Date(e.timestamp).getTime() < cooldownMs;
      return isPassage && withinCooldown;
    });

    if (recentPassage && event.eventType === 'person_passage') {
      return {
        event: recentPassage,
        isDuplicate: true,
      };
    }

    const newEvent: PassageEvent = {
      ...event,
      id: `evt-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      processingStatus: 'dispatched_to_hardware',
    };

    this.data.events.unshift(newEvent);

    // Apply retention limit if needed
    if (this.data.events.length > 5000) {
      this.data.events = this.data.events.slice(0, 5000);
    }

    this.save();
    return { event: newEvent, isDuplicate: false };
  }

  public updateEventStatus(
    id: string,
    status: PassageEvent['processingStatus'],
    latencyMs?: number
  ): PassageEvent | null {
    const found = this.data.events.find((e) => e.id === id);
    if (found) {
      found.processingStatus = status;
      if (latencyMs !== undefined) {
        found.hardwareAckLatencyMs = latencyMs;
      }
      this.save();
      return found;
    }
    return null;
  }

  // --- Statistics ---
  public getTodayStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startMs = startOfDay.getTime();

    const todayEvents = this.data.events.filter(
      (e) => new Date(e.timestamp).getTime() >= startMs
    );

    const totalPassages = todayEvents.filter(
      (e) => e.eventType === 'person_passage'
    ).length;

    const confirmedStaff = todayEvents.filter(
      (e) => e.eventType === 'staff_attendance_confirmed'
    ).length;

    const confirmedVisitors = todayEvents.filter(
      (e) => e.eventType === 'visitor_attendance_confirmed'
    ).length;

    const acks = todayEvents.filter((e) => e.processingStatus === 'acknowledged');
    const ackRate = totalPassages > 0 ? (acks.length / totalPassages) * 100 : 100;

    // Hourly distribution
    const hourly = new Array(24).fill(0);
    todayEvents.forEach((e) => {
      if (e.eventType === 'person_passage') {
        const hour = new Date(e.timestamp).getHours();
        hourly[hour]++;
      }
    });

    return {
      totalPassages,
      confirmedStaff,
      confirmedVisitors,
      ackRate: Math.round(ackRate),
      hourlyDistribution: hourly,
      latestEvent: this.data.events[0] || null,
    };
  }

  // --- Devices API ---
  public getDevices(): DeviceInfo[] {
    return this.data.devices;
  }

  public updateDeviceHeartbeat(deviceId: string, ipAddress?: string): DeviceInfo | null {
    let device = this.data.devices.find((d) => d.deviceId === deviceId);
    if (!device) {
      device = {
        deviceId,
        name: `Arduino UNO Q (${deviceId})`,
        ipAddress: ipAddress || '192.168.1.150',
        firmwareVersion: '1.2.0-zephyr',
        agentVersion: '1.0.4-linux',
        status: 'online',
        lastHeartbeat: new Date().toISOString(),
        lastAck: null,
        lastError: null,
        totalAcks: 0,
        totalEventsReceived: 0,
        hardwareCapabilities: {
          hasBuiltinLed: true,
          hasMatrix: true,
          matrixRows: 8,
          matrixCols: 12,
          supportedBridgeRpcMethods: ['setLedState', 'displayWelcomeMatrix'],
        },
      };
      this.data.devices.push(device);
    } else {
      device.lastHeartbeat = new Date().toISOString();
      device.status = 'online';
      if (ipAddress) device.ipAddress = ipAddress;
    }
    this.save();
    return device;
  }

  public recordDeviceAck(deviceId: string, eventId: string, latencyMs: number) {
    const device = this.data.devices.find((d) => d.deviceId === deviceId);
    if (device) {
      device.lastAck = new Date().toISOString();
      device.totalAcks++;
      device.status = 'online';
    }
    this.updateEventStatus(eventId, 'acknowledged', latencyMs);
    this.save();
  }

  public recordDeviceError(deviceId: string, errorMessage: string) {
    const device = this.data.devices.find((d) => d.deviceId === deviceId);
    if (device) {
      device.lastError = errorMessage;
      device.status = 'error';
      this.save();
    }
  }

  // --- People Directory ---
  public getPeople(): PersonRecord[] {
    return this.data.people.filter((p) => p.active);
  }

  public addPerson(record: Omit<PersonRecord, 'id' | 'createdAt'>): PersonRecord {
    const newPerson: PersonRecord = {
      ...record,
      id: `${record.type}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.people.push(newPerson);
    this.save();
    return newPerson;
  }

  // --- Settings ---
  public getSettings(): SystemSettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    // Keep privacy rule: frame storage strictly false
    this.data.settings = {
      ...this.data.settings,
      ...partial,
      cameraFrameStorageEnabled: false, // Inviolable privacy constraint
    };
    this.save();
    return this.data.settings;
  }

  // --- Audit Logs ---
  public addAuditLog(action: string, details: string) {
    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      details,
    });
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  public getAuditLogs() {
    return this.data.auditLogs.slice(0, 50);
  }
}

export const db = new Database();

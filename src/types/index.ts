/**
 * SmartWelcome AI - Common Types
 */

export interface PassageEvent {
  id: string;
  eventType:
    | 'person_detected'
    | 'person_passage'
    | 'staff_attendance_confirmed'
    | 'visitor_attendance_confirmed'
    | 'device_acknowledged'
    | 'device_offline'
    | 'device_error';
  timestamp: string;
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
  identifier?: string;
  departmentOrCompany?: string;
  active: boolean;
  createdAt: string;
}

export interface SystemSettings {
  cooldownSeconds: number;
  sensitivityThreshold: number;
  absentTimeoutSeconds: number;
  cameraFrameStorageEnabled: false;
  eventRetentionDays: number;
  localGemmaEndpoint: string;
  localGemmaModelName: string;
  deviceAuthToken: string;
  welcomeGreetingTemplate: string;
}

export interface TodayStats {
  totalPassages: number;
  confirmedStaff: number;
  confirmedVisitors: number;
  ackRate: number;
  hourlyDistribution: number[];
  latestEvent: PassageEvent | null;
}

export interface GemmaStatus {
  status: 'connected' | 'unavailable' | 'error';
  detectedRuntime: 'ollama' | 'openai_compatible' | 'custom' | 'none';
  configuredEndpoint: string;
  modelName: string;
  availableModels: string[];
  latencyMs?: number;
  lastChecked: string;
  errorMessage?: string;
  instructionsForUser?: string;
}

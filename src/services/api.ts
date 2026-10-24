/**
 * SmartWelcome AI - API Client Service
 * Hardened with session token handling, authenticated headers, and separated kiosk routes.
 */

import { PassageEvent, DeviceInfo, PersonRecord, SystemSettings, TodayStats, GemmaStatus, AdminUser } from '../types';

const TOKEN_KEY = 'smartwelcome_admin_token';
const USER_KEY = 'smartwelcome_admin_user';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setSession(token: string, user: AdminUser, remember: boolean = true) {
    try {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // Storage error fallback
    }
  },

  clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {
      // Ignore
    }
  },

  getUser(): AdminUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};

function authHeaders(): HeadersInit {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }
  return headers;
}

export const api = {
  // --- AUTHENTICATION APIS ---

  async getSetupStatus(): Promise<{ isSetupRequired: boolean; systemReady: boolean }> {
    const res = await fetch('/api/auth/setup-status');
    return res.json();
  },

  async register(data: {
    username: string;
    password: string;
    email?: string;
    name?: string;
  }): Promise<{ success: boolean; user?: AdminUser; token?: string; error?: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok && result.success && result.token && result.user) {
      authStorage.setSession(result.token, result.user, true);
    }
    return result;
  },

  async login(
    username: string,
    password: string,
    remember: boolean = true
  ): Promise<{ success: boolean; user?: AdminUser; token?: string; error?: string; remainingAttempts?: number; retryAfterSeconds?: number }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.token && data.user) {
      authStorage.setSession(data.token, data.user, remember);
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      authStorage.clearSession();
    }
  },

  async getCurrentUser(): Promise<{ user?: AdminUser; authenticated: boolean }> {
    const token = authStorage.getToken();
    if (!token) return { authenticated: false };

    try {
      const res = await fetch('/api/auth/me', {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return { user: data.user, authenticated: true };
      }
    } catch {
      // Offline / error
    }
    authStorage.clearSession();
    return { authenticated: false };
  },

  // --- PUBLIC KIOSK APIS ---

  async getKioskConfig(): Promise<{
    welcomeGreeting: string;
    cooldownSeconds: number;
    sensitivityThreshold: number;
    absentTimeoutSeconds: number;
    hardwareArmed: boolean;
    stickerGiftNotice: string;
    privacyNotice: string;
  }> {
    const res = await fetch('/api/kiosk/config');
    return res.json();
  },

  async recordKioskPassage(payload: {
    eventType: 'person_passage' | 'person_detected';
    confidence?: number;
    deduplicationKey?: string;
  }): Promise<{ success: boolean; isDuplicate: boolean; event: PassageEvent; message?: string }> {
    const res = await fetch('/api/kiosk/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async recordVoluntaryCheckin(payload: {
    personName: string;
    type: 'staff' | 'visitor';
    departmentOrCompany?: string;
  }): Promise<{ success: boolean; event: PassageEvent }> {
    const res = await fetch('/api/kiosk/voluntary-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // --- PROTECTED ADMINISTRATIVE APIS ---

  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getTodayStats(): Promise<TodayStats> {
    const res = await fetch('/api/stats/today', {
      headers: authHeaders(),
    });
    return res.json();
  },

  async getEvents(params?: { eventType?: string; search?: string; limit?: number; offset?: number }): Promise<{
    events: PassageEvent[];
    total: number;
  }> {
    const q = new URLSearchParams();
    if (params?.eventType && params.eventType !== 'all') q.set('eventType', params.eventType);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));

    const res = await fetch(`/api/events?${q.toString()}`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async getDevices(): Promise<DeviceInfo[]> {
    const res = await fetch('/api/devices', {
      headers: authHeaders(),
    });
    return res.json();
  },

  async pingDevice(deviceId?: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const res = await fetch('/api/devices/ping', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ deviceId }),
    });
    return res.json();
  },

  async getGemmaStatus(): Promise<GemmaStatus> {
    const res = await fetch('/api/gemma/status', {
      headers: authHeaders(),
    });
    return res.json();
  },

  async testGemma(prompt?: string): Promise<{
    success: boolean;
    result?: { text: string; model: string; latencyMs: number; tokensGenerated?: number };
    error?: string;
  }> {
    const res = await fetch('/api/gemma/test', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ prompt }),
    });
    return res.json();
  },

  async getWelcomeGreeting(): Promise<{
    greeting: string;
    source: 'local_gemma_e2b' | 'fallback_template';
    latencyMs?: number;
  }> {
    const res = await fetch('/api/gemma/welcome-greeting', {
      method: 'POST',
      headers: authHeaders(),
    });
    return res.json();
  },

  async getGemmaSummary(): Promise<{
    summary: string;
    source: 'local_gemma_e2b' | 'fallback_template';
    latencyMs?: number;
  }> {
    const res = await fetch('/api/gemma/summarize-stats', {
      method: 'POST',
      headers: authHeaders(),
    });
    return res.json();
  },

  async getPeople(): Promise<PersonRecord[]> {
    const res = await fetch('/api/directory/people', {
      headers: authHeaders(),
    });
    return res.json();
  },

  async addPerson(payload: {
    type: 'staff' | 'visitor';
    name: string;
    identifier?: string;
    departmentOrCompany?: string;
  }): Promise<PersonRecord> {
    const res = await fetch('/api/directory/people', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async confirmAttendance(payload: {
    personId?: string;
    personName: string;
    type: 'staff' | 'visitor';
    departmentOrCompany?: string;
  }): Promise<{ success: boolean; event: PassageEvent }> {
    const res = await fetch('/api/directory/confirm-attendance', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await fetch('/api/settings', {
      headers: authHeaders(),
    });
    return res.json();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async getAuditLogs(): Promise<Array<{ id: string; timestamp: string; action: string; details: string }>> {
    const res = await fetch('/api/audit-logs', {
      headers: authHeaders(),
    });
    return res.json();
  },

  subscribeToLiveEvents(onMessage: (data: Record<string, unknown>) => void): () => void {
    const token = authStorage.getToken();
    const url = token ? `/api/live-stream?token=${encodeURIComponent(token)}` : '/api/live-stream';
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch (err) {
        console.warn('Failed to parse SSE data:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('SSE stream disconnected, will reconnect automatically:', err);
    };

    return () => {
      es.close();
    };
  },
};

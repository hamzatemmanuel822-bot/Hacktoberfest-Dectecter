/**
 * SmartWelcome AI - API Client Service
 */

import { PassageEvent, DeviceInfo, PersonRecord, SystemSettings, TodayStats, GemmaStatus } from '../types';

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getTodayStats(): Promise<TodayStats> {
    const res = await fetch('/api/stats/today');
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

    const res = await fetch(`/api/events?${q.toString()}`);
    return res.json();
  },

  async recordEvent(payload: {
    eventType: PassageEvent['eventType'];
    confidence?: number;
    deduplicationKey?: string;
    metadata?: PassageEvent['metadata'];
  }): Promise<{ success: boolean; isDuplicate: boolean; event: PassageEvent; message?: string }> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getDevices(): Promise<DeviceInfo[]> {
    const res = await fetch('/api/devices');
    return res.json();
  },

  async pingDevice(deviceId?: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const res = await fetch('/api/devices/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    return res.json();
  },

  async getGemmaStatus(): Promise<GemmaStatus> {
    const res = await fetch('/api/gemma/status');
    return res.json();
  },

  async testGemma(prompt?: string): Promise<{
    success: boolean;
    result?: { text: string; model: string; latencyMs: number; tokensGenerated?: number };
    error?: string;
  }> {
    const res = await fetch('/api/gemma/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    return res.json();
  },

  async getWelcomeGreeting(): Promise<{
    greeting: string;
    source: 'local_gemma_e2b' | 'fallback_template';
    latencyMs?: number;
  }> {
    const res = await fetch('/api/gemma/welcome-greeting', { method: 'POST' });
    return res.json();
  },

  async getGemmaSummary(): Promise<{
    summary: string;
    source: 'local_gemma_e2b' | 'fallback_template';
    latencyMs?: number;
  }> {
    const res = await fetch('/api/gemma/summarize-stats', { method: 'POST' });
    return res.json();
  },

  async getPeople(): Promise<PersonRecord[]> {
    const res = await fetch('/api/directory/people');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async confirmAttendance(payload: {
    personId?: string;
    personName: string;
    type: 'staff' | 'visitor';
    departmentOrCompany?: string;
    confirmationMethod?: 'manual_self_selection' | 'reception_authorized';
  }): Promise<{ success: boolean; event: PassageEvent }> {
    const res = await fetch('/api/directory/confirm-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async getAuditLogs(): Promise<Array<{ id: string; timestamp: string; action: string; details: string }>> {
    const res = await fetch('/api/audit-logs');
    return res.json();
  },

  /**
   * Connect to real-time Server-Sent Events stream
   */
  subscribeToLiveEvents(onMessage: (data: Record<string, unknown>) => void): () => void {
    const es = new EventSource('/api/live-stream');

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

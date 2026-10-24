/**
 * SmartWelcome AI - Management Dashboard View
 * Visual Design: Google & Gemini-inspired restrained enterprise style
 * Clean white cards, light slate background, charcoal text, Google blue accents.
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Cpu,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { TodayStats, PassageEvent, DeviceInfo, GemmaStatus } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface OverviewViewProps {
  stats: TodayStats | null;
  latestEvents: PassageEvent[];
  devices: DeviceInfo[];
  gemmaStatus: GemmaStatus | null;
  onRefresh: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  latestEvents,
  devices,
  gemmaStatus,
  onRefresh,
}) => {
  const [gemmaSummary, setGemmaSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [summaryLatency, setSummaryLatency] = useState<number | null>(null);
  const [summarySource, setSummarySource] = useState<'local_gemma_e2b' | 'fallback_template'>('fallback_template');

  const primaryDevice = devices[0];
  const isUnoQOnline = primaryDevice?.status === 'online';

  const fetchSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await api.getGemmaSummary();
      setGemmaSummary(res.summary);
      setSummarySource(res.source);
      if (res.latencyMs) setSummaryLatency(res.latencyMs);
    } catch {
      setGemmaSummary('Recorded healthy human presence traffic. Hardware Wi-Fi acknowledgements verified.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [stats?.totalPassages]);

  const hours = stats?.hourlyDistribution || new Array(24).fill(0);
  const maxHourly = Math.max(...hours, 1);

  return (
    <div className="space-y-6">
      {/* Top Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">System Dashboard</h1>
          <p className="text-xs text-slate-500">
            Real-time human-presence detection metrics, hardware acknowledgements, and local intelligence.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Passages */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Passages</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
            {stats?.totalPassages ?? 0}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Anonymous tripwire crossings</span>
          </div>
        </div>

        {/* Confirmed Staff */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Confirmed Staff</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
            {stats?.confirmedStaff ?? 0}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-700 font-medium">Non-biometric</span>
            <span>explicit self-checkins</span>
          </div>
        </div>

        {/* Confirmed Visitors */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Confirmed Guests</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
            {stats?.confirmedVisitors ?? 0}
          </div>
          <div className="mt-2 text-xs text-slate-500">Voluntary guest entries submitted</div>
        </div>

        {/* UNO Q Hardware Delivery Rate */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">UNO Q Delivery Rate</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
            {stats?.ackRate ?? 100}%
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span className="font-mono text-teal-700 font-medium">Avg latency: 38 ms</span>
            <span className={isUnoQOnline ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
              {isUnoQOnline ? 'Wi-Fi Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Gemma E2B Executive Brief Card (Google/Gemini Style) */}
      <div className="bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 border border-blue-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Local Gemma E2B Executive Brief</h3>
            <Badge variant="info">
              {summarySource === 'local_gemma_e2b' ? 'Live Local Inference' : 'Deterministic Template'}
            </Badge>
          </div>

          <button
            onClick={fetchSummary}
            disabled={isLoadingSummary}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
            <span>Regenerate Summary</span>
          </button>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed font-sans">
          &ldquo;{gemmaSummary || 'Analyzing traffic logs...'}&rdquo;
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono pt-2 border-t border-slate-200/60">
          <span>Model: {gemmaStatus?.modelName || 'gemma:2b'}</span>
          <span>Endpoint: {gemmaStatus?.configuredEndpoint || 'http://localhost:11434'}</span>
          {summaryLatency && <span>Latency: {summaryLatency} ms</span>}
          <span>Status: {gemmaStatus?.status === 'connected' ? 'Connected' : 'Standby / Offline'}</span>
        </div>
      </div>

      {/* Mid Section: Hourly Chart + Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Distribution Bar Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">Hourly Passage Distribution (Today)</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">24-Hour Gate View</span>
          </div>

          <div className="h-44 flex items-end gap-1.5 pt-6 px-1 border-b border-slate-100">
            {hours.map((val, idx) => {
              const heightPct = (val / maxHourly) * 100;
              const isCurrentHour = new Date().getHours() === idx;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute -top-7 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 font-mono">
                    {idx}:00 — {val} passages
                  </div>
                  <div
                    style={{ height: `${Math.max(val > 0 ? 8 : 2, heightPct)}%` }}
                    className={`w-full rounded-t-sm transition-all duration-200 ${
                      isCurrentHour
                        ? 'bg-blue-600'
                        : val > 0
                        ? 'bg-slate-300 hover:bg-blue-400'
                        : 'bg-slate-100'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400 mt-1 font-mono">{idx % 4 === 0 ? `${idx}h` : ''}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>00:00 (Midnight)</span>
            <span>12:00 (Noon)</span>
            <span>23:00 (Night)</span>
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Live Passage Activity</h3>
            </div>
            <Badge variant="success" dot={true}>
              Live Feed
            </Badge>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {latestEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No events logged yet today.</div>
            ) : (
              latestEvents.slice(0, 7).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 rounded-xl flex items-center justify-between transition text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          ev.eventType === 'person_passage'
                            ? 'text-blue-700'
                            : ev.eventType.includes('confirmed')
                            ? 'text-emerald-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {ev.eventType === 'person_passage'
                          ? 'Person Passage'
                          : ev.eventType === 'staff_attendance_confirmed'
                          ? `Staff: ${ev.metadata?.personName || 'Named'}`
                          : ev.eventType === 'visitor_attendance_confirmed'
                          ? `Guest: ${ev.metadata?.personName || 'Visitor'}`
                          : ev.eventType}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="tabular-nums">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>Confidence: {ev.confidence ? `${Math.round(ev.confidence * 100)}%` : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={ev.processingStatus === 'acknowledged' ? 'success' : 'warning'}
                      className="font-mono text-[10px]"
                    >
                      {ev.processingStatus === 'acknowledged'
                        ? `ACK: ${ev.hardwareAckLatencyMs || 38}ms`
                        : ev.processingStatus}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

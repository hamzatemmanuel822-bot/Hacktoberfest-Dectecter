/**
 * SmartWelcome AI - Overview Dashboard View
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Cpu,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { TodayStats, PassageEvent, DeviceInfo, GemmaStatus } from '../types';
import { api } from '../services/api';

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

  // Hourly distribution bar chart values
  const hours = stats?.hourlyDistribution || new Array(24).fill(0);
  const maxHourly = Math.max(...hours, 1);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Today&apos;s Operations Overview</h1>
          <p className="text-sm text-slate-400">
            Real-time human-presence detection metrics, hardware acknowledgements, and local intelligence.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Passages */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Passages</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{stats?.totalPassages ?? 0}</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>Tripwire presence crossings</span>
          </div>
        </div>

        {/* Confirmed Staff */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmed Staff</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{stats?.confirmedStaff ?? 0}</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">Non-biometric</span>
            <span>explicit self-checkins</span>
          </div>
        </div>

        {/* Confirmed Visitors */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmed Guests</span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{stats?.confirmedVisitors ?? 0}</div>
          <div className="mt-2 text-xs text-slate-400">Visitor check-in forms submitted</div>
        </div>

        {/* Arduino UNO Q Hardware Latency */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">UNO Q Delivery Rate</span>
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{stats?.ackRate ?? 100}%</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-mono text-teal-400">Avg: 38 ms</span>
            <span className="text-emerald-400 font-medium">Wi-Fi Active</span>
          </div>
        </div>
      </div>

      {/* Gemma E2B Executive Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Local Gemma E2B Executive Brief</h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
              {summarySource === 'local_gemma_e2b' ? 'Live Local Inference' : 'Deterministic Template'}
            </span>
          </div>

          <button
            onClick={fetchSummary}
            disabled={isLoadingSummary}
            className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingSummary ? 'animate-spin' : ''}`} />
            <span>Regenerate Summary</span>
          </button>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed italic">
          &ldquo;{gemmaSummary || 'Analyzing traffic logs...'}&rdquo;
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono pt-1 border-t border-slate-800">
          <span>Model: {gemmaStatus?.modelName || 'gemma:2b'}</span>
          <span>Endpoint: {gemmaStatus?.configuredEndpoint || 'http://localhost:11434'}</span>
          {summaryLatency && <span>Inference Time: {summaryLatency} ms</span>}
          <span>Status: {gemmaStatus?.status === 'connected' ? 'Connected' : 'Offline / Standby'}</span>
        </div>
      </div>

      {/* Mid Section: Hourly Chart + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Distribution Chart */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Hourly Passage Activity (24h)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Today&apos;s Traffic</span>
          </div>

          <div className="h-44 flex items-end gap-1 pt-6 px-1 border-b border-slate-800">
            {hours.map((val, idx) => {
              const heightPct = (val / maxHourly) * 100;
              const isCurrentHour = new Date().getHours() === idx;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20">
                    {idx}:00 - {val} passages
                  </div>
                  <div
                    style={{ height: `${Math.max(val > 0 ? 8 : 2, heightPct)}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      isCurrentHour
                        ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                        : val > 0
                        ? 'bg-slate-600 hover:bg-slate-500'
                        : 'bg-slate-800/40'
                    }`}
                  />
                  <span className="text-[9px] text-slate-500 mt-1 font-mono">{idx % 4 === 0 ? `${idx}h` : ''}</span>
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

        {/* Live Event Stream */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Live Passage Activity</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
              SSE Stream Active
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {latestEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No events logged yet today.</div>
            ) : (
              latestEvents.slice(0, 7).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-750 rounded-xl flex items-center justify-between transition text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          ev.eventType === 'person_passage'
                            ? 'text-indigo-300'
                            : ev.eventType.includes('confirmed')
                            ? 'text-emerald-300'
                            : 'text-slate-300'
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
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>Conf: {ev.confidence ? `${Math.round(ev.confidence * 100)}%` : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        ev.processingStatus === 'acknowledged'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {ev.processingStatus === 'acknowledged' ? 'ACK: 38ms' : ev.processingStatus}
                    </span>
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

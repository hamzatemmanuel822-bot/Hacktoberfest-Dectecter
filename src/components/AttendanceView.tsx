/**
 * SmartWelcome AI - Attendance & Event History View
 * Searchable, filterable audit log of presence events, non-biometric confirmations,
 * and hardware acknowledgements with CSV/JSON export.
 */

import React, { useState } from 'react';
import { Search, Download, Filter, Calendar, CheckCircle2, Clock, Cpu, UserCheck, ShieldAlert } from 'lucide-react';
import { PassageEvent } from '../types';

interface AttendanceViewProps {
  events: PassageEvent[];
  onRefresh: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ events, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvents = events.filter((ev) => {
    const matchesType = filterType === 'all' || ev.eventType === filterType;
    const matchesSearch =
      searchQuery === '' ||
      ev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.metadata?.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.metadata?.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.metadata?.note?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const exportCsv = () => {
    const headers = [
      'ID',
      'Event Type',
      'Timestamp (UTC)',
      'Timestamp (Local)',
      'Confidence',
      'Status',
      'Ack Latency (ms)',
      'Person Name',
      'Category',
      'Confirmation Method',
      'Deduplication Key',
      'Notes',
    ];

    const rows = filteredEvents.map((e) => [
      e.id,
      e.eventType,
      e.timestamp,
      new Date(e.timestamp).toLocaleString(),
      e.confidence ?? 'N/A',
      e.processingStatus,
      e.hardwareAckLatencyMs ?? 'N/A',
      `"${e.metadata?.personName || ''}"`,
      e.metadata?.personCategory || 'unidentified_presence',
      e.metadata?.confirmationMethod || 'camera_presence_only',
      e.deduplicationKey,
      `"${e.metadata?.note || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `smartwelcome-events-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `smartwelcome-events-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventBadge = (type: PassageEvent['eventType']) => {
    switch (type) {
      case 'person_passage':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            <Clock className="w-3 h-3" />
            Person Passage
          </span>
        );
      case 'staff_attendance_confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <UserCheck className="w-3 h-3" />
            Staff Confirmed
          </span>
        );
      case 'visitor_attendance_confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Visitor Confirmed
          </span>
        );
      case 'person_detected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Presence Frame
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance & Event History</h1>
          <p className="text-sm text-slate-400">
            Audit-grade record of passage events, explicit non-biometric check-ins, and UNO Q hardware acks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJson}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by event ID, name, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'person_passage', label: 'Passages Only' },
            { id: 'staff_attendance_confirmed', label: 'Staff' },
            { id: 'visitor_attendance_confirmed', label: 'Visitors' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                filterType === tab.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Event ID</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Timestamp</th>
                <th className="px-5 py-3 font-semibold">Person / Category</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">UNO Q Status</th>
                <th className="px-5 py-3 font-semibold">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No matching events found.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-300 whitespace-nowrap">{e.id}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{getEventBadge(e.eventType)}</td>
                    <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                      <div>{new Date(e.timestamp).toLocaleTimeString()}</div>
                      <div className="text-[10px] text-slate-500">{new Date(e.timestamp).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {e.metadata?.personName ? (
                        <div>
                          <div className="font-semibold text-white">{e.metadata.personName}</div>
                          <div className="text-[10px] text-slate-400">{e.metadata.department || 'General'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unidentified human passage</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {e.metadata?.confirmationMethod === 'manual_self_selection'
                        ? 'Self-Entry'
                        : 'Tripwire (Optic)'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          e.processingStatus === 'acknowledged'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {e.processingStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {e.hardwareAckLatencyMs ? `${e.hardwareAckLatencyMs} ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * SmartWelcome AI - Attendance & Event History View
 * Visual Design: Google & Gemini-inspired clean enterprise style
 * Searchable, filterable audit log of presence events, non-biometric confirmations,
 * and hardware acknowledgements with CSV/JSON export.
 */

import React, { useState } from 'react';
import { Search, Download, Clock, UserCheck, CheckCircle2 } from 'lucide-react';
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Person Passage
          </span>
        );
      case 'staff_attendance_confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            Staff Confirmed
          </span>
        );
      case 'visitor_attendance_confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle2 className="w-3 h-3 text-purple-600" />
            Visitor Confirmed
          </span>
        );
      case 'person_detected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Presence Frame
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
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
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Attendance &amp; Event History</h1>
          <p className="text-xs text-slate-500">
            Audit-grade record of passage events, explicit non-biometric check-ins, and UNO Q hardware acks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJson}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by event ID, name, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        {/* Filter Tabs */}
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
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-medium">Event ID</th>
                <th className="px-5 py-3.5 font-medium">Type</th>
                <th className="px-5 py-3.5 font-medium">Timestamp</th>
                <th className="px-5 py-3.5 font-medium">Person / Category</th>
                <th className="px-5 py-3.5 font-medium">Method</th>
                <th className="px-5 py-3.5 font-medium">UNO Q Status</th>
                <th className="px-5 py-3.5 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No matching events found.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-600 whitespace-nowrap">{e.id}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{getEventBadge(e.eventType)}</td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                      <div>{new Date(e.timestamp).toLocaleTimeString()}</div>
                      <div className="text-[10px] text-slate-400">{new Date(e.timestamp).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {e.metadata?.personName ? (
                        <div>
                          <div className="font-medium text-slate-900">{e.metadata.personName}</div>
                          <div className="text-[10px] text-slate-500">{e.metadata.department || 'General'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unidentified human passage</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                      {e.metadata?.confirmationMethod === 'manual_self_selection'
                        ? 'Self-Entry'
                        : 'Tripwire (Optic)'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          e.processingStatus === 'acknowledged'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {e.processingStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">
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

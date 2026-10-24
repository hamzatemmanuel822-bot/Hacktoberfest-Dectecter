/**
 * SmartWelcome AI - Attendance & Event History View
 * Visual Design: Google & Gemini-inspired clean enterprise style
 * Searchable, filterable audit log of presence events, non-biometric confirmations,
 * and hardware acknowledgements with CSV/JSON export.
 */

import React, { useState } from 'react';
import { Search, Download, Clock, UserCheck, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';
import { PassageEvent } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

interface AttendanceViewProps {
  events: PassageEvent[];
  onRefresh: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ events, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await api.clearEvents();
      setShowClearConfirm(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to clear events:', err);
    } finally {
      setIsClearing(false);
    }
  };

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
          <Badge variant="info">
            <Clock className="w-3 h-3 text-blue-600" />
            Person Passage
          </Badge>
        );
      case 'staff_attendance_confirmed':
        return (
          <Badge variant="success">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            Staff Confirmed
          </Badge>
        );
      case 'visitor_attendance_confirmed':
        return (
          <Badge variant="warning">
            <CheckCircle2 className="w-3 h-3 text-amber-600" />
            Visitor Confirmed
          </Badge>
        );
      case 'person_detected':
        return <Badge variant="neutral">Presence Frame</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
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
          {events.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
              className="hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear History</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={events.length === 0}
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportJson}
            disabled={events.length === 0}
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON</span>
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Clear Attendance History?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will delete all logged passage events and attendance confirmations from the database. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearHistory}
                isLoading={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Clear All'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        {/* Search */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search by event ID, name, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
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
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 mb-3.5 shadow-2xs">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">
                        {events.length === 0 ? 'No attendance or passage events yet' : 'No matching events found'}
                      </h3>
                      <p className="text-xs text-slate-500 text-center leading-relaxed">
                        {events.length === 0
                          ? 'The attendance database is clean. Automatic camera passage tripwire detections and voluntary non-biometric check-ins will appear here in real time.'
                          : 'Try adjusting your search query or switching the category filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-600 whitespace-nowrap">{e.id}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{getEventBadge(e.eventType)}</td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                      <div className="tabular-nums">{new Date(e.timestamp).toLocaleTimeString()}</div>
                      <div className="text-[10px] text-slate-400 tabular-nums">{new Date(e.timestamp).toLocaleDateString()}</div>
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
                      <Badge
                        variant={e.processingStatus === 'acknowledged' ? 'success' : 'warning'}
                        dot={true}
                        className="font-mono text-[10px]"
                      >
                        {e.processingStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600 tabular-nums">
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

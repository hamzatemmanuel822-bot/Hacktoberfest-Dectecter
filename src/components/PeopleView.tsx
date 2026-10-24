/**
 * SmartWelcome AI - People Directory View
 * Visual Design: Google & Gemini-inspired clean enterprise style
 * Voluntary non-biometric registration and check-in for staff and regular guests.
 */

import React, { useState } from 'react';
import { UserCheck, UserPlus, Search, Building2, Check, CheckCircle2, X } from 'lucide-react';
import { PersonRecord, PassageEvent } from '../types';
import { api } from '../services/api';

interface PeopleViewProps {
  people: PersonRecord[];
  onPersonAdded: (person: PersonRecord) => void;
  onEventCreated: (event: PassageEvent) => void;
  onRefresh: () => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  people,
  onPersonAdded,
  onEventCreated,
  onRefresh,
}) => {
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'staff' | 'visitor'>('staff');
  const [identifier, setIdentifier] = useState<string>('');
  const [departmentOrCompany, setDepartmentOrCompany] = useState<string>('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredPeople = people.filter((p) => {
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.departmentOrCompany?.toLowerCase().includes(search.toLowerCase()) ||
      p.identifier?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const created = await api.addPerson({
        name: name.trim(),
        type,
        identifier: identifier.trim() || undefined,
        departmentOrCompany: departmentOrCompany.trim() || undefined,
      });

      onPersonAdded(created);
      setName('');
      setIdentifier('');
      setDepartmentOrCompany('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to add person:', err);
    }
  };

  const handleQuickCheckin = async (person: PersonRecord) => {
    setCheckingInId(person.id);
    try {
      const res = await api.confirmAttendance({
        personId: person.id,
        personName: person.name,
        type: person.type,
        departmentOrCompany: person.departmentOrCompany,
      });

      if (res.success && res.event) {
        onEventCreated(res.event);
        setSuccessMessage(`Attendance logged for ${person.name}.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Checkin failed:', err);
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">People Directory &amp; Attendance</h1>
          <p className="text-xs text-slate-500">
            Approved non-biometric staff and guest directory for voluntary identity confirmation.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register Person</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search directory by name, badge ID, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {['all', 'staff', 'visitor'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition cursor-pointer ${
                filterType === tab
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === 'all' ? 'All Directory' : tab === 'staff' ? 'Staff Members' : 'Visitors'}
            </button>
          ))}
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPeople.map((person) => (
          <div
            key={person.id}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{person.name}</h2>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{person.departmentOrCompany || 'General'}</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    person.type === 'staff'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-purple-50 border-purple-200 text-purple-700'
                  }`}
                >
                  {person.type}
                </span>
              </div>

              {person.identifier && (
                <div className="text-[11px] font-mono text-slate-500">
                  ID: <span className="text-slate-800">{person.identifier}</span>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Added {new Date(person.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => handleQuickCheckin(person)}
                disabled={checkingInId === person.id}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{checkingInId === person.id ? 'Logging...' : 'Check In'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Register New Person</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Person Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('staff')}
                    className={`py-2 rounded-xl border font-medium transition cursor-pointer ${
                      type === 'staff'
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('visitor')}
                    className={`py-2 rounded-xl border font-medium transition cursor-pointer ${
                      type === 'visitor'
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Visitor
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Gonzalez"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Badge or Staff ID (Optional)</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. STF-4402"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Department / Organization</label>
                <input
                  type="text"
                  value={departmentOrCompany}
                  onChange={(e) => setDepartmentOrCompany(e.target.value)}
                  placeholder="e.g. Operations or Acme Partner Corp"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

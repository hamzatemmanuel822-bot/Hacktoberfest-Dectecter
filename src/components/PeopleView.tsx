/**
 * SmartWelcome AI - People Directory View
 * Voluntary non-biometric registration and check-in for staff and regular guests.
 */

import React, { useState } from 'react';
import { UserCheck, UserPlus, Search, Building2, ShieldCheck, Check, CheckCircle2 } from 'lucide-react';
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
        confirmationMethod: 'reception_authorized',
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
          <h1 className="text-2xl font-bold text-white tracking-tight">People Directory &amp; Explicit Attendance</h1>
          <p className="text-sm text-slate-400">
            Approved non-biometric staff and guest directory for voluntary identity confirmation.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-900/40"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register Person</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search directory by name, badge ID, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {['all', 'staff', 'visitor'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition cursor-pointer ${
                filterType === tab
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-750'
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
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">{person.name}</h2>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{person.departmentOrCompany || 'General'}</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    person.type === 'staff'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  }`}
                >
                  {person.type}
                </span>
              </div>

              {person.identifier && (
                <div className="text-[11px] font-mono text-slate-400">
                  ID: <span className="text-slate-300">{person.identifier}</span>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Added {new Date(person.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => handleQuickCheckin(person)}
                disabled={checkingInId === person.id}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Register New Person</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Person Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('staff')}
                    className={`py-2 rounded-xl border font-semibold transition cursor-pointer ${
                      type === 'staff'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('visitor')}
                    className={`py-2 rounded-xl border font-semibold transition cursor-pointer ${
                      type === 'visitor'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Visitor
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Gonzalez"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Badge or Staff ID (Optional)</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. STF-4402"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Department / Organization</label>
                <input
                  type="text"
                  value={departmentOrCompany}
                  onChange={(e) => setDepartmentOrCompany(e.target.value)}
                  placeholder="e.g. Customer Support or Partner Inc."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
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

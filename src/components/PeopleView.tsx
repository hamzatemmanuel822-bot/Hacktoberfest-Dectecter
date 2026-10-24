/**
 * SmartWelcome AI - People Directory View
 * Visual Design: Google & Gemini-inspired clean enterprise style
 * Voluntary non-biometric registration and check-in for staff and regular guests.
 */

import React, { useState } from 'react';
import { UserPlus, Search, Building2, Check, X, Users, Trash2, CheckCircle2 } from 'lucide-react';
import { PersonRecord, PassageEvent } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDeletePerson = async (id: string, personName: string) => {
    setDeletingId(id);
    try {
      await api.deletePerson(id);
      setSuccessMessage(`Removed ${personName} from directory.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete person:', err);
    } finally {
      setDeletingId(null);
    }
  };

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

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register Person</span>
        </Button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search directory by name, badge ID, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
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

      {/* People Grid or Empty State */}
      {filteredPeople.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mx-auto text-blue-600 mb-4 shadow-2xs">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            {people.length === 0 ? 'No registered personnel yet' : 'No personnel found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
            {people.length === 0
              ? 'The directory is completely empty. You can register staff members or frequent guests using the button below for voluntary non-biometric check-in.'
              : 'Try clearing your search term or switching the type filter tab.'}
          </p>
          {people.length === 0 && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register First Person</span>
            </Button>
          )}
        </div>
      ) : (
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
                  <Badge variant={person.type === 'staff' ? 'success' : 'warning'}>
                    {person.type}
                  </Badge>
                </div>

                {person.identifier && (
                  <div className="text-[11px] font-mono text-slate-500">
                    ID: <span className="text-slate-800">{person.identifier}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {new Date(person.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePerson(person.id, person.name)}
                    disabled={deletingId === person.id}
                    title="Remove from directory"
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleQuickCheckin(person)}
                    isLoading={checkingInId === person.id}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{checkingInId === person.id ? 'Logging...' : 'Check In'}</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Register New Person</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleCreatePerson} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1.5">Person Type</label>
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

              <Input
                label="Full Name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Gonzalez"
              />

              <Input
                label="Badge or Staff ID (Optional)"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. STF-4402"
              />

              <Input
                label="Department / Organization"
                type="text"
                value={departmentOrCompany}
                onChange={(e) => setDepartmentOrCompany(e.target.value)}
                placeholder="e.g. Operations or Acme Partner Corp"
              />

              <div className="pt-2 flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!name.trim()}
                  className="flex-1"
                >
                  Save Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

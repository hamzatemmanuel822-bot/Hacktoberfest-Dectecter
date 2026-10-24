/**
 * SmartWelcome AI - Entrance Kiosk View
 *
 * Designed for public entrance kiosks:
 * - Clean, welcoming, highly readable interface
 * - Clear gift sticker instruction (strictly no QR codes or scanning)
 * - Live webcam human presence detector with privacy safeguards
 * - Hardware acknowledgement feedback badge (Arduino UNO Q)
 * - Optional explicit non-biometric staff/visitor check-in modal
 */

import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, CheckCircle2, UserCheck, ShieldAlert, Cpu, Heart, X, ArrowRight, UserPlus } from 'lucide-react';
import { VisionDetector } from './VisionDetector';
import { PassageEvent, DeviceInfo, GemmaStatus } from '../types';
import { api } from '../services/api';

interface KioskViewProps {
  onEventCreated: (event: PassageEvent) => void;
  devices: DeviceInfo[];
  gemmaStatus: GemmaStatus | null;
  latestEvent: PassageEvent | null;
}

export const KioskView: React.FC<KioskViewProps> = ({
  onEventCreated,
  devices,
  gemmaStatus,
  latestEvent,
}) => {
  const [welcomeGreeting, setWelcomeGreeting] = useState<string>(
    'Welcome! Please feel free to take an attendance gift sticker from the welcome table.'
  );
  const [greetingSource, setGreetingSource] = useState<'local_gemma_e2b' | 'fallback_template'>('fallback_template');
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState<boolean>(false);
  const [checkinType, setCheckinType] = useState<'staff' | 'visitor'>('visitor');
  const [personName, setPersonName] = useState<string>('');
  const [departmentOrCompany, setDepartmentOrCompany] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkinSuccessMessage, setCheckinSuccessMessage] = useState<string | null>(null);

  // Active UNO Q status
  const primaryDevice = devices[0];
  const isUnoQConnected = primaryDevice?.status === 'online';

  // Load welcome greeting from local Gemma E2B if available
  useEffect(() => {
    let mounted = true;
    api
      .getWelcomeGreeting()
      .then((res) => {
        if (mounted && res.greeting) {
          setWelcomeGreeting(res.greeting);
          setGreetingSource(res.source);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleManualCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.confirmAttendance({
        personName: personName.trim(),
        type: checkinType,
        departmentOrCompany: departmentOrCompany.trim() || undefined,
        confirmationMethod: 'manual_self_selection',
      });

      if (res.success && res.event) {
        onEventCreated(res.event);
        setCheckinSuccessMessage(`Thank you, ${personName}! Your ${checkinType} attendance is recorded.`);
        setPersonName('');
        setDepartmentOrCompany('');
        setTimeout(() => {
          setCheckinSuccessMessage(null);
          setIsCheckinModalOpen(false);
        }, 2500);
      }
    } catch (err) {
      console.error('Checkin failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 md:p-8 rounded-3xl border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>SmartWelcome Entrance Kiosk</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Welcome to Our Premises
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed">
              {welcomeGreeting}
            </p>

            {greetingSource === 'local_gemma_e2b' && (
              <div className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-mono">
                <Sparkles className="w-3 h-3" />
                <span>Greeting phrased dynamically by local Gemma E2B</span>
              </div>
            )}
          </div>

          {/* Physical Welcome Sticker Callout Box */}
          <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-5 md:max-w-xs shadow-xl flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Welcome Gift</span>
              <h2 className="text-sm font-semibold text-white">Physical Attendance Sticker</h2>
              <p className="text-xs text-slate-400 leading-normal">
                Take a complimentary sticker from the front desk as a keepsake. No QR code or scan needed!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Vision Camera on Left + Status & Checkin on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Computer Vision Camera Corridor */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Entrance Presence Camera</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Non-Biometric Tripwire
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Zone 01 • Main Portal</span>
          </div>

          <VisionDetector onPassageDetected={onEventCreated} />
        </div>

        {/* Right: Hardware State & Optional Check-in */}
        <div className="lg:col-span-4 space-y-5">
          {/* Hardware Status Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Arduino UNO Q Indicator</h2>
                  <p className="text-xs text-slate-400 font-mono">Wi-Fi LAN Hardware</p>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                  isUnoQConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {isUnoQConnected ? 'Online & Armed' : 'Offline'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Device Target:</span>
                <span className="font-mono text-slate-200">Qualcomm QRB2210 + STM32U585</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Network IP:</span>
                <span className="font-mono text-slate-200">{primaryDevice?.ipAddress || '192.168.1.145'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Physical Actuation:</span>
                <span className="text-emerald-400 font-medium">Onboard LED & Matrix Pulse</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Last Verified Ack:</span>
                <span className="font-mono text-slate-200">
                  {latestEvent?.hardwareAckLatencyMs ? `${latestEvent.hardwareAckLatencyMs} ms` : '38 ms'}
                </span>
              </div>
            </div>

            {/* Quick Test Ping Button */}
            <button
              onClick={() => api.pingDevice(primaryDevice?.deviceId)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Test Board LED Actuation</span>
            </button>
          </div>

          {/* Optional Explicit Sign-in CTA */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 rounded-2xl border border-indigo-500/30 p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Named Attendance Record</h2>
                <p className="text-xs text-slate-400">Optional self-checkin policy</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Camera detection counts anonymous passage. If you would like your visit explicitly logged under your name, click below.
            </p>
            <button
              onClick={() => setIsCheckinModalOpen(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 cursor-pointer"
            >
              <span>Record Named Attendance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Explicit Attendance Confirmation Modal */}
      {isCheckinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Named Attendance</h3>
                  <p className="text-xs text-slate-400">Non-biometric, explicit entry</p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckinModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkinSuccessMessage ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-emerald-300">Check-in Confirmed</h4>
                <p className="text-xs text-slate-300">{checkinSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleManualCheckin} className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">I am registering as:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckinType('visitor')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                        checkinType === 'visitor'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      Visitor / Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckinType('staff')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                        checkinType === 'staff'
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      Staff Member
                    </button>
                  </div>
                </div>

                {/* Name Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder={checkinType === 'staff' ? 'e.g. Alice Johnson' : 'e.g. Michael Smith'}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                {/* Company / Department Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {checkinType === 'staff' ? 'Department' : 'Company / Organization'}
                  </label>
                  <input
                    type="text"
                    value={departmentOrCompany}
                    onChange={(e) => setDepartmentOrCompany(e.target.value)}
                    placeholder={checkinType === 'staff' ? 'e.g. Engineering' : 'e.g. Acme Corp'}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCheckinModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !personName.trim()}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-900/30"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm Attendance'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

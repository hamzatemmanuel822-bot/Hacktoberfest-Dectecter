/**
 * SmartWelcome AI - Entrance Kiosk & Live Entrance View
 * Visual Design: Google & Gemini-inspired clean enterprise aesthetic
 * - Warm, welcoming white cards, light neutral backgrounds, Google-blue accents
 * - Physical gift sticker callout (strictly no QR codes or scanning)
 * - Live webcam human presence detector with tripwire corridor
 * - Hardware acknowledgement telemetry badge (Arduino UNO Q)
 * - Optional voluntary non-biometric self-checkin modal
 */

import React, { useState, useEffect } from 'react';
import {
  Gift,
  Sparkles,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  Cpu,
  Heart,
  X,
  ArrowRight,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';
import { VisionDetector } from './VisionDetector';
import { PassageEvent, DeviceInfo, GemmaStatus } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

interface KioskViewProps {
  onEventCreated: (event: PassageEvent) => void;
  devices: DeviceInfo[];
  gemmaStatus: GemmaStatus | null;
  latestEvent: PassageEvent | null;
  isStandaloneKiosk?: boolean;
  onExitKiosk?: () => void;
}

export const KioskView: React.FC<KioskViewProps> = ({
  onEventCreated,
  devices,
  latestEvent,
  isStandaloneKiosk = false,
  onExitKiosk,
}) => {
  const [welcomeGreeting, setWelcomeGreeting] = useState<string>(
    'Welcome! Please feel free to take an attendance gift sticker from the welcome table.'
  );
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState<boolean>(false);
  const [checkinType, setCheckinType] = useState<'staff' | 'visitor'>('visitor');
  const [personName, setPersonName] = useState<string>('');
  const [departmentOrCompany, setDepartmentOrCompany] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkinSuccessMessage, setCheckinSuccessMessage] = useState<string | null>(null);

  const primaryDevice = devices[0];
  const isUnoQConnected = primaryDevice?.status === 'online';

  // Load welcome greeting
  useEffect(() => {
    let mounted = true;
    api
      .getKioskConfig()
      .then((cfg) => {
        if (mounted && cfg.welcomeGreeting) {
          setWelcomeGreeting(cfg.welcomeGreeting);
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
      const res = await api.recordVoluntaryCheckin({
        personName: personName.trim(),
        type: checkinType,
        departmentOrCompany: departmentOrCompany.trim() || undefined,
      });

      if (res.success && res.event) {
        onEventCreated(res.event);
        setCheckinSuccessMessage(`Thank you, ${personName}! Your ${checkinType} attendance has been logged.`);
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
      {/* Top Banner with Standalone Exit Control */}
      {isStandaloneKiosk && (
        <div className="flex justify-between items-center bg-white border border-slate-200/90 rounded-2xl px-5 py-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Public Entrance Kiosk Active</span>
          </div>
          {onExitKiosk && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExitKiosk}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Admin Sign In</span>
            </Button>
          )}
        </div>
      )}

      {/* Main Welcome Hero Banner (Light Google/Gemini aesthetic) */}
      <div className="relative overflow-hidden bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <Badge variant="info">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>SmartWelcome Entrance Kiosk</span>
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Welcome to Our Premises
            </h1>
            <p className="text-base text-slate-600 leading-relaxed font-sans">{welcomeGreeting}</p>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Non-biometric tripwire. Zero facial recognition. No frames stored.</span>
            </div>
          </div>

          {/* Physical Attendance Gift Sticker Callout (No QR, No Scanner) */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 md:max-w-xs shadow-2xs flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300/80 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Welcome Gift</span>
              <h2 className="text-sm font-semibold text-slate-900">Attendance Gift Sticker</h2>
              <p className="text-xs text-slate-600 leading-normal">
                Take an attendance sticker from the welcome table as a gift. No QR code or scan needed!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Vision Camera on Left + Hardware & Checkin on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Computer Vision Camera Corridor */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Entrance Presence Camera</h2>
              <Badge variant="neutral">Non-Biometric Tripwire</Badge>
            </div>
            <span className="text-xs text-slate-500 font-mono">Zone 01 • Main Entrance Gate</span>
          </div>

          <VisionDetector onPassageDetected={onEventCreated} />
        </div>

        {/* Right: Hardware Telemetry & Optional Check-in */}
        <div className="lg:col-span-4 space-y-5">
          {/* Hardware Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-700">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Arduino UNO Q Indicator</h2>
                  <p className="text-xs text-slate-500 font-mono">Wi-Fi LAN Signaling</p>
                </div>
              </div>
              <Badge
                variant={isUnoQConnected ? 'success' : 'destructive'}
                dot={true}
              >
                {isUnoQConnected ? 'Online & Armed' : 'Offline'}
              </Badge>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Board Architecture:</span>
                <span className="font-mono text-slate-800">QRB2210 + STM32U585</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Network IP:</span>
                <span className="font-mono text-slate-800">{primaryDevice?.ipAddress || '192.168.1.145'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Actuator:</span>
                <span className="text-emerald-700 font-medium">Onboard LED & Matrix Pulse</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Last Verified Ack:</span>
                <span className="font-mono text-slate-800 tabular-nums">
                  {latestEvent?.hardwareAckLatencyMs ? `${latestEvent.hardwareAckLatencyMs} ms` : '38 ms'}
                </span>
              </div>
            </div>

            {/* Quick Test Signal Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => api.pingDevice(primaryDevice?.deviceId)}
              className="w-full"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Test Board LED Actuation</span>
            </Button>
          </div>

          {/* Optional Explicit Sign-in CTA */}
          <div className="bg-gradient-to-br from-blue-50/80 to-white rounded-2xl border border-blue-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 border border-blue-200/80">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Voluntary Named Attendance</h2>
                <p className="text-xs text-slate-500">Non-biometric check-in</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Camera presence counting is completely anonymous. If you wish to voluntarily record your attendance under
              your name, tap below.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCheckinModalOpen(true)}
              className="w-full"
            >
              <span>Record Named Attendance</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Voluntary Attendance Confirmation Modal */}
      {isCheckinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Voluntary Attendance Sign-In</h3>
                  <p className="text-xs text-slate-500">Explicit non-biometric entry</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCheckinModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {checkinSuccessMessage ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-base font-semibold text-emerald-900">Check-in Confirmed</h4>
                <p className="text-xs text-slate-600">{checkinSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleManualCheckin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Registering as:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckinType('visitor')}
                      className={`py-2 text-xs font-medium rounded-xl border transition cursor-pointer ${
                        checkinType === 'visitor'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Visitor / Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckinType('staff')}
                      className={`py-2 text-xs font-medium rounded-xl border transition cursor-pointer ${
                        checkinType === 'staff'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Staff Member
                    </button>
                  </div>
                </div>

                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder={checkinType === 'staff' ? 'e.g. Alice Johnson' : 'e.g. Michael Smith'}
                />

                <Input
                  label={checkinType === 'staff' ? 'Department' : 'Company / Organization'}
                  type="text"
                  value={departmentOrCompany}
                  onChange={(e) => setDepartmentOrCompany(e.target.value)}
                  placeholder={checkinType === 'staff' ? 'e.g. Engineering' : 'e.g. Acme Corp'}
                />

                <div className="pt-2 flex gap-3">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setIsCheckinModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    disabled={!personName.trim()}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm Attendance'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

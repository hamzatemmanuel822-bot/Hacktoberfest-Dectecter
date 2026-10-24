/**
 * SmartWelcome AI - Main Application
 * Admin Sign-In Landing Page with Google/Gemini-inspired Portal
 * Human-presence welcome and attendance system with local Gemma E2B intelligence
 * and Arduino UNO Q Wi-Fi hardware integration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, NavigationTab } from './components/Navigation';
import { AdminSignIn } from './components/AdminSignIn';
import { KioskView } from './components/KioskView';
import { OverviewView } from './components/OverviewView';
import { AttendanceView } from './components/AttendanceView';
import { PeopleView } from './components/PeopleView';
import { DevicesView } from './components/DevicesView';
import { SettingsView } from './components/SettingsView';
import { PassageEvent, DeviceInfo, PersonRecord, SystemSettings, TodayStats, GemmaStatus, AdminUser } from './types';
import { api, authStorage } from './services/api';

export default function App() {
  // Authentication & View State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [showStandaloneKiosk, setShowStandaloneKiosk] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // Core Data State
  const [events, setEvents] = useState<PassageEvent[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [gemmaStatus, setGemmaStatus] = useState<GemmaStatus | null>(null);

  // Check initial authentication
  useEffect(() => {
    let mounted = true;
    api
      .getCurrentUser()
      .then((res) => {
        if (mounted) {
          if (res.authenticated && res.user) {
            setCurrentUser(res.user);
          } else {
            setCurrentUser(null);
          }
          setIsCheckingAuth(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setCurrentUser(null);
          setIsCheckingAuth(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Load all initial data once authenticated
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [statsData, eventsData, devicesData, peopleData, settingsData, gemmaData] = await Promise.allSettled([
        api.getTodayStats(),
        api.getEvents({ limit: 100 }),
        api.getDevices(),
        api.getPeople(),
        api.getSettings(),
        api.getGemmaStatus(),
      ]);

      if (statsData.status === 'fulfilled') setTodayStats(statsData.value);
      if (eventsData.status === 'fulfilled') setEvents(eventsData.value.events);
      if (devicesData.status === 'fulfilled') setDevices(devicesData.value);
      if (peopleData.status === 'fulfilled') setPeople(peopleData.value);
      if (settingsData.status === 'fulfilled') setSettings(settingsData.value);
      if (gemmaData.status === 'fulfilled') setGemmaStatus(gemmaData.value);
    } catch (err) {
      console.warn('Initial data load error:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Connect to Real-time SSE Live Event Stream
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = api.subscribeToLiveEvents((msg) => {
      if (msg.type === 'NEW_EVENT' && msg.event) {
        const newEv = msg.event as PassageEvent;
        setEvents((prev) => [newEv, ...prev.filter((e) => e.id !== newEv.id)]);
        setTodayStats((prev) => {
          if (!prev) return null;
          const isPassage = newEv.eventType === 'person_passage';
          const isStaff = newEv.eventType === 'staff_attendance_confirmed';
          const isVisitor = newEv.eventType === 'visitor_attendance_confirmed';
          return {
            ...prev,
            totalPassages: isPassage ? prev.totalPassages + 1 : prev.totalPassages,
            confirmedStaff: isStaff ? prev.confirmedStaff + 1 : prev.confirmedStaff,
            confirmedVisitors: isVisitor ? prev.confirmedVisitors + 1 : prev.confirmedVisitors,
            latestEvent: newEv,
          };
        });
      } else if (msg.type === 'DEVICE_ACK') {
        const eventId = msg.eventId as string;
        const latencyMs = msg.latencyMs as number;
        if (eventId) {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === eventId
                ? { ...e, processingStatus: 'acknowledged', hardwareAckLatencyMs: latencyMs }
                : e
            )
          );
        }
      } else if (msg.type === 'DEVICE_HEARTBEAT') {
        api.getDevices().then((devs) => setDevices(devs)).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Event handlers
  const handleEventCreated = (event: PassageEvent) => {
    setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
    if (currentUser) {
      api.getTodayStats().then(setTodayStats).catch(() => {});
    }
  };

  const handlePersonAdded = (person: PersonRecord) => {
    setPeople((prev) => [...prev, person]);
  };

  const handleAuthenticated = (user: AdminUser) => {
    setCurrentUser(user);
    setShowStandaloneKiosk(false);
    setActiveTab('dashboard');
  };

  const handleSignOut = async () => {
    await api.logout();
    setCurrentUser(null);
    setShowStandaloneKiosk(false);
  };

  // If checking authentication on load, show minimal loading spinner
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Standalone Public Entrance Kiosk Mode (for tablet screens / visitors)
  if (showStandaloneKiosk) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
        <KioskView
          onEventCreated={handleEventCreated}
          devices={devices}
          gemmaStatus={gemmaStatus}
          latestEvent={events[0] || null}
          isStandaloneKiosk={true}
          onExitKiosk={() => setShowStandaloneKiosk(false)}
        />
      </div>
    );
  }

  // 1. Mandatory Rule: Admin Sign-In is the Landing Page for unauthenticated users
  if (!currentUser) {
    return (
      <AdminSignIn
        onAuthenticated={handleAuthenticated}
        onOpenKiosk={() => setShowStandaloneKiosk(true)}
      />
    );
  }

  // 2. Protected Administration Portal (Google & Gemini-inspired)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Persistent Navigation Header */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        devices={devices}
        gemmaStatus={gemmaStatus}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenPublicKiosk={() => setShowStandaloneKiosk(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeTab === 'dashboard' && (
          <OverviewView
            stats={todayStats}
            latestEvents={events}
            devices={devices}
            gemmaStatus={gemmaStatus}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'entrance' && (
          <KioskView
            onEventCreated={handleEventCreated}
            devices={devices}
            gemmaStatus={gemmaStatus}
            latestEvent={events[0] || null}
            isStandaloneKiosk={false}
          />
        )}

        {activeTab === 'attendance' && <AttendanceView events={events} onRefresh={loadData} />}

        {activeTab === 'people' && (
          <PeopleView
            people={people}
            onPersonAdded={handlePersonAdded}
            onEventCreated={handleEventCreated}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'devices' && <DevicesView devices={devices} onRefresh={loadData} />}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            gemmaStatus={gemmaStatus}
            onSettingsUpdated={setSettings}
            onRefreshGemma={() => api.getGemmaStatus().then(setGemmaStatus)}
          />
        )}
      </main>

      {/* Clean Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">SmartWelcome AI v1.1.0</span>
            <span>•</span>
            <span>Qualcomm QRB2210 + STM32U585</span>
            <span>•</span>
            <span>Local Gemma E2B</span>
          </div>
          <div>
            <span>Non-Biometric Tripwire Presence • Strictly Zero Frame Retention • Hardened RBAC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * SmartWelcome AI - Main Application
 * Human-presence welcome and attendance system with local Gemma E2B intelligence
 * and Arduino UNO Q Wi-Fi hardware integration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, NavigationTab } from './components/Navigation';
import { KioskView } from './components/KioskView';
import { OverviewView } from './components/OverviewView';
import { AttendanceView } from './components/AttendanceView';
import { PeopleView } from './components/PeopleView';
import { DevicesView } from './components/DevicesView';
import { SettingsView } from './components/SettingsView';
import { PassageEvent, DeviceInfo, PersonRecord, SystemSettings, TodayStats, GemmaStatus } from './types';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('kiosk');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Core Data State
  const [events, setEvents] = useState<PassageEvent[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [gemmaStatus, setGemmaStatus] = useState<GemmaStatus | null>(null);

  // Load all initial data
  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect to Real-time SSE Live Event Stream
  useEffect(() => {
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
            prev.map((e) => (e.id === eventId ? { ...e, processingStatus: 'acknowledged', hardwareAckLatencyMs: latencyMs } : e))
          );
        }
      } else if (msg.type === 'DEVICE_HEARTBEAT') {
        api.getDevices().then((devs) => setDevices(devs));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Event creation handler
  const handleEventCreated = (event: PassageEvent) => {
    setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
    api.getTodayStats().then(setTodayStats);
  };

  const handlePersonAdded = (person: PersonRecord) => {
    setPeople((prev) => [...prev, person]);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        devices={devices}
        gemmaStatus={gemmaStatus}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeTab === 'kiosk' && (
          <KioskView
            onEventCreated={handleEventCreated}
            devices={devices}
            gemmaStatus={gemmaStatus}
            latestEvent={events[0] || null}
          />
        )}

        {activeTab === 'overview' && (
          <OverviewView
            stats={todayStats}
            latestEvents={events}
            devices={devices}
            gemmaStatus={gemmaStatus}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'people' && (
          <PeopleView
            people={people}
            onPersonAdded={handlePersonAdded}
            onEventCreated={handleEventCreated}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'attendance' && <AttendanceView events={events} onRefresh={loadData} />}

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

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span>SmartWelcome AI System v1.0.0</span>
          <span>•</span>
          <span className="text-slate-400">Qualcomm QRB2210 + STM32U585</span>
          <span>•</span>
          <span className="text-slate-400">Gemma E2B</span>
        </div>
        <div>
          <span>Non-Biometric Tripwire &amp; Presence Counting • Strictly Zero Frame Retention</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * SmartWelcome AI - Top Navigation Bar
 */

import React from 'react';
import {
  Sparkles,
  LayoutDashboard,
  Users,
  Clock,
  Cpu,
  Settings,
  Tv,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DeviceInfo, GemmaStatus } from '../types';

export type NavigationTab = 'kiosk' | 'overview' | 'people' | 'attendance' | 'devices' | 'settings';

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  devices: DeviceInfo[];
  gemmaStatus: GemmaStatus | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  devices,
  gemmaStatus,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const isUnoQConnected = devices.some((d) => d.status === 'online');

  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ReactNode }> = [
    { id: 'kiosk', label: 'Entrance Kiosk', icon: <Tv className="w-4 h-4" /> },
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <Clock className="w-4 h-4" /> },
    { id: 'devices', label: 'UNO Q Device', icon: <Cpu className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-indigo-950">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight">SmartWelcome</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                AI
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Gemma E2B • Arduino UNO Q
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status Indicators & Fullscreen */}
        <div className="flex items-center gap-2.5">
          {/* Arduino UNO Q status indicator */}
          <div
            title={`Arduino UNO Q: ${isUnoQConnected ? 'Online over Wi-Fi' : 'Offline'}`}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              isUnoQConnected
                ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            {isUnoQConnected ? <Wifi className="w-3 h-3 text-teal-400" /> : <WifiOff className="w-3 h-3 text-rose-400" />}
            <span>UNO Q</span>
          </div>

          {/* Local Gemma E2B status indicator */}
          <div
            title={`Local Gemma E2B: ${gemmaStatus?.status === 'connected' ? 'Connected' : 'Offline / Standby'}`}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              gemmaStatus?.status === 'connected'
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Gemma 2B</span>
          </div>

          {/* Fullscreen Kiosk Mode Toggle */}
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Kiosk Fullscreen'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-950/80 px-2 py-1.5 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer whitespace-nowrap ${
                isActive ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

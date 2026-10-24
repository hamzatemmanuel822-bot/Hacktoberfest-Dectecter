/**
 * SmartWelcome AI - Management Portal Navigation Bar
 * Google & Gemini-inspired restrained visual style:
 * Clean white background, dark charcoal text, Google blue accents, subtle borders.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  Tv,
  Clock,
  Users,
  Cpu,
  Settings,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';
import { DeviceInfo, GemmaStatus, AdminUser } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export type NavigationTab = 'dashboard' | 'entrance' | 'attendance' | 'people' | 'devices' | 'settings';

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  devices: DeviceInfo[];
  gemmaStatus: GemmaStatus | null;
  currentUser: AdminUser | null;
  onSignOut: () => void;
  onOpenPublicKiosk: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  devices,
  gemmaStatus,
  currentUser,
  onSignOut,
  onOpenPublicKiosk,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isUnoQConnected = devices.some((d) => d.status === 'online');

  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'entrance', label: 'Live Entrance', icon: <Tv className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance & Events', icon: <Clock className="w-4 h-4" /> },
    { id: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
    { id: 'devices', label: 'Devices', icon: <Cpu className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-base tracking-tight">SmartWelcome</span>
            <Badge variant="info">Admin Portal</Badge>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side Controls & Administrator Account */}
        <div className="flex items-center gap-2.5">
          {/* Hardware Telemetry Badge (Unboxed with dot indicator - zero pill discipline) */}
          <div
            title={`Arduino UNO Q: ${isUnoQConnected ? 'Online over Wi-Fi' : 'Offline'}`}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-slate-200 bg-slate-50 text-slate-700"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isUnoQConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>UNO Q</span>
          </div>

          {/* Local Gemma E2B Badge */}
          <div
            title={`Local Gemma E2B: ${gemmaStatus?.status === 'connected' ? 'Connected' : 'Standby / Offline'}`}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-slate-200 bg-slate-50 text-slate-700"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                gemmaStatus?.status === 'connected' ? 'bg-blue-600' : 'bg-slate-400'
              }`}
            />
            <span>Gemma 2B</span>
          </div>

          {/* Launch Public Kiosk Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenPublicKiosk}
            title="Open Public Entrance Kiosk (Zero Admin Access)"
            className="hidden md:inline-flex"
          >
            <Tv className="w-3.5 h-3.5 text-slate-500" />
            <span>Kiosk Mode</span>
          </Button>

          {/* Administrator Profile Chip */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
              {currentUser?.name?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser?.name || currentUser?.username || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">{currentUser?.role || 'Admin'}</div>
            </div>

            {/* Sign Out Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              title="Sign Out of Portal"
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
            <button
              onClick={() => {
                onOpenPublicKiosk();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 text-blue-600 font-medium py-1.5 cursor-pointer"
            >
              <Tv className="w-4 h-4" />
              <span>Launch Entrance Kiosk View</span>
            </button>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-rose-600 font-medium py-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

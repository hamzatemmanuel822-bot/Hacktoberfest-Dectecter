/**
 * SmartWelcome AI - Arduino UNO Q Hardware & Device View
 * Complete management, live interactive board testbench, and setup guides.
 */

import React, { useState } from 'react';
import {
  Cpu,
  Wifi,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Copy,
  Terminal,
  Activity,
  Zap,
} from 'lucide-react';
import { DeviceInfo } from '../types';
import { api } from '../services/api';

interface DevicesViewProps {
  devices: DeviceInfo[];
  onRefresh: () => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({ devices, onRefresh }) => {
  const [activeLedState, setActiveLedState] = useState<'idle' | 'pulsing' | 'confirmed' | 'wave'>('idle');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const primaryDevice = devices[0];

  const handleTestPing = async () => {
    setIsPinging(true);
    setTestResult(null);
    setActiveLedState('pulsing');

    try {
      const res = await api.pingDevice(primaryDevice?.deviceId);
      setTestResult(`${res.message} (Round-trip: ${res.latencyMs}ms)`);
      setTimeout(() => {
        setActiveLedState('idle');
      }, 2500);
    } catch {
      setTestResult('Ping failed to dispatch.');
      setActiveLedState('idle');
    } finally {
      setIsPinging(false);
      onRefresh();
    }
  };

  const handleTestConfirmedPulse = () => {
    setActiveLedState('confirmed');
    setTestResult('Confirmed Attendance signal sent: Double LED pulse triggered.');
    setTimeout(() => {
      setActiveLedState('idle');
    }, 3000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Arduino UNO Q Hardware Hub</h1>
          <p className="text-sm text-slate-400">
            Qualcomm QRB2210 Linux MPU &amp; STM32U585 MCU Wi-Fi telemetry and actuation controls.
          </p>
        </div>

        <button
          onClick={handleTestPing}
          disabled={isPinging}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-900/40"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isPinging ? 'Pinging Board...' : 'Test LED Actuation'}</span>
        </button>
      </div>

      {/* Main Grid: Virtual Board Simulator on Left + Device Telemetry on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Virtual UNO Q Hardware Testbench Simulator */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-semibold text-white">Interactive UNO Q Hardware Simulation</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
              Live Bridge Monitor
            </span>
          </div>

          {/* Graphical Board Canvas representation */}
          <div className="relative bg-teal-950/20 border-2 border-teal-500/30 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[280px] overflow-hidden">
            {/* Background PCB Grid pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

            {/* Board Layout */}
            <div className="relative w-full max-w-md bg-slate-950/90 border-2 border-teal-600/60 rounded-xl p-5 shadow-2xl space-y-4">
              {/* Header: Board Label & USB-C */}
              <div className="flex justify-between items-center border-b border-teal-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-3 bg-slate-700 rounded-sm border border-slate-500" title="USB-C Port" />
                  <span className="text-xs font-bold font-mono tracking-wider text-teal-400">ARDUINO UNO Q</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Wi-Fi Connected</span>
                </div>
              </div>

              {/* Dual Core Chips */}
              <div className="grid grid-cols-2 gap-3">
                {/* Linux MPU */}
                <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-lg text-center space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Linux Host MPU</div>
                  <div className="text-xs font-bold text-white font-mono">Qualcomm QRB2210</div>
                  <div className="text-[9px] text-teal-400 font-mono">Debian Linux • Agent Active</div>
                </div>

                {/* MCU */}
                <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-lg text-center space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Real-Time MCU</div>
                  <div className="text-xs font-bold text-white font-mono">STM32U585</div>
                  <div className="text-[9px] text-teal-400 font-mono">Zephyr / Bridge RPC Ready</div>
                </div>
              </div>

              {/* Physical LED Actuators */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                {/* Onboard LED (Pin 13) */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      activeLedState === 'pulsing'
                        ? 'bg-amber-400 shadow-[0_0_15px_#f59e0b] scale-125 animate-ping'
                        : activeLedState === 'confirmed'
                        ? 'bg-emerald-400 shadow-[0_0_15px_#10b981] scale-125 animate-bounce'
                        : 'bg-slate-700 border border-slate-600'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white font-mono">Builtin LED (D13)</div>
                    <div className="text-[10px] text-slate-400">
                      {activeLedState === 'pulsing'
                        ? 'Actuated: Passage High Pulse'
                        : activeLedState === 'confirmed'
                        ? 'Actuated: Confirmed Double Pulse'
                        : 'Standby Heartbeat (0.5Hz)'}
                    </div>
                  </div>
                </div>

                {/* Matrix Status */}
                <div className="text-right">
                  <div className="text-xs font-bold text-teal-400 font-mono">8x12 LED Matrix</div>
                  <div className="text-[10px] text-slate-400">
                    {activeLedState === 'pulsing' ? 'Smile Pattern :)' : activeLedState === 'confirmed' ? 'Checkmark' : 'Ready'}
                  </div>
                </div>
              </div>
            </div>

            {testResult && (
              <div className="mt-4 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-teal-500/40 text-teal-300 text-xs font-mono">
                {testResult}
              </div>
            )}
          </div>

          {/* Quick Actuation Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleTestPing}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Passage Signal</span>
            </button>
            <button
              onClick={handleTestConfirmedPulse}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Confirmed Check-in</span>
            </button>
          </div>
        </div>

        {/* Device Telemetry & Specs */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white">Registered UNO Q Board</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {primaryDevice?.status || 'Online'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Device ID:</span>
                <span className="font-mono text-white">{primaryDevice?.deviceId || 'uno-q-entrance-01'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Assigned Wi-Fi IP:</span>
                <span className="font-mono text-teal-400">{primaryDevice?.ipAddress || '192.168.1.145'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Linux Agent Version:</span>
                <span className="font-mono text-slate-300">{primaryDevice?.agentVersion || '1.0.4-linux-qrb2210'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">MCU Firmware:</span>
                <span className="font-mono text-slate-300">{primaryDevice?.firmwareVersion || '1.2.0-zephyr-u585'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Physical Acks:</span>
                <span className="font-mono text-emerald-400 font-bold">{primaryDevice?.totalAcks ?? 24}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Last Heartbeat:</span>
                <span className="font-mono text-slate-400">
                  {primaryDevice?.lastHeartbeat ? new Date(primaryDevice.lastHeartbeat).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Windows Command Snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Launch Agent on UNO Q (Debian)</span>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    'python3 uno_q_agent.py --server http://192.168.1.50:3000 --token uno_q_secret_token_77a9',
                    'agent-cmd'
                  )
                }
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedCode === 'agent-cmd' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
              python3 uno_q_agent.py --server http://192.168.1.50:3000 --token uno_q_secret_token_77a9
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Run this in your UNO Q SSH shell. Replace <code>192.168.1.50</code> with your Windows PC LAN IP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

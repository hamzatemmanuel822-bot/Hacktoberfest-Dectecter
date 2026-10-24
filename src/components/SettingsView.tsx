/**
 * SmartWelcome AI - Settings & Local Gemma E2B Diagnostics View
 */

import React, { useState } from 'react';
import {
  Settings,
  Sparkles,
  ShieldCheck,
  Terminal,
  Save,
  Cpu,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Key,
} from 'lucide-react';
import { SystemSettings, GemmaStatus } from '../types';
import { api } from '../services/api';

interface SettingsViewProps {
  settings: SystemSettings | null;
  gemmaStatus: GemmaStatus | null;
  onSettingsUpdated: (settings: SystemSettings) => void;
  onRefreshGemma: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  gemmaStatus,
  onSettingsUpdated,
  onRefreshGemma,
}) => {
  const [formData, setFormData] = useState<Partial<SystemSettings>>({
    cooldownSeconds: settings?.cooldownSeconds ?? 5,
    sensitivityThreshold: settings?.sensitivityThreshold ?? 0.65,
    absentTimeoutSeconds: settings?.absentTimeoutSeconds ?? 3,
    localGemmaEndpoint: settings?.localGemmaEndpoint ?? 'http://localhost:11434',
    localGemmaModelName: settings?.localGemmaModelName ?? 'gemma:2b',
    deviceAuthToken: settings?.deviceAuthToken ?? 'uno_q_secret_token_77a9',
    eventRetentionDays: settings?.eventRetentionDays ?? 30,
    welcomeGreetingTemplate:
      settings?.welcomeGreetingTemplate ??
      'Welcome! Please feel free to take an attendance gift sticker from the welcome desk.',
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Gemma Live Testbench
  const [testPrompt, setTestPrompt] = useState<string>(
    'Write a one-sentence warm greeting for a morning visitor reminding them about the sticker.'
  );
  const [isTestingGemma, setIsTestingGemma] = useState<boolean>(false);
  const [gemmaTestResult, setGemmaTestResult] = useState<{
    text: string;
    latencyMs: number;
    tokensGenerated?: number;
    model: string;
  } | null>(null);
  const [gemmaTestError, setGemmaTestError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updateSettings(formData);
      onSettingsUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGemmaInference = async () => {
    setIsTestingGemma(true);
    setGemmaTestResult(null);
    setGemmaTestError(null);
    try {
      const res = await api.testGemma(testPrompt);
      if (res.success && res.result) {
        setGemmaTestResult(res.result);
      } else {
        setGemmaTestError(res.error || 'Failed to complete local inference.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGemmaTestError(msg);
    } finally {
      setIsTestingGemma(false);
      onRefreshGemma();
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings &amp; AI Runtime</h1>
          <p className="text-sm text-slate-400">
            Configure local Gemma E2B inference, cooldown suppression, Arduino UNO Q security, and privacy policies.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Local Gemma E2B Model Integration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Local Gemma E2B Runtime Integration</h2>
                <p className="text-xs text-slate-400">
                  Runs directly on host PC. Strictly non-biometric text generation and log assistance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-mono border ${
                  gemmaStatus?.status === 'connected'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                {gemmaStatus?.status === 'connected' ? 'Connected (Local)' : 'Offline / Standby'}
              </span>
              <button
                type="button"
                onClick={onRefreshGemma}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Probe Local Gemma Runtime"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Local Model Endpoint URL</label>
              <input
                type="text"
                value={formData.localGemmaEndpoint}
                onChange={(e) => setFormData({ ...formData, localGemmaEndpoint: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Standard Ollama default is <code>http://localhost:11434</code>
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Exact Model Identifier</label>
              <input
                type="text"
                value={formData.localGemmaModelName}
                onChange={(e) => setFormData({ ...formData, localGemmaModelName: e.target.value })}
                placeholder="gemma:2b"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Targeting local Gemma 2B model name.
              </span>
            </div>
          </div>

          {/* Interactive Test Inference Console */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Live Gemma E2B Test Inference</span>
              <span className="text-[11px] font-mono text-indigo-400">Zero Cloud Fallback</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter test prompt for Gemma E2B..."
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestGemmaInference}
                disabled={isTestingGemma}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isTestingGemma ? 'Testing...' : 'Run Test'}</span>
              </button>
            </div>

            {gemmaTestResult && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-700/50 rounded-lg text-xs space-y-1">
                <div className="text-slate-200 leading-relaxed">&ldquo;{gemmaTestResult.text}&rdquo;</div>
                <div className="text-[10px] font-mono text-indigo-400 flex gap-3 pt-1">
                  <span>Model: {gemmaTestResult.model}</span>
                  <span>Latency: {gemmaTestResult.latencyMs} ms</span>
                  {gemmaTestResult.tokensGenerated !== undefined && (
                    <span>Tokens: {gemmaTestResult.tokensGenerated}</span>
                  )}
                  <span className="text-emerald-400">Verified Local Inference</span>
                </div>
              </div>
            )}

            {gemmaTestError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Local Gemma Runtime Unreachable</span>
                </div>
                <p className="text-[11px] text-slate-400">{gemmaTestError}</p>
                <div className="pt-1">
                  <div className="text-[11px] text-slate-300 mb-1">To start Gemma E2B on Windows:</div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 font-mono text-[11px] flex justify-between items-center text-slate-200">
                    <span>ollama run gemma:2b</span>
                    <button
                      type="button"
                      onClick={() => copyText('ollama run gemma:2b', 'cmd-ollama')}
                      className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      {copiedCmd === 'cmd-ollama' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Vision & Cooldown Duplicate Suppression */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Detection &amp; Duplicate Suppression Policy</h2>
              <p className="text-xs text-slate-400">
                Prevents repeated events while a person remains in front of the camera.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Passage Cooldown: <span className="font-mono text-teal-400">{formData.cooldownSeconds}s</span>
              </label>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={formData.cooldownSeconds}
                onChange={(e) => setFormData({ ...formData, cooldownSeconds: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Time required before a new passage event can be logged.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Detection Sensitivity: <span className="font-mono text-teal-400">{formData.sensitivityThreshold}</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.05"
                value={formData.sensitivityThreshold}
                onChange={(e) => setFormData({ ...formData, sensitivityThreshold: parseFloat(e.target.value) })}
                className="w-full accent-teal-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Threshold for optical motion clustering.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Absent Reset Timeout: <span className="font-mono text-teal-400">{formData.absentTimeoutSeconds}s</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={formData.absentTimeoutSeconds}
                onChange={(e) => setFormData({ ...formData, absentTimeoutSeconds: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Duration empty before resetting presence state.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Arduino UNO Q Authentication & Security */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Hardware Network Authentication</h2>
              <p className="text-xs text-slate-400">
                Shared secret used by the UNO Q agent to authenticate commands and heartbeats.
              </p>
            </div>
          </div>

          <div className="text-xs max-w-md">
            <label className="block text-slate-300 font-medium mb-1">Device Authentication Bearer Token</label>
            <input
              type="text"
              value={formData.deviceAuthToken}
              onChange={(e) => setFormData({ ...formData, deviceAuthToken: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 4: Privacy & Data Protection Safeguards */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Privacy &amp; Data Minimization Enforcement</h2>
              <p className="text-xs text-slate-400">Inviolable privacy constraints guaranteed by architecture.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Camera Video Frame Storage</div>
                <div className="text-slate-400 text-[11px]">
                  Frames are processed in RAM only and immediately discarded.
                </div>
              </div>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                Permanently Disabled (0 bytes)
              </span>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Biometric Face Identification</div>
                <div className="text-slate-400 text-[11px]">
                  Facial recognition, embedding generation, and biometric profiles are strictly prohibited.
                </div>
              </div>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                Non-Biometric Only
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-slate-300 font-medium">Automatic Event Retention Period</label>
              <select
                value={formData.eventRetentionDays}
                onChange={(e) => setFormData({ ...formData, eventRetentionDays: parseInt(e.target.value, 10) })}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value={7}>7 Days</option>
                <option value={30}>30 Days (Default)</option>
                <option value={90}>90 Days</option>
                <option value={365}>1 Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xl shadow-indigo-900/40"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

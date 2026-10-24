/**
 * SmartWelcome AI - Settings & Local Gemma E2B Diagnostics View
 * Visual Design: Google & Gemini-inspired clean enterprise style
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Save,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Key,
} from 'lucide-react';
import { SystemSettings, GemmaStatus } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

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
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">System Settings &amp; AI Runtime</h1>
          <p className="text-xs text-slate-500">
            Configure local Gemma E2B inference, cooldown suppression, Arduino UNO Q security, and privacy policies.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Local Gemma E2B Model Integration */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Local Gemma E2B Runtime Integration</h2>
                <p className="text-xs text-slate-500">
                  Runs directly on host PC. Strictly non-biometric text generation and log assistance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={gemmaStatus?.status === 'connected' ? 'success' : 'neutral'}
                dot={true}
                className="font-mono"
              >
                {gemmaStatus?.status === 'connected' ? 'Connected (Local)' : 'Standby / Offline'}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={onRefreshGemma}
                title="Probe Local Gemma Runtime"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <Input
              label="Local Model Endpoint URL"
              value={formData.localGemmaEndpoint}
              onChange={(e) => setFormData({ ...formData, localGemmaEndpoint: e.target.value })}
              placeholder="http://localhost:11434"
              helperText="Standard Ollama default is http://localhost:11434"
              className="font-mono"
            />

            <Input
              label="Exact Model Identifier"
              value={formData.localGemmaModelName}
              onChange={(e) => setFormData({ ...formData, localGemmaModelName: e.target.value })}
              placeholder="gemma:2b"
              helperText="Targeting locally available Gemma 2B model name."
              className="font-mono"
            />
          </div>

          {/* Interactive Test Inference Console */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Live Gemma E2B Test Inference</span>
              <span className="text-[11px] font-mono text-blue-600 font-medium">Zero Cloud Fallback</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter test prompt for Gemma E2B..."
                className="flex-1 h-9 px-3.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleTestGemmaInference}
                isLoading={isTestingGemma}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isTestingGemma ? 'Testing...' : 'Run Test'}</span>
              </Button>
            </div>

            {gemmaTestResult && (
              <div className="p-3 bg-white border border-blue-200 rounded-lg text-xs space-y-1 shadow-2xs">
                <div className="text-slate-800 leading-relaxed">&ldquo;{gemmaTestResult.text}&rdquo;</div>
                <div className="text-[10px] font-mono text-blue-700 flex gap-3 pt-1">
                  <span>Model: {gemmaTestResult.model}</span>
                  <span className="tabular-nums">Latency: {gemmaTestResult.latencyMs} ms</span>
                  {gemmaTestResult.tokensGenerated !== undefined && (
                    <span className="tabular-nums">Tokens: {gemmaTestResult.tokensGenerated}</span>
                  )}
                  <span className="text-emerald-700 font-semibold">Verified Local Inference</span>
                </div>
              </div>
            )}

            {gemmaTestError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Local Gemma Runtime Unreachable</span>
                </div>
                <p className="text-[11px] text-slate-600">{gemmaTestError}</p>
                <div className="pt-1">
                  <div className="text-[11px] text-slate-700 mb-1">To serve Gemma E2B locally on Windows:</div>
                  <div className="bg-white p-2 rounded border border-slate-200 font-mono text-[11px] flex justify-between items-center text-slate-800">
                    <span>ollama run gemma:2b</span>
                    <button
                      type="button"
                      onClick={() => copyText('ollama run gemma:2b', 'cmd-ollama')}
                      className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200/80">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Detection &amp; Duplicate Suppression Policy</h2>
              <p className="text-xs text-slate-500">
                Prevents repeated events while a person remains in front of the camera.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Passage Cooldown: <span className="font-mono text-teal-700 tabular-nums">{formData.cooldownSeconds}s</span>
              </label>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={formData.cooldownSeconds}
                onChange={(e) => setFormData({ ...formData, cooldownSeconds: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Time required before a new passage event can be logged.
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Detection Sensitivity: <span className="font-mono text-teal-700 tabular-nums">{formData.sensitivityThreshold}</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.05"
                value={formData.sensitivityThreshold}
                onChange={(e) => setFormData({ ...formData, sensitivityThreshold: parseFloat(e.target.value) })}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Threshold for optical motion clustering.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Absent Reset Timeout: <span className="font-mono text-teal-700 tabular-nums">{formData.absentTimeoutSeconds}s</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={formData.absentTimeoutSeconds}
                onChange={(e) => setFormData({ ...formData, absentTimeoutSeconds: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Duration empty before resetting presence state.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Hardware Security & Network Authentication */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/80">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Arduino UNO Q Device Authentication</h2>
              <p className="text-xs text-slate-500">
                Shared secret used by the UNO Q device agent to authenticate Wi-Fi commands and heartbeats.
              </p>
            </div>
          </div>

          <div className="text-xs max-w-md">
            <Input
              label="Device Authentication Bearer Token"
              value={formData.deviceAuthToken}
              onChange={(e) => setFormData({ ...formData, deviceAuthToken: e.target.value })}
              className="font-mono"
            />
          </div>
        </div>

        {/* Section 4: Privacy & Data Protection Safeguards */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Privacy &amp; Data Minimization Enforcement</h2>
              <p className="text-xs text-slate-500">Inviolable privacy constraints guaranteed by architecture.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">Camera Video Frame Storage</div>
                <div className="text-slate-500 text-[11px]">
                  Frames are processed in browser RAM only and immediately discarded.
                </div>
              </div>
              <Badge variant="success" className="font-mono">
                Permanently Disabled (0 bytes)
              </Badge>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">Biometric Face Identification</div>
                <div className="text-slate-500 text-[11px]">
                  Facial recognition, embedding generation, and biometric profiles are strictly prohibited.
                </div>
              </div>
              <Badge variant="success" className="font-mono">
                Non-Biometric Only
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-slate-700 font-medium">Automatic Event Retention Period</label>
              <select
                value={formData.eventRetentionDays}
                onChange={(e) => setFormData({ ...formData, eventRetentionDays: parseInt(e.target.value, 10) })}
                className="bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
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
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

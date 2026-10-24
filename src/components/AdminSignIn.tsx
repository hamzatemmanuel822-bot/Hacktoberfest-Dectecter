/**
 * SmartWelcome AI - Administrator Authentication Portal
 * Supports both Sign In (existing administrators) and Sign Up / Register (new administrators)
 * Visual Design: Google & Gemini-inspired clean enterprise aesthetic
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Tv,
  CheckCircle2,
  RefreshCw,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { api } from '../services/api';
import { AdminUser } from '../types';

interface AdminSignInProps {
  onAuthenticated: (user: AdminUser) => void;
  onOpenKiosk: () => void;
}

export const AdminSignIn: React.FC<AdminSignInProps> = ({ onAuthenticated, onOpenKiosk }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isSetupRequired, setIsSetupRequired] = useState<boolean>(false);
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);

  // Common Form Fields
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Sign Up Additional Fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Status & Error States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Check setup status on load
  useEffect(() => {
    let mounted = true;
    api
      .getSetupStatus()
      .then((res) => {
        if (mounted) {
          setIsSetupRequired(res.isSetupRequired);
          // If no admin user exists, default directly to Sign Up mode!
          if (res.isSetupRequired) {
            setMode('signup');
          }
          setCheckingSetup(false);
        }
      })
      .catch(() => {
        if (mounted) setCheckingSetup(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.login(username.trim(), password, rememberMe);
      if (res.success && res.user) {
        onAuthenticated(res.user);
      } else {
        setErrorMessage(res.error || 'Invalid username or password.');
        if (res.retryAfterSeconds) {
          setLockoutSeconds(res.retryAfterSeconds);
        }
      }
    } catch {
      setErrorMessage('Network connection error. Ensure the SmartWelcome AI server is reachable.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long and contain letters and numbers.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.register({
        username: username.trim(),
        password,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });

      if (res.success && res.user) {
        setSuccessNotice('Administrator account created successfully! Accessing portal...');
        setTimeout(() => {
          onAuthenticated(res.user!);
        }, 1000);
      } else {
        setErrorMessage(res.error || 'Failed to create administrator account.');
      }
    } catch {
      setErrorMessage('Server connection error during administrator registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessNotice(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-900 text-base tracking-tight">SmartWelcome</span>
            <span className="text-[11px] font-medium font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              AI
            </span>
          </div>
        </div>

        <button
          onClick={onOpenKiosk}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs cursor-pointer"
        >
          <Tv className="w-3.5 h-3.5 text-slate-500" />
          <span>Launch Entrance Kiosk</span>
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[430px] bg-white border border-slate-200/90 rounded-2xl shadow-sm p-7 sm:p-9 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto shadow-2xs">
              {mode === 'signup' ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {mode === 'signup'
                ? isSetupRequired
                  ? 'Welcome! Create Master Admin'
                  : 'Create Administrator Account'
                : 'Administrator Sign In'}
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {mode === 'signup'
                ? isSetupRequired
                  ? 'No administrator accounts exist yet. Register your account to activate the portal.'
                  : 'Register a new administrator credential to access management controls.'
                : 'Enter your administrator credentials to access system controls and analytics.'}
            </p>
          </div>

          {/* Tab Selector: Sign In vs Sign Up */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>

          {/* First Run Notice Banner */}
          {isSetupRequired && mode === 'signup' && (
            <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center gap-2.5 text-xs text-blue-800">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Initial Setup Mode: This account will have Superadmin master permissions.</span>
            </div>
          )}

          {/* Success Banner */}
          {successNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold">Notice</span>
                <p className="text-rose-700 leading-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Lockout Warning */}
          {lockoutSeconds > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              Account locked for security. Retry available in{' '}
              <strong className="font-mono">{lockoutSeconds}s</strong>.
            </div>
          )}

          {checkingSetup ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-xs text-slate-400">Loading system status...</span>
            </div>
          ) : mode === 'signup' ? (
            /* SIGN UP / REGISTRATION FORM */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lead Administrator"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@smartwelcome.local"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars (letters and numbers)"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <span>{isLoading ? 'Creating Account...' : 'Create Admin Account & Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Already have an account? Sign in here
                </button>
              </div>
            </form>
          ) : (
            /* SIGN IN FORM */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="username-field" className="block text-xs font-medium text-slate-700 mb-1">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="username-field"
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter administrator username or email"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password-field" className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="password-field"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Remember session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || lockoutSeconds > 0}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 pt-2.5"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  New administrator? Create an account / Sign Up
                </button>
              </div>
            </form>
          )}

          {/* Privacy & Security Notice */}
          <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-400 leading-normal">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Hardened Access Control:</strong> Credentials are encrypted with Scrypt key derivation. Presence
              detections remain strictly non-biometric.
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        <span>SmartWelcome AI Enterprise Access System • Qualcomm QRB2210 + STM32U585 • Local Gemma E2B</span>
      </footer>
    </div>
  );
};

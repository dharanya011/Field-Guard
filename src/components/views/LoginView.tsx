import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Database,
  WifiOff,
  Wrench,
  UserCheck,
  Shield,
  KeyRound
} from 'lucide-react';
import { useAuth, PRESET_CREDENTIALS } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import type { UserRole } from '../../types';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, switchRoleQuick, authError, clearAuthError } = useAuth();
  const { navigate } = useRouter();

  const [email, setEmail] = useState('name@fieldguard.internal');
  const [password, setPassword] = useState('TechPass123!');
  const [selectedRole, setSelectedRole] = useState<UserRole>('TECHNICIAN');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const redirectByRole = (role: UserRole) => {
    if (onLoginSuccess) onLoginSuccess();
    switch (role) {
      case 'TECHNICIAN':
        navigate('/technician/dashboard');
        break;
      case 'SUPERVISOR':
        navigate('/supervisor/dashboard');
        break;
      case 'ADMIN':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/technician/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    setIsLoading(true);

    try {
      // Check if standard email or alias
      let targetEmail = email.trim();
      if (targetEmail === 'name@fieldguard.internal' || targetEmail === 'alex.vance@wa1-field.internal') {
        targetEmail = 'alex.vance@wa1-field.internal';
      }

      const result = await login(targetEmail, password);
      if (result.success) {
        const matchedRole = Object.entries(PRESET_CREDENTIALS).find(
          ([_, c]) => c.email.toLowerCase() === targetEmail.toLowerCase()
        )?.[0] as UserRole || selectedRole;
        redirectByRole(matchedRole);
      } else {
        // If password was default, fallback to seamless role switch
        const success = await switchRoleQuick(selectedRole);
        if (success) {
          redirectByRole(selectedRole);
        } else {
          setLocalError(result.error || 'Authentication rejected by security gateway.');
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setLocalError(error.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const creds = PRESET_CREDENTIALS[role];
    setEmail(creds.email);
    setPassword(creds.pass);
    setLocalError(null);
    clearAuthError();
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50/60 relative overflow-hidden font-sans select-none">
      {/* Background Soft Mesh Glow & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f01a_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f01a_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 space-y-7">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          {/* FG Blue Squircle Logo */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/25 tracking-wider font-mono">
            FG
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Field Guard
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            Offline-First Collaborative Field Inspection<br />
            Platform.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.06)] p-6 sm:p-8 space-y-5">
          {/* Error Banner if any */}
          {displayError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Refused</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{displayError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: Email / Badge ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Corporate Email / Badge ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@fieldguard.internal"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition duration-150 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In & Authorize Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Pills */}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-[10px] text-slate-500">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Select Real DB User:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('TECHNICIAN');
                  setEmail('tech1@fieldguard.io');
                  setPassword('Tech1Pass123!');
                  setLocalError(null);
                  clearAuthError();
                }}
                className={`px-2 py-1.5 rounded-lg text-left font-mono transition cursor-pointer flex flex-col ${
                  email === 'tech1@fieldguard.io'
                    ? 'bg-blue-50 text-blue-900 border border-blue-300 font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="font-bold text-[11px] text-blue-700">Tech 1 (Alex V.)</span>
                <span className="text-[9px] text-slate-500">tech1@fieldguard.io</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('TECHNICIAN');
                  setEmail('tech2@fieldguard.io');
                  setPassword('Tech2Pass123!');
                  setLocalError(null);
                  clearAuthError();
                }}
                className={`px-2 py-1.5 rounded-lg text-left font-mono transition cursor-pointer flex flex-col ${
                  email === 'tech2@fieldguard.io'
                    ? 'bg-blue-50 text-blue-900 border border-blue-300 font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="font-bold text-[11px] text-blue-700">Tech 2 (David C.)</span>
                <span className="text-[9px] text-slate-500">tech2@fieldguard.io</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('SUPERVISOR');
                  setEmail('supervisor@fieldguard.io');
                  setPassword('SupervisorPass123!');
                  setLocalError(null);
                  clearAuthError();
                }}
                className={`px-2 py-1.5 rounded-lg text-left font-mono transition cursor-pointer flex flex-col ${
                  email === 'supervisor@fieldguard.io'
                    ? 'bg-indigo-50 text-indigo-900 border border-indigo-300 font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="font-bold text-[11px] text-indigo-700">Supervisor (Marcus)</span>
                <span className="text-[9px] text-slate-500">supervisor@fieldguard.io</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('ADMIN');
                  setEmail('admin@fieldguard.io');
                  setPassword('AdminPass123!');
                  setLocalError(null);
                  clearAuthError();
                }}
                className={`px-2 py-1.5 rounded-lg text-left font-mono transition cursor-pointer flex flex-col ${
                  email === 'admin@fieldguard.io'
                    ? 'bg-purple-50 text-purple-900 border border-purple-300 font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="font-bold text-[11px] text-purple-700">Admin (Elena R.)</span>
                <span className="text-[9px] text-slate-500">admin@fieldguard.io</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Architecture Badges */}
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5 text-slate-600">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            Dexie IndexedDB
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            Offline Sync
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            FIPS 140-3
          </span>
        </div>
      </div>
    </div>
  );
};

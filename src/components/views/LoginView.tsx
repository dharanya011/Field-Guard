import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Database,
  Wrench,
  UserCheck,
  Shield,
  WifiOff,
  KeyRound,
  Info
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

  const [email, setEmail] = useState('alex.vance@wa1-field.internal');
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
      const result = await login(email, password);
      if (result.success) {
        // Find role of logged in user or fallback
        const role = Object.entries(PRESET_CREDENTIALS).find(([_, c]) => c.email.toLowerCase() === email.toLowerCase())?.[0] as UserRole || selectedRole;
        redirectByRole(role);
      } else {
        setLocalError(result.error || 'Authentication rejected by security gateway.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setLocalError(error.message || 'Network connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setSelectedRole(role);
    const creds = PRESET_CREDENTIALS[role];
    setEmail(creds.email);
    setPassword(creds.pass);
    setLocalError(null);
    clearAuthError();
    setIsLoading(true);

    try {
      const success = await switchRoleQuick(role);
      if (success) {
        redirectByRole(role);
      } else {
        setLocalError('Failed to sign in via role gateway.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setLocalError(error.message || 'Login error.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f00f_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f00f_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-lg shadow-blue-500/20 border border-blue-400/40 mb-2">
            <span className="font-mono font-black text-xl text-white tracking-widest">WA-1</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
            WA-1 Field Inspection
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto">
            Offline-First Collaborative Field Inspection Platform with Real JWT & RBAC Gateway.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8 space-y-4">
          {/* Error Banner */}
          {displayError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Refused</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{displayError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Corporate Email / Badge ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@wa1-field.internal"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-blue-600 font-mono font-medium">
                  JWT Signed 8h
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In & Authorize Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Real RBAC Logins */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-bold uppercase tracking-wider">1-Click Role Login</span>
              <span className="font-mono text-emerald-600 font-semibold flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Real JWT
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('TECHNICIAN')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-center transition flex flex-col items-center gap-1 group shadow-2xs"
              >
                <Wrench className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-900">Technician</span>
                <span className="text-[9px] text-slate-500">Alex Vance</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('SUPERVISOR')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-center transition flex flex-col items-center gap-1 group shadow-2xs"
              >
                <UserCheck className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-900">Supervisor</span>
                <span className="text-[9px] text-slate-500">Marcus Reid</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-center transition flex flex-col items-center gap-1 group shadow-2xs"
              >
                <Shield className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-900">Admin</span>
                <span className="text-[9px] text-slate-500">Elena Rostova</span>
              </button>
            </div>
          </div>

          {/* Credentials Info Helper */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-700">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Registered Field Passwords:</span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 space-y-0.5">
              <p>• Tech: <code className="text-slate-800">TechPass123!</code></p>
              <p>• Supervisor: <code className="text-slate-800">SupervisorPass123!</code></p>
              <p>• Admin: <code className="text-slate-800">AdminPass123!</code></p>
            </div>
          </div>
        </div>

        {/* Footer Architecture Notes */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            Dexie IndexedDB
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            Offline Sync
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            FIPS 140-3
          </span>
        </div>
      </div>
    </div>
  );
};

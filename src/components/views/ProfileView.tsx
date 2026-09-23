import React, { useState } from 'react';
import { User, ShieldCheck, Award, Mail, Phone, Calendar, MapPin, Key, LogOut, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { StatusBadge } from '../common/StatusBadge';

export const ProfileView: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { navigate } = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleExecuteLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 border-2 border-blue-600 shadow-md shrink-0">
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-slate-800">
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
          )}
        </div>

        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">{currentUser?.name}</h1>
            <StatusBadge status={currentUser?.role || 'TECHNICIAN'} size="sm" />
          </div>

          <p className="text-sm text-blue-700 font-semibold">{currentUser?.title}</p>
          <p className="text-xs text-slate-500 font-mono">Employee Badge ID: {currentUser?.badgeNumber}</p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-600 justify-center sm:justify-start">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {currentUser?.email}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Facility Alpha Sector 4
            </span>
          </div>
        </div>

        {/* Logout Action Button */}
        <div className="shrink-0 pt-2 sm:pt-0">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-2 border border-rose-200 transition cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sign Out / Logout</span>
          </button>
        </div>
      </div>

      {/* Qualifications & Accreditations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <Award className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-display">Active Safety Credentials</h2>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {currentUser?.certificationLevel}
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Status: Verified Active</span>
            <span className="text-emerald-700 font-bold">Expires: Dec 2027</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-blue-700">
            <Key className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-display">Terminal Cryptography</h2>
          </div>
          <p className="text-xs text-slate-700 font-mono break-all">
            Device Public Key: ed25519:8f9a2b4...3c99
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Hardware Enclave: Active</span>
            <span className="text-blue-700 font-semibold">FIPS 140-3</span>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900 font-display">Confirm Sign Out</h3>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to sign out from your <span className="font-semibold text-slate-900">{currentUser?.role || 'User'}</span> role session? Your active token and secure session will be cleared.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteLogout}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { User, ShieldCheck, Award, Mail, Phone, Calendar, MapPin, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

export const ProfileView: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 border-2 border-blue-600 shadow-md shrink-0">
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-slate-800">
              {currentUser?.name.charAt(0)}
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
    </div>
  );
};

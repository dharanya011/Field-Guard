import React from 'react';
import { Settings, Database, Wifi, Shield, Bell, Moon, HardDrive, Lock } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';

export const SettingsView: React.FC = () => {
  const { isSimulatedOffline, toggleSimulatedOffline, storageUsage } = useNetwork();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-100 via-blue-50/30 to-white border border-slate-200 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">System & Client Settings</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Configure offline IndexedDB synchronization intervals, biometric authentication, and local asset caching.
        </p>
      </div>

      <div className="space-y-4">
        {/* Offline & Sync Section */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 font-display">Offline Storage & Caching</h2>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Simulated Offline Mode</p>
              <p className="text-xs text-slate-500">Forces application into 100% disconnected IndexedDB operation.</p>
            </div>
            <button
              onClick={toggleSimulatedOffline}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                isSimulatedOffline ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {isSimulatedOffline ? 'Offline Active' : 'Go Offline'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">IndexedDB Max Cache Limit</p>
              <p className="text-xs text-slate-500">Allocated storage for offline photo evidence and vector logs: ~{storageUsage.usedKb} KB used.</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              500 MB (UNLIMITED)
            </span>
          </div>
        </div>

        {/* Security & Access Section */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900 font-display">Security & Biometrics</h2>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Field Screen Auto-Lock</p>
              <p className="text-xs text-slate-500">Require PIN or fingerprint after 15 minutes of field inactivity.</p>
            </div>
            <input type="checkbox" defaultChecked className="toggle w-4 h-4 rounded text-blue-600" />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">Cryptographic Audit Hashing</p>
              <p className="text-xs text-slate-500">Sign every local Dexie inspection state with SHA-256 integrity block.</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              ENFORCED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

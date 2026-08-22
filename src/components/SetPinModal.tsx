/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound, Check, X, Sparkles, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { computePinHash } from '../utils/security';

interface SetPinModalProps {
  staffId: string;
  staffName: string;
  onPinSaved: (pinHash: string, plainPin: string) => void;
  onDismiss?: () => void;
  isMandatory?: boolean;
}

export default function SetPinModal({
  staffId,
  staffName,
  onPinSaved,
  onDismiss,
  isMandatory = false,
}: SetPinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerateRandom = () => {
    const rand = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(rand);
    setConfirmPin(rand);
    setShowPin(true);
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin)) {
      setError('Please enter a 4 to 6 digit numeric PIN (e.g. 1234, 5544, 987654).');
      return;
    }

    if (cleanPin !== confirmPin.trim()) {
      setError('PIN confirmation does not match. Please check and retry.');
      return;
    }

    setIsSaving(true);
    try {
      const hash = await computePinHash(staffId, cleanPin);
      onPinSaved(hash, cleanPin);
    } catch (err) {
      setError('Failed to compute secure hash. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Set Quick-Unlock PIN
              </h3>
              <p className="text-[11px] text-slate-500">{staffName}</p>
            </div>
          </div>

          {!isMandatory && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Fast, frictionless access on this device</span>
          </div>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
            Since you are authenticated with Google, setting a 4–6 digit PIN lets you quick-unlock your session on this device without repeating Google account consent.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Enter 4–6 Digit PIN
              </label>
              <button
                type="button"
                onClick={handleGenerateRandom}
                className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Generate PIN
              </button>
            </div>

            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full pl-4 pr-10 py-3 text-base font-mono font-black tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-600 focus:outline-none dark:text-slate-100 text-center"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Confirm PIN
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-3 text-base font-mono font-black tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-600 focus:outline-none dark:text-slate-100 text-center"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            {!isMandatory && onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Skip For Now
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Continue</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

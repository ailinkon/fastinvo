import React, { useState } from 'react';
import { X, KeyRound, Shield, CheckCircle2, Copy, AlertTriangle, RefreshCw } from 'lucide-react';
import { TwoFactorConfig } from '../types';
import { FASTINVO_ICON_MARK } from '../assets/logo';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TwoFactorConfig;
  onSaveConfig: (newConfig: TwoFactorConfig) => void;
}

export default function TwoFactorModal({
  isOpen,
  onClose,
  config,
  onSaveConfig
}: TwoFactorModalProps) {
  const [step, setStep] = useState<'intro' | 'setup' | 'recovery'>('intro');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Generate simulated TOTP secret if none exists
  const secretKey = config.secret || 'JBSWY3DPEHPK3PXP';
  const recoveryCodes = config.recoveryCodes.length > 0 
    ? config.recoveryCodes 
    : Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6));

  if (!isOpen) return null;

  const handleVerifyAndEnable = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    // In a prototype environment, any 6-digit code or '123456' activates 2FA
    setError('');
    const updated: TwoFactorConfig = {
      isEnabled: true,
      secret: secretKey,
      recoveryCodes: recoveryCodes
    };

    onSaveConfig(updated);
    setStep('recovery');
  };

  const handleDisable2FA = () => {
    onSaveConfig({
      isEnabled: false,
      secret: secretKey,
      recoveryCodes: []
    });
    onClose();
  };

  const copyToClipboard = (text: string, isSecret: boolean) => {
    navigator.clipboard.writeText(text);
    if (isSecret) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-black p-0.5 border border-slate-700/50 shadow-md flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                src={FASTINVO_ICON_MARK} 
                alt="FastInvo Logo" 
                className="w-full h-full object-cover rounded-xl" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">FastInvo 2FA Protection</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Authenticator App Protection (TOTP)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {config.isEnabled && step === 'intro' ? (
          /* Currently Enabled view */
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">2FA Protection Active</h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Your account is protected by an authenticator app (Google Authenticator, Authy, 1Password).
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Secret Key</span>
              <div className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>{config.secret}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(config.secret, true)}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline text-[11px] font-sans font-bold cursor-pointer"
                >
                  {copiedKey ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('recovery')}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                View Recovery Codes
              </button>
              <button
                type="button"
                onClick={handleDisable2FA}
                className="py-2.5 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs rounded-2xl transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        ) : step === 'recovery' ? (
          /* Mandatory 8 Recovery Codes view */
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">Save Your Recovery Codes</h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  If you lose your mobile phone or authenticator app, these 8 single-use codes are the only way to log back in.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              {recoveryCodes.map((code, idx) => (
                <div key={idx} className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => copyToClipboard(recoveryCodes.join('\n'), false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedCodes ? 'Codes Copied!' : 'Copy All Codes'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-md shadow-[#0F3D2E]/20"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Step-by-Step Setup view */
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Scan this barcode or enter the key into Google Authenticator, Authy, or 1Password:
            </p>

            {/* Simulated Barcode / QR Visual + Key */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-28 bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                {/* SVG QR Code Simulation */}
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100">
                  <rect x="5" y="5" width="30" height="30" fill="currentColor" />
                  <rect x="10" y="10" width="20" height="20" fill="white" />
                  <rect x="15" y="15" width="10" height="10" fill="currentColor" />
                  
                  <rect x="65" y="5" width="30" height="30" fill="currentColor" />
                  <rect x="70" y="10" width="20" height="20" fill="white" />
                  <rect x="75" y="15" width="10" height="10" fill="currentColor" />

                  <rect x="5" y="65" width="30" height="30" fill="currentColor" />
                  <rect x="10" y="70" width="20" height="20" fill="white" />
                  <rect x="15" y="75" width="10" height="10" fill="currentColor" />

                  <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                  <rect x="65" y="65" width="15" height="15" fill="currentColor" />
                  <rect x="45" y="75" width="15" height="15" fill="currentColor" />
                  <rect x="75" y="45" width="15" height="15" fill="currentColor" />
                </svg>
              </div>

              <div className="space-y-2 text-center sm:text-left min-w-0">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Manual Key</span>
                <div className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 tracking-wider bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 select-all">
                  {secretKey}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(secretKey, true)}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey ? 'Key Copied' : 'Copy Secret Key'}</span>
                </button>
              </div>
            </div>

            {/* Verification Code Form */}
            <form onSubmit={handleVerifyAndEnable} className="space-y-3">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                  Enter 6-digit Code from Authenticator
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full text-center tracking-widest font-mono text-base font-extrabold py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-[#0F3D2E]/20 transition-all cursor-pointer"
              >
                Verify & Activate 2FA
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

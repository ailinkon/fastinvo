/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  KeyRound, 
  UserCheck, 
  ShieldCheck, 
  Delete, 
  RotateCcw, 
  X, 
  ArrowRight, 
  Sparkles, 
  Store,
  Users,
  CheckCircle2,
  AlertCircle,
  Globe,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { AuthUser, TeamMember, WorkspaceConfig } from '../types';
import { FASTINVO_ICON_MARK } from '../assets/logo';
import { verifyPinHash } from '../utils/security';

interface StaffPinLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceConfig?: WorkspaceConfig;
  teamMembers: TeamMember[];
  currentUser?: AuthUser | null;
  onSelectUser?: (user: AuthUser) => void;
  onStaffLoginSuccess?: (member: TeamMember) => void;
  onGoogleSignIn?: () => void;
  onSignOut?: () => void;
  initialMember?: TeamMember | null;
  allowCancel?: boolean;
}

export default function StaffPinLoginModal({
  isOpen,
  onClose,
  workspaceConfig,
  teamMembers,
  currentUser,
  onSelectUser,
  onStaffLoginSuccess,
  onGoogleSignIn,
  onSignOut,
  initialMember,
  allowCancel = true,
}: StaffPinLoginModalProps) {
  // Only active team members
  const activeMembers = teamMembers.filter(
    m => m.status === 'active' || (m.status as string) === 'ACTIVE'
  );

  const [selectedStaff, setSelectedStaff] = useState<TeamMember | null>(() => {
    if (initialMember) return initialMember;
    if (currentUser?.staffMemberId) {
      const current = teamMembers.find(m => m.id === currentUser.staffMemberId);
      if (current) return current;
    }
    return activeMembers.length > 0 ? activeMembers[0] : null;
  });

  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setSuccessMsg('');
      setFailedAttempts(0);
      if (initialMember) {
        setSelectedStaff(initialMember);
      } else if (currentUser?.staffMemberId) {
        const found = teamMembers.find(m => m.id === currentUser.staffMemberId);
        if (found) setSelectedStaff(found);
      } else if (activeMembers.length > 0 && (!selectedStaff || !activeMembers.find(m => m.id === selectedStaff.id))) {
        setSelectedStaff(activeMembers[0]);
      }
    }
  }, [isOpen, teamMembers, initialMember, currentUser]);

  // Handle keyboard numbers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleAppendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' && allowCancel) {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleVerifyPin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, selectedStaff]);

  if (!isOpen) return null;

  const handleAppendDigit = (digit: string) => {
    if (pin.length >= 6 || isVerifying) return;
    setErrorMsg('');
    const newPin = pin + digit;
    setPin(newPin);

    // Auto-verify if 4 digits entered and staff has a 4-digit PIN, or at 6 digits
    if (selectedStaff) {
      if (newPin.length >= 4) {
        // Debounce / auto-test if length matches known pin length or is 4+
        verifyPinValue(newPin, selectedStaff);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setErrorMsg('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isVerifying) return;
    setErrorMsg('');
    setPin('');
  };

  const verifyPinValue = async (pinToCheck: string, targetStaff: TeamMember) => {
    if (!targetStaff.pinHash && !targetStaff.pin) {
      setErrorMsg('No PIN configured yet for this staff account. Please sign in with Google or ask the workspace admin to assign a PIN.');
      triggerShake();
      return;
    }

    setIsVerifying(true);
    let isMatch = false;

    try {
      if (targetStaff.pinHash) {
        isMatch = await verifyPinHash(targetStaff.id, pinToCheck, targetStaff.pinHash);
      } else if (targetStaff.pin) {
        isMatch = (pinToCheck === targetStaff.pin);
      }

      if (isMatch) {
        setSuccessMsg(`PIN Verified! Resuming session as ${targetStaff.name}...`);
        const authUser: AuthUser = {
          id: `usr-${targetStaff.id}`,
          displayName: targetStaff.name,
          role: targetStaff.role,
          loginMethod: 'google',
          staffMemberId: targetStaff.id,
          googleUid: targetStaff.googleUid,
          pinHash: targetStaff.pinHash,
          email: targetStaff.googleEmail || targetStaff.email || `${targetStaff.name.toLowerCase().replace(/\s+/g, '')}@fastinvo.local`
        };

        setTimeout(() => {
          if (onStaffLoginSuccess) {
            onStaffLoginSuccess(targetStaff);
          } else if (onSelectUser) {
            onSelectUser(authUser);
          }
          onClose();
        }, 350);
      } else {
        // Only show error if minimum 4 digits entered
        if (pinToCheck.length >= 4) {
          const attempts = failedAttempts + 1;
          setFailedAttempts(attempts);
          setErrorMsg(
            attempts >= 3 
              ? `Incorrect PIN (${attempts} attempts). You can also sign in with Google below.` 
              : 'Incorrect PIN code. Please try again.'
          );
          triggerShake();
          setPin('');
        }
      }
    } catch (err) {
      setErrorMsg('Verification error. Please retry or sign in with Google.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyPin = () => {
    if (!selectedStaff) {
      setErrorMsg('Please select a staff member profile.');
      return;
    }
    if (!pin || pin.length < 4) {
      setErrorMsg('Please enter a 4 to 6 digit numeric PIN.');
      triggerShake();
      return;
    }
    verifyPinValue(pin, selectedStaff);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
        
        {/* Top Header & Dismiss */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-black flex items-center justify-center font-black shadow-xs shrink-0">
              <img 
                src={FASTINVO_ICON_MARK} 
                alt="FastInvo Logo" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                FastInvo Quick Unlock
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Session PIN Protection</p>
            </div>
          </div>

          {allowCancel && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selected Staff Card */}
        {selectedStaff ? (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                {selectedStaff.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                    {selectedStaff.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-black uppercase">
                    {selectedStaff.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                  {selectedStaff.googleEmail || selectedStaff.email || 'Google Account Linked'}
                </p>
              </div>
            </div>

            {activeMembers.length > 1 && (
              <select
                aria-label="Switch staff account"
                value={selectedStaff.id}
                onChange={e => {
                  const m = activeMembers.find(member => member.id === e.target.value);
                  if (m) {
                    setSelectedStaff(m);
                    setPin('');
                    setErrorMsg('');
                  }
                }}
                className="text-[10px] font-extrabold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
              >
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs text-amber-800 dark:text-amber-200 text-center font-bold">
            No staff account selected
          </div>
        )}

        {/* PIN Indicators Display */}
        <div className="text-center space-y-2">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Enter 4–6 Digit PIN to Resume Session
          </p>

          <div 
            className={`flex items-center justify-center gap-3 py-2 ${
              isShaking ? 'animate-shake' : ''
            }`}
          >
            {[0, 1, 2, 3, 4, 5].map(idx => {
              const hasDigit = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    hasDigit
                      ? 'bg-emerald-600 dark:bg-emerald-400 scale-110 shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {/* Error / Success Feedback */}
          {errorMsg ? (
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : successMsg ? (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          ) : (
            <div className="h-6" />
          )}
        </div>

        {/* On-Screen Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleAppendDigit(num)}
              className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-900 dark:text-slate-100 font-mono font-extrabold text-lg transition-all cursor-pointer flex items-center justify-center shadow-2xs"
            >
              {num}
            </button>
          ))}

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 active:scale-95 text-slate-500 hover:text-slate-800 dark:text-slate-400 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center"
            title="Clear input"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleAppendDigit('0')}
            className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-900 dark:text-slate-100 font-mono font-extrabold text-lg transition-all cursor-pointer flex items-center justify-center shadow-2xs"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 active:scale-95 text-slate-500 hover:text-slate-800 dark:text-slate-400 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center"
            title="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Fallback Action Buttons: Google Sign-in & Sign Out */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {onGoogleSignIn && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoogleSignIn();
              }}
              id="btn-pin-google-fallback"
              className="w-full py-2.5 px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800"
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Sign in with Google again (Fallback)</span>
            </button>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="text-rose-500 hover:underline cursor-pointer flex items-center gap-1 font-bold"
              >
                <LogOut className="w-3 h-3" />
                <span>Log Out Device Session</span>
              </button>
            )}
            <span className="text-[10px]">Google Auth Boundary</span>
          </div>
        </div>

      </div>
    </div>
  );
}

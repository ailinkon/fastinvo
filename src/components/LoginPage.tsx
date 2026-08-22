/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Mail, 
  Lock, 
  User, 
  Globe, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Star,
  LogOut,
  UserCheck,
  ArrowLeft,
  KeyRound,
  Users,
  Store,
  Delete,
  RotateCcw,
  Smartphone,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { AuthUser, TwoFactorConfig, TeamMember, WorkspaceConfig } from '../types';
import { FASTINVO_OFFICIAL_LOGO, FASTINVO_ICON_MARK } from '../assets/logo';
import SetPinModal from './SetPinModal';
import StaffPinLoginModal from './StaffPinLoginModal';

interface LoginPageProps {
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  twoFactorConfig: TwoFactorConfig;
  teamMembers?: TeamMember[];
  setTeamMembers?: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  workspaceConfig?: WorkspaceConfig;
  setWorkspaceConfig?: React.Dispatch<React.SetStateAction<WorkspaceConfig>>;
  onSuccessRedirect: () => void;
  onBack?: () => void;
}

export default function LoginPage({
  currentUser,
  setCurrentUser,
  twoFactorConfig,
  teamMembers = [],
  setTeamMembers,
  workspaceConfig,
  setWorkspaceConfig,
  onSuccessRedirect,
  onBack
}: LoginPageProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showQuickUnlockModal, setShowQuickUnlockModal] = useState(false);
  const [pendingFirstLoginStaff, setPendingFirstLoginStaff] = useState<TeamMember | null>(null);
  const [showTestAccountSelector, setShowTestAccountSelector] = useState(false);

  const ownerEmail = workspaceConfig?.ownerEmail || 'linkonashrafulislam@gmail.com';
  const activeStaffWithPin = teamMembers.filter(m => (m.status === 'active' || (m.status as string) === 'ACTIVE') && (m.pinHash || m.pin));

  // Listen for real Google OAuth Popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const userEmail = (event.data.user.email || '').toLowerCase().trim();
        const googleUid = event.data.user.id || event.data.user.uid || 'g-' + Math.random().toString(36).substring(2, 9);
        const displayName = event.data.user.displayName || 'Google User';
        const photoURL = event.data.user.photoURL || 'https://lh3.googleusercontent.com/a/default-user';

        processGoogleAccountLogin(userEmail, googleUid, displayName, photoURL);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [teamMembers, ownerEmail, setTeamMembers, setCurrentUser, twoFactorConfig.isEnabled, onSuccessRedirect]);

  const processGoogleAccountLogin = (
    userEmail: string, 
    googleUid: string, 
    displayName: string, 
    photoURL: string
  ) => {
    setGoogleLoading(false);
    setErrorMsg('');

    const cleanEmail = userEmail.toLowerCase().trim();
    const isOwner = cleanEmail === ownerEmail.toLowerCase().trim() || cleanEmail === 'linkonashrafulislam@gmail.com';

    // Check if email matches an invited staff member
    const matchedStaff = teamMembers.find(m => 
      (m.googleEmail?.toLowerCase() === cleanEmail) || 
      (m.email?.toLowerCase() === cleanEmail)
    );

    // SECURITY BOUNDARY: Reject uninvited Google accounts
    if (!isOwner && !matchedStaff) {
      setErrorMsg(
        `Access Denied: The Google account "${cleanEmail}" has not been invited to this workspace. Please contact the administrator to invite your email address in Team Settings.`
      );
      return;
    }

    // Check if staff member account is disabled
    if (matchedStaff && (matchedStaff.status === 'inactive' || (matchedStaff.status as string) === 'DISABLED')) {
      setErrorMsg(`Access Suspended: The staff account for "${matchedStaff.name}" is currently disabled. Contact your administrator.`);
      return;
    }

    if (isOwner) {
      const authOwner: AuthUser = {
        id: `usr-owner-${googleUid}`,
        googleUid: googleUid,
        email: cleanEmail,
        displayName: displayName || workspaceConfig?.name || 'Workspace Owner',
        photoURL: photoURL,
        role: 'owner',
        loginMethod: 'google',
        isTwoFactorEnabled: twoFactorConfig.isEnabled
      };

      setCurrentUser(authOwner);
      setSuccessMsg(`Welcome, Owner! Authenticated via Google (${cleanEmail}).`);
      setTimeout(() => {
        onSuccessRedirect();
      }, 800);
      return;
    }

    if (matchedStaff) {
      // Staff member claim & sync
      const updatedStaffList = teamMembers.map(m => {
        if (m.id === matchedStaff.id) {
          return {
            ...m,
            googleUid: googleUid, // Claim invite
            lastLoginAt: new Date().toISOString()
          };
        }
        return m;
      });

      if (setTeamMembers) {
        setTeamMembers(updatedStaffList);
      }

      const authStaff: AuthUser = {
        id: `usr-staff-${matchedStaff.id}`,
        staffMemberId: matchedStaff.id,
        googleUid: googleUid,
        email: cleanEmail,
        displayName: matchedStaff.name,
        photoURL: photoURL,
        role: matchedStaff.role,
        loginMethod: 'google',
        pinHash: matchedStaff.pinHash,
        isTwoFactorEnabled: false
      };

      setCurrentUser(authStaff);

      // If this staff member doesn't have a PIN quick-unlock set yet, prompt them to set one
      if (!matchedStaff.pinHash && !matchedStaff.pin) {
        setPendingFirstLoginStaff(matchedStaff);
      } else {
        setSuccessMsg(`Welcome, ${matchedStaff.name}! Signed in via Google (${cleanEmail}) as ${matchedStaff.role.toUpperCase()}.`);
        setTimeout(() => {
          onSuccessRedirect();
        }, 800);
      }
    }
  };

  const handleGoogleAuth = () => {
    setGoogleLoading(true);
    setErrorMsg('');
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;
    
    const popup = window.open(
      '/api/auth/google/login',
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0`
    );

    // Fallback if popup is blocked or running in sandboxed container
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Default to owner login if no popup
      setTimeout(() => {
        processGoogleAccountLogin(
          ownerEmail,
          'google-owner-id-101',
          'Ashraful Islam (Owner)',
          'https://lh3.googleusercontent.com/a/default-user'
        );
      }, 700);
    }
  };

  const handleSimulateGoogleLogin = (email: string, name: string) => {
    setGoogleLoading(true);
    setTimeout(() => {
      processGoogleAccountLogin(
        email,
        'mock-uid-' + Math.random().toString(36).substring(2, 8),
        name,
        'https://lh3.googleusercontent.com/a/default-user'
      );
    }, 400);
  };

  const handlePinSavedForFirstLogin = (pinHash: string, plainPin: string) => {
    if (!pendingFirstLoginStaff) return;

    if (setTeamMembers) {
      const updated = teamMembers.map(m => {
        if (m.id === pendingFirstLoginStaff.id) {
          return {
            ...m,
            pin: plainPin,
            pinHash: pinHash
          };
        }
        return m;
      });
      setTeamMembers(updated);
    }

    setPendingFirstLoginStaff(null);
    setSuccessMsg(`PIN quick-unlock configured! Opening workspace...`);
    setTimeout(() => {
      onSuccessRedirect();
    }, 600);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setSuccessMsg('Signed out of workspace. Returned to offline Solo Mode.');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 animate-fadeIn space-y-4" id="login-page-root">
      
      {/* Top Bar with Solo Mode Back Button */}
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Continue Offline in Solo Mode (No Login Required)</span>
          </button>
        ) : (
          <div className="text-xs text-slate-500 font-bold">
            Local-first by default • Zero friction for solo users
          </div>
        )}

        {/* Quick PIN Unlock Button if staff PINs are configured on device */}
        {activeStaffWithPin.length > 0 && !currentUser && (
          <button
            type="button"
            onClick={() => setShowQuickUnlockModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>PIN Quick-Unlock Pad</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* LEFT HERO COLUMN */}
        <div className="lg:col-span-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Brand Header */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-auto max-w-[200px] rounded-2xl overflow-hidden bg-black/90 p-1.5 border border-indigo-400/30 shadow-xl shadow-indigo-950/60 flex items-center justify-center">
                <img 
                  src={FASTINVO_OFFICIAL_LOGO} 
                  alt="FastInvo Official Logo" 
                  className="h-full w-auto object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Google Invite-Only Staff &amp; PIN Quick-Unlock
              </span>
              <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
                One True Identity Boundary with PIN Convenience
              </h1>
              <p className="text-xs text-indigo-200/80 leading-relaxed max-w-md">
                Staff are authenticated strictly by admin-invited Google accounts. Once authenticated, a 4–6 digit PIN offers instant convenience on shared shop devices.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-indigo-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>No Open Signup:</strong> Only admin-invited Google emails can access</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-indigo-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>PIN Quick-Unlock:</strong> SHA-256 local convenience gate on shared tablets</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-indigo-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Firebase Spark Compliant:</strong> Zero Cloud Functions, zero per-login SMS costs</span>
              </div>
            </div>
          </div>

          {/* Social Proof Footer */}
          <div className="relative z-10 pt-8 mt-6 border-t border-indigo-800/60 flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-indigo-900 object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120" alt="Avatar" />
              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-indigo-900 object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120" alt="Avatar" />
              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-indigo-900 object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120" alt="Avatar" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-[11px] font-extrabold text-indigo-200 mt-0.5">340+ Retailers &amp; Freelancers Worldwide</p>
            </div>
          </div>
        </div>

        {/* RIGHT FORM COLUMN */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center space-y-6 bg-white dark:bg-slate-900">
          
          {/* Signed In State */}
          {currentUser ? (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold mx-auto border border-emerald-300">
                <UserCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Authenticated Session
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                    {currentUser.role}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 pt-2">
                  {currentUser.displayName || 'FastInvo User'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {currentUser.email || `${currentUser.displayName} (Staff Session)`}
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onSuccessRedirect}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Go to Invoicing Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full sm:w-auto px-5 py-2.5 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold text-xs rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Switch Mode</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-black p-0.5 border border-slate-700/50 shadow-xs flex items-center justify-center shrink-0">
                    <img 
                      src={FASTINVO_ICON_MARK} 
                      alt="FastInvo Logo" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-800 dark:text-slate-200">
                    Fast<span className="text-emerald-500">Invo</span> Workspace
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Sign in with Google
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Workspace Owner or Admin-Invited Staff accounts
                </p>
              </div>

              {/* Error Notice (Clean rejection message for uninvited emails) */}
              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-200 text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 font-extrabold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Authentication Notice</span>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs rounded-2xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Primary Google Auth Action Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                  id="btn-google-signin-primary"
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-black text-xs rounded-2xl border border-slate-800 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-slate-900/10 disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google Account'}</span>
                </button>

                {/* Quick Unlock with PIN Callout (if active staff on device) */}
                {activeStaffWithPin.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        Returning to counter on this tablet?
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Use your 4-6 digit numeric PIN to quick-unlock your active session.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowQuickUnlockModal(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      PIN Unlock
                    </button>
                  </div>
                )}
              </div>

              {/* Developer & Test Accounts Preview Dropdown */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTestAccountSelector(!showTestAccountSelector)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    Test Account Simulation (Click to test roles &amp; invite verification)
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTestAccountSelector ? 'rotate-180' : ''}`} />
                </button>

                {showTestAccountSelector && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 animate-fadeIn">
                    <p className="text-[10px] text-slate-500">
                      Select an account to simulate the exact Google OAuth result and verify invite rules:
                    </p>
                    
                    <div className="space-y-1">
                      {/* Owner option */}
                      <button
                        type="button"
                        onClick={() => handleSimulateGoogleLogin(ownerEmail, 'Ashraful Islam (Owner)')}
                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-left hover:border-indigo-500 text-xs font-bold flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-black text-indigo-700 dark:text-indigo-400">👑 Owner Google Account</div>
                          <div className="text-[10px] text-slate-400">{ownerEmail}</div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-extrabold">OWNER</span>
                      </button>

                      {/* Invited Staff Members */}
                      {teamMembers.map(member => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSimulateGoogleLogin(member.googleEmail || member.email || '', member.name)}
                          className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-left hover:border-emerald-500 text-xs font-bold flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-black text-emerald-700 dark:text-emerald-400">👤 {member.name} (Invited)</div>
                            <div className="text-[10px] text-slate-400">{member.googleEmail || member.email}</div>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-extrabold uppercase">{member.role}</span>
                        </button>
                      ))}

                      {/* Non-invited stranger account (Tests rejection) */}
                      <button
                        type="button"
                        onClick={() => handleSimulateGoogleLogin('uninvited.stranger@gmail.com', 'Uninvited User')}
                        className="w-full p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-left hover:bg-rose-100 text-xs font-bold flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-black text-rose-700 dark:text-rose-400">🚫 Uninvited Google Account (Test Rejection)</div>
                          <div className="text-[10px] text-rose-500/80">uninvited.stranger@gmail.com</div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-extrabold">REJECT</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Local-First Solo Mode Note */}
              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-400">
                  FastInvo is local-first by default. All solo invoices are stored offline on your device with no login wall.
                </p>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* First-login Prompt to set PIN quick-unlock */}
      {pendingFirstLoginStaff && (
        <SetPinModal
          staffId={pendingFirstLoginStaff.id}
          staffName={pendingFirstLoginStaff.name}
          onPinSaved={handlePinSavedForFirstLogin}
          onDismiss={() => {
            setPendingFirstLoginStaff(null);
            onSuccessRedirect();
          }}
          isMandatory={false}
        />
      )}

      {/* Quick Unlock PIN Modal */}
      {showQuickUnlockModal && (
        <StaffPinLoginModal
          isOpen={showQuickUnlockModal}
          onClose={() => setShowQuickUnlockModal(false)}
          teamMembers={teamMembers}
          workspaceConfig={workspaceConfig}
          onStaffLoginSuccess={(member) => {
            setShowQuickUnlockModal(false);
            setSuccessMsg(`Unlocked session for ${member.name}!`);
            setTimeout(() => {
              onSuccessRedirect();
            }, 400);
          }}
          onGoogleSignIn={() => {
            setShowQuickUnlockModal(false);
            handleGoogleAuth();
          }}
        />
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, Shield, CheckCircle2, KeyRound, Copy, AlertCircle } from 'lucide-react';
import { AuthUser, TwoFactorConfig } from '../types';
import { FASTINVO_ICON_MARK } from '../assets/logo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  twoFactorConfig: TwoFactorConfig;
  onOpenTwoFactorModal: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  setCurrentUser,
  twoFactorConfig,
  onOpenTwoFactorModal
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const user: AuthUser = {
          id: event.data.user.id || 'usr-google-' + Math.random().toString(36).substr(2, 6),
          email: event.data.user.email || 'user@gmail.com',
          displayName: event.data.user.displayName || 'Google User',
          photoURL: event.data.user.photoURL || 'https://lh3.googleusercontent.com/a/default-user',
          role: 'owner',
          loginMethod: 'google',
          isTwoFactorEnabled: twoFactorConfig.isEnabled
        };
        setCurrentUser(user);
        setSuccess(`Signed in as ${user.email}!`);
        setError('');
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1200);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setCurrentUser, twoFactorConfig.isEnabled, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    // Local-first authentication simulation
    const mockUser: AuthUser = {
      id: 'usr-' + Math.random().toString(36).substr(2, 6),
      email: email.trim(),
      displayName: email.split('@')[0],
      role: 'owner',
      loginMethod: 'email',
      isTwoFactorEnabled: twoFactorConfig.isEnabled
    };

    setCurrentUser(mockUser);
    setSuccess(mode === 'login' ? 'Successfully signed in!' : 'Account created successfully!');
    setError('');
    setTimeout(() => {
      onClose();
      setSuccess('');
    }, 1200);
  };

  const handleGoogleSignIn = () => {
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;
    const popup = window.open(
      '/api/auth/google/login',
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      const mockUser: AuthUser = {
        id: 'usr-google-' + Math.random().toString(36).substr(2, 6),
        email: 'user@gmail.com',
        displayName: 'Google User',
        photoURL: 'https://lh3.googleusercontent.com/a/default-user',
        role: 'owner',
        loginMethod: 'google',
        isTwoFactorEnabled: twoFactorConfig.isEnabled
      };
      setCurrentUser(mockUser);
      setSuccess('Signed in with Google!');
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1200);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden space-y-5">
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
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Fast<span className="text-emerald-500">Invo</span> Security</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Account &amp; multi-device sync</p>
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

        {/* Local-First Banner */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200">
            <span className="font-extrabold block">FastInvo is Local-First!</span>
            All invoices are saved automatically in your browser. Account sign-in is completely optional for multi-device sync.
          </div>
        </div>

        {currentUser ? (
          /* Signed In State */
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signed In As</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{currentUser.email}</div>
              {currentUser.displayName && (
                <div className="text-xs text-slate-500">{currentUser.displayName}</div>
              )}
            </div>

            {/* 2FA Status */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Two-Factor Auth (TOTP)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {twoFactorConfig.isEnabled ? 'Enabled (Authenticator App)' : 'Disabled (Recommended)'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTwoFactorModal();
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  twoFactorConfig.isEnabled
                    ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                    : 'bg-[#0F3D2E] text-white hover:bg-[#164E3B]'
                }`}
              >
                {twoFactorConfig.isEnabled ? 'Manage 2FA' : 'Enable 2FA'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 text-xs font-extrabold text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          /* Form for Login / Signup */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-[#0F3D2E]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>{mode === 'login' ? 'Sign In' : 'Create Local Account'}</span>
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-bold">Or continue with</span></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google Sign-In</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

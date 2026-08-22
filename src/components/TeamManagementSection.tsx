/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  Mail, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Smartphone, 
  Globe, 
  UserCheck, 
  Eye, 
  EyeOff, 
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { TeamMember, WorkspaceConfig, AuthUser, UserRole } from '../types';
import { computePinHash } from '../utils/security';

interface TeamManagementSectionProps {
  workspaceConfig: WorkspaceConfig;
  setWorkspaceConfig: React.Dispatch<React.SetStateAction<WorkspaceConfig>>;
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  currentUser: AuthUser | null;
  onSwitchToStaff: (member: TeamMember) => void;
  onOpenPinModal: () => void;
}

export default function TeamManagementSection({
  workspaceConfig,
  setWorkspaceConfig,
  teamMembers,
  setTeamMembers,
  currentUser,
  onSwitchToStaff,
  onOpenPinModal,
}: TeamManagementSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [pinChangeMember, setPinChangeMember] = useState<TeamMember | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('staff');
  const [formEmail, setFormEmail] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formConfirmPin, setFormConfirmPin] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwnerOrAdmin = !currentUser || currentUser.role === 'owner' || currentUser.role === 'admin';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormRole('staff');
    setFormEmail('');
    setFormPin('');
    setFormConfirmPin('');
    setFormError('');
    setShowPinText(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormRole(member.role);
    setFormEmail(member.googleEmail || member.email || '');
    setFormPin(member.pin || '');
    setFormConfirmPin(member.pin || '');
    setFormError('');
    setShowPinText(false);
  };

  const handleOpenSetPinModal = (member: TeamMember) => {
    setPinChangeMember(member);
    setFormPin('');
    setFormConfirmPin('');
    setFormError('');
    setShowPinText(false);
  };

  const handleGenerateRandomPin = () => {
    const rand = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPin(rand);
    setFormConfirmPin(rand);
    setShowPinText(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please provide a staff member name.');
      return;
    }

    const cleanEmail = formEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please provide a valid Google account email for this staff invite.');
      return;
    }

    // Check for duplicate emails (excluding the current editing member)
    const existingWithEmail = teamMembers.find(
      m => (m.googleEmail?.toLowerCase() === cleanEmail || m.email?.toLowerCase() === cleanEmail) &&
           (!editingMember || m.id !== editingMember.id)
    );
    if (existingWithEmail) {
      setFormError(`A team member with Google email "${cleanEmail}" is already invited.`);
      return;
    }

    const cleanPin = formPin.trim();
    if (cleanPin) {
      if (cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin)) {
        setFormError('PIN must be a 4 to 6 digit numeric code (e.g. 1234, 5544, 987654).');
        return;
      }
      if (cleanPin !== formConfirmPin.trim()) {
        setFormError('PIN confirmation does not match.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (editingMember) {
        // Update existing member
        let newPinHash = editingMember.pinHash;
        if (cleanPin) {
          newPinHash = await computePinHash(editingMember.id, cleanPin);
        }

        const updated = teamMembers.map(m => {
          if (m.id === editingMember.id) {
            return {
              ...m,
              name: formName.trim(),
              role: formRole,
              googleEmail: cleanEmail,
              email: cleanEmail,
              pin: cleanPin || m.pin,
              pinHash: newPinHash,
            };
          }
          return m;
        });

        setTeamMembers(updated);
        setEditingMember(null);
        showToast(`Updated staff invite for "${formName.trim()}"`);
      } else {
        // Create new staff doc
        const staffId = 'staff-' + Math.random().toString(36).substring(2, 9);
        let calculatedPinHash: string | null = null;
        if (cleanPin) {
          calculatedPinHash = await computePinHash(staffId, cleanPin);
        }

        const newMember: TeamMember = {
          id: staffId,
          name: formName.trim(),
          role: formRole,
          loginMethod: 'google',
          googleEmail: cleanEmail,
          email: cleanEmail,
          googleUid: null, // Claimed on first sign in
          pin: cleanPin || undefined,
          pinHash: calculatedPinHash,
          status: 'active',
          createdAt: new Date().toISOString(),
          addedAt: new Date().toISOString()
        };

        const updated = [...teamMembers, newMember];
        setTeamMembers(updated);
        setShowAddModal(false);
        showToast(`Invited "${newMember.name}" (${cleanEmail}). Role: ${formRole.toUpperCase()}`);
      }
    } catch (err) {
      setFormError('Error saving staff record. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePinDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinChangeMember) return;

    const cleanPin = formPin.trim();
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin)) {
      setFormError('PIN must be 4 to 6 numeric digits.');
      return;
    }
    if (cleanPin !== formConfirmPin.trim()) {
      setFormError('PIN confirmation does not match.');
      return;
    }

    try {
      const hash = await computePinHash(pinChangeMember.id, cleanPin);
      const updated = teamMembers.map(m => {
        if (m.id === pinChangeMember.id) {
          return {
            ...m,
            pin: cleanPin,
            pinHash: hash,
          };
        }
        return m;
      });

      setTeamMembers(updated);
      setPinChangeMember(null);
      showToast(`Quick-Unlock PIN updated for "${pinChangeMember.name}"`);
    } catch (err) {
      setFormError('Failed to hash and save PIN.');
    }
  };

  const handleToggleStatus = (memberId: string) => {
    const updated = teamMembers.map(m => {
      if (m.id === memberId) {
        const nextStatus = (m.status === 'active' || (m.status as string) === 'ACTIVE') ? 'inactive' : 'active';
        return { ...m, status: nextStatus as any };
      }
      return m;
    });
    setTeamMembers(updated);
    showToast('Updated member access status.');
  };

  const handleDeleteMember = () => {
    if (!deletingMember) return;
    const updated = teamMembers.filter(m => m.id !== deletingMember.id);
    setTeamMembers(updated);
    setDeletingMember(null);
    showToast('Removed staff invite from workspace.');
  };

  const activeStaffCount = teamMembers.filter(m => m.status === 'active' || (m.status as string) === 'ACTIVE').length;
  const claimedCount = teamMembers.filter(m => !!m.googleUid).length;
  const pendingCount = teamMembers.length - claimedCount;

  return (
    <div className="space-y-6" id="team-management-section">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-2xl font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header / Intro Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Google Invite-Only Staff &amp; PIN Quick-Unlock
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              <strong>One true identity boundary:</strong> Staff sign in with their invited Google email. Once signed in, a <strong>4–6 digit PIN Quick-Unlock</strong> allows instantaneous access on shared shop devices without repeating the full Google consent screen.
            </p>
          </div>

          {isOwnerOrAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenAdd}
                id="btn-add-staff-member"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Staff Member</span>
              </button>

              <button
                type="button"
                onClick={onOpenPinModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-2xl border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer"
                title="Preview device PIN Quick-Unlock keypad"
              >
                <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Test PIN Pad</span>
              </button>
            </div>
          )}
        </div>

        {/* Security & Flow Architecture Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Google Email Invite
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
                {activeStaffCount} Invited
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Only Google accounts on this admin-invited list can sign in. Non-invited emails are rejected automatically.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                2. PIN Quick-Unlock
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold">
                SHA-256 Hashed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Admin can pre-set a PIN or let staff choose on first sign-in. Resumes active session on this device in seconds.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                3. Zero-Risk Fallback
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
                Always Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              If PIN is forgotten or mistyped, "Sign in with Google again" is always available to seamlessly re-authenticate.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix Information */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 rounded-3xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200">
          <Info className="w-4 h-4 text-slate-500" />
          <span>Role Permissions Matrix (Admin vs Staff)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Staff Members CAN:
            </span>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
              <li>Create &amp; edit invoices and quotations</li>
              <li>Record client payments (Cash, Card, MFS, Bank)</li>
              <li>Add and update client contact details</li>
              <li>Share &amp; print e-receipts and PDF invoices</li>
              <li>Update their own PIN Quick-Unlock code</li>
            </ul>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <span className="font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Staff Members CANNOT:
            </span>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
              <li>Delete invoices, quotations, or client records</li>
              <li>Access business-wide revenue reports or profit analytics</li>
              <li>Modify company profile, tax rules, or payment accounts</li>
              <li>Manage, invite, or view other team members' PINs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
            Workspace Roster ({teamMembers.length + 1} Accounts)
          </h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
              {claimedCount + 1} Signed-in
            </span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                {pendingCount} Pending Invite
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/70 dark:border-slate-800 rounded-2xl overflow-hidden">
          
          {/* Owner Row */}
          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                👑
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                    {workspaceConfig.name ? `${workspaceConfig.name} (Owner)` : (currentUser?.displayName || 'Workspace Owner')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-black">
                    OWNER
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentUser?.email || workspaceConfig.ownerEmail || 'linkonashrafulislam@gmail.com'} • Primary Google Owner Account
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium sm:text-right">
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">Full Workspace Authority</span>
            </div>
          </div>

          {/* Invited Staff Members */}
          {teamMembers.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">No staff members invited yet.</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                FastInvo is currently in zero-login Solo Mode. Invite staff by Google email whenever you want to expand to multi-user or shared store devices.
              </p>
              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite First Staff Member</span>
                </button>
              )}
            </div>
          ) : (
            teamMembers.map(member => {
              const isCurrentSession = currentUser?.staffMemberId === member.id;
              const hasClaimedGoogle = !!member.googleUid;
              const hasPinSet = !!member.pinHash;
              const email = member.googleEmail || member.email || '';
              const isActive = member.status === 'active' || (member.status as string) === 'ACTIVE';

              return (
                <div 
                  key={member.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrentSession ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                          {member.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${
                          member.role === 'admin' 
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {member.role}
                        </span>
                        
                        {/* Invite status */}
                        {hasClaimedGoogle ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Claimed &amp; Active
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Invited (Pending 1st Login)
                          </span>
                        )}

                        {!isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold">
                            Disabled
                          </span>
                        )}

                        {isCurrentSession && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold">
                            Current Device Session
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                          <Mail className="w-3 h-3 text-blue-500" />
                          {email}
                        </span>

                        <span className="inline-flex items-center gap-1 font-mono font-bold">
                          <KeyRound className={`w-3 h-3 ${hasPinSet ? 'text-emerald-600' : 'text-slate-400'}`} />
                          {hasPinSet ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              PIN: {isOwnerOrAdmin && member.pin ? `•••• (${member.pin})` : '•••• (Configured)'}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              PIN: Not set yet
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isOwnerOrAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => onSwitchToStaff(member)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                          title="Switch active session to this staff member"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Switch Session</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenSetPinModal(member)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-[11px] font-extrabold transition-colors cursor-pointer flex items-center gap-1"
                        title="Set or reset PIN for this staff member (even before first login)"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>{hasPinSet ? 'Reset PIN' : 'Set PIN'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(member.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition-colors cursor-pointer ${
                          isActive
                            ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                        }`}
                        title={isActive ? 'Disable Access' : 'Activate Access'}
                      >
                        {isActive ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(member)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Staff Member"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingMember(member)}
                        className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                        title="Remove Staff Invite"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

        </div>
      </div>

      {/* Add / Edit Staff Invite Modal */}
      {(showAddModal || editingMember) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {editingMember ? 'Edit Staff Member' : 'Invite Staff Member by Google Email'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Authorized Google account with PIN quick-unlock</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMember(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-2xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Member Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Liam Cashier, Front Counter"
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                  required
                />
              </div>

              {/* Google Email Address (The Invite) */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Google Account Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="staff.name@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  The staff member must sign in using this exact Google email address to verify identity and claim the seat.
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  Workspace Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormRole('staff')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      formRole === 'staff'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black">👤 Staff</span>
                      {formRole === 'staff' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Create invoices &amp; record payments. Deletes, reports &amp; settings locked.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole('admin')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      formRole === 'admin'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black">🛡️ Admin</span>
                      {formRole === 'admin' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Full workspace access including delete rights &amp; financial reports.
                    </p>
                  </button>
                </div>
              </div>

              {/* Pre-assign PIN (Optional at invite time) */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    Pre-assign PIN Quick-Unlock (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-Generate
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      4–6 Digit PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showPinText ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={6}
                        value={formPin}
                        onChange={e => setFormPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Leave blank or e.g. 1234"
                        className="w-full pl-3 pr-8 py-2 text-xs font-mono font-bold tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPinText(!showPinText)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm PIN
                    </label>
                    <input
                      type={showPinText ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={6}
                      value={formConfirmPin}
                      onChange={e => setFormConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Confirm PIN"
                      className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80">
                  If left blank, the staff member will be prompted to choose their PIN upon their first Google sign-in.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMember(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingMember ? 'Save Changes' : 'Send Google Invite'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Set / Reset PIN Modal (Admin pre-assign / reset) */}
      {pinChangeMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Set PIN for {pinChangeMember.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">{pinChangeMember.googleEmail || pinChangeMember.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPinChangeMember(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePinDirectly} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    New PIN Code (4–6 digits)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] font-extrabold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-Generate
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPinText ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={formPin}
                    onChange={e => setFormPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1234"
                    className="w-full pl-3 pr-8 py-2 text-sm font-mono font-bold tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinText(!showPinText)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New PIN
                  </label>
                  <input
                    type={showPinText ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={formConfirmPin}
                    onChange={e => setFormConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Re-enter PIN"
                    className="w-full px-3 py-2 text-sm font-mono font-bold tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-600 focus:outline-none dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPinChangeMember(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Remove Staff Invite?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to revoke access for <strong>{deletingMember.name}</strong> ({deletingMember.googleEmail || deletingMember.email})? Their Google account will no longer be permitted to sign in to this workspace.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer"
              >
                Revoke Invite
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

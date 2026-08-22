/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TeamMember, WorkspaceStaffDoc } from '../types';

/**
 * Computes SHA-256 hash for PIN quick-unlock:
 * Formula: sha256(staffId + ":" + pin)
 */
export async function computePinHash(staffId: string, pin: string): Promise<string> {
  const normalizedPin = pin.trim();
  const input = `${staffId}:${normalizedPin}`;
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback simple hash for non-crypto environments (should rarely happen in modern browsers)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Verifies if entered PIN matches the stored pinHash
 */
export async function verifyPinHash(staffId: string, pin: string, expectedHash?: string | null): Promise<boolean> {
  if (!expectedHash) return false;
  const calculated = await computePinHash(staffId, pin);
  return calculated.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Validates whether a Google account email is authorized for a workspace:
 * Either as the Workspace Owner, or as an active invited staff member.
 */
export function findAuthorizedStaffOrOwner(
  googleEmail: string,
  teamMembers: TeamMember[],
  ownerEmail: string
): { isAuthorized: boolean; isOwner: boolean; staffMember?: TeamMember } {
  const cleanEmail = googleEmail.trim().toLowerCase();
  
  // 1. Check Owner
  if (ownerEmail && cleanEmail === ownerEmail.trim().toLowerCase()) {
    return { isAuthorized: true, isOwner: true };
  }

  // 2. Check invited staff members
  const matched = teamMembers.find(
    m => (m.googleEmail?.trim().toLowerCase() === cleanEmail || m.email?.trim().toLowerCase() === cleanEmail)
  );

  if (matched) {
    const isActive = matched.status === 'active' || (matched.status as string) === 'ACTIVE';
    if (isActive) {
      return { isAuthorized: true, isOwner: false, staffMember: matched };
    }
  }

  return { isAuthorized: false, isOwner: false };
}

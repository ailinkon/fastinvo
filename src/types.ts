/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Currency {
  code: string;
  symbol: string;
  label: string;
  locale?: string;
  symbolPlacement?: 'before' | 'after' | 'before-space' | 'after-space';
  decimalPlaces?: number;
}

export type InvoiceTemplateId = 'minimalist' | 'modern-blue' | 'editorial-serif' | 'compact-slate' | 'bold-accent';

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface SavedItem {
  id: string;
  name: string;
  defaultPrice: number;
  defaultTaxRate?: number;
  currency?: string;
}

export interface BusinessProfile {
  logo: string; // Base64 string
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxRegLabel: string; // e.g., "ABN", "VAT No.", "BIN"
  taxRegNumber: string;
  currency: Currency;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  quotationPrefix?: string;
  nextQuotationNumber?: number;
  template: InvoiceTemplateId;
  paymentMethods?: string[];
  paymentProcedure?: string;
  paymentGatewayInfo?: string;
  mfsProvider?: string;
  mfsAccountNo?: string;
  mfsAccountType?: string;
  thankYouMessage?: string;
  // Feature 1: Payment details for QR (Scan to pay)
  paymentQrType?: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Bank' | 'Other' | string;
  paymentQrAccount?: string;
  paymentQrAccountName?: string;
  paymentQrBankName?: string;
  paymentQrRouting?: string;
  paymentQrInstructions?: string;
}

export interface TaxConfig {
  taxEnabled: boolean; // false means "No Tax"
  taxRate: number; // e.g., 10 for 10%
  taxInclusive: boolean; // true = Mode A (prices include tax), false = Mode B (prices exclude tax)
  taxName?: string; // Optional custom name shown on invoice, e.g. "VAT", "GST", "Tax"
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceMetadata {
  invoiceNumber: string;
  quotationNumber?: string;
  issueDate: string;
  dueDate: string;
  validUntil?: string;
  paymentTerms: string;
  notes: string;
}

export interface CustomerDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export type DiscountType = 'percentage' | 'fixed';

export type DocumentType = 'invoice' | 'quotation';
export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired';

export interface InvoiceDraft {
  documentType?: DocumentType;
  metadata: InvoiceMetadata;
  customer: CustomerDetails;
  items: LineItem[];
  discountType: DiscountType;
  discountValue: number;
  status?: 'Paid' | 'Due';
  quotationStatus?: QuotationStatus;
  convertedFromQuoteId?: string;
  convertedFromQuoteNumber?: string;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  originatingQuotationNumber?: string;
  paymentMethod?: string;
  paidAmount?: number;
  paidDate?: string;
  mfsProvider?: string;
  mfsTrxId?: string;
  bankName?: string;
  bankBranch?: string;
  bankRoutingNo?: string;
  bankTransactionId?: string;
}

export type UserRole = 'owner' | 'admin' | 'staff';
export type StaffRole = 'ADMIN' | 'STAFF';
export type StaffStatus = 'ACTIVE' | 'DISABLED' | 'active' | 'inactive';
export type LoginMethod = 'google' | 'pin' | 'email';

export interface WorkspaceStaffDoc {
  id: string;
  name: string;
  role: StaffRole;
  googleEmail: string;
  googleUid?: string | null;
  pinHash?: string | null;
  status: StaffStatus;
  createdAt: string;
  lastLoginAt?: string;
  avatarBg?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  loginMethod?: LoginMethod;
  email?: string; // For Google sign-in
  googleEmail?: string;
  googleUid?: string | null;
  pin?: string;
  pinHash?: string | null;
  avatar?: string;
  avatarBg?: string;
  status: 'active' | 'inactive' | 'ACTIVE' | 'DISABLED';
  createdAt?: string;
  addedAt?: string;
  lastLoginAt?: string;
}

export interface DeviceLockState {
  isLocked: boolean;
  staffId?: string | null;
  staffName?: string | null;
  lockedAt?: string;
  failedAttempts?: number;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  ownerEmail: string;
  teamMembers: TeamMember[];
  isMultiUserEnabled: boolean;
  requirePinLockOnSwitch?: boolean;
}

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string | null;
  role: UserRole;
  loginMethod: LoginMethod;
  isTwoFactorEnabled?: boolean;
  staffMemberId?: string;
  googleUid?: string | null;
  pinHash?: string | null;
}

export interface TwoFactorConfig {
  isEnabled: boolean;
  secret: string;
  qrCodeUrl?: string;
  recoveryCodes: string[];
}

export interface AppSettings {
  profile: BusinessProfile;
  tax: TaxConfig;
}

export interface SavedInvoice {
  id: string;
  draft: InvoiceDraft;
  profile: BusinessProfile;
  tax: TaxConfig;
  createdAt: string;
}


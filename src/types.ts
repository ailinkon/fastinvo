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
  template: InvoiceTemplateId;
  paymentMethods?: string[];
  paymentProcedure?: string;
  paymentGatewayInfo?: string;
  mfsProvider?: string;
  mfsAccountNo?: string;
  mfsAccountType?: string;
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
  issueDate: string;
  dueDate: string;
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

export interface InvoiceDraft {
  metadata: InvoiceMetadata;
  customer: CustomerDetails;
  items: LineItem[];
  discountType: DiscountType;
  discountValue: number;
  status?: 'Paid' | 'Due';
  paymentMethod?: string;
  paidAmount?: number;
  mfsProvider?: string;
  mfsTrxId?: string;
  bankName?: string;
  bankBranch?: string;
  bankRoutingNo?: string;
  bankTransactionId?: string;
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


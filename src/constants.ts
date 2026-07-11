/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Currency, BusinessProfile, TaxConfig, InvoiceDraft } from './types';

export const POPULAR_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', label: '$ USD (US Dollar)' },
  { code: 'EUR', symbol: '€', label: '€ EUR (Euro)' },
  { code: 'GBP', symbol: '£', label: '£ GBP (British Pound)' },
  { code: 'AUD', symbol: '$', label: '$ AUD (Australian Dollar)' },
  { code: 'CAD', symbol: '$', label: '$ CAD (Canadian Dollar)' },
  { code: 'BDT', symbol: '৳', label: '৳ BDT (Bangladeshi Taka)' },
  { code: 'INR', symbol: '₹', label: '₹ INR (Indian Rupee)' },
  { code: 'JPY', symbol: '¥', label: '¥ JPY (Japanese Yen)' },
  { code: 'SGD', symbol: '$', label: '$ SGD (Singapore Dollar)' },
];

export const DEFAULT_PROFILE: BusinessProfile = {
  logo: '',
  companyName: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  taxRegLabel: 'VAT No.',
  taxRegNumber: '',
  currency: { code: 'USD', symbol: '$', label: '$ USD (US Dollar)' },
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1001,
  template: 'minimalist',
  paymentMethods: ['Cash'],
  paymentProcedure: '',
  paymentGatewayInfo: '',
  mfsProvider: '',
  mfsAccountNo: '',
  mfsAccountType: 'Personal',
};

export const DEFAULT_TAX_CONFIG: TaxConfig = {
  taxEnabled: true,
  taxRate: 10,
  taxInclusive: false, // Mode B (prices EXCLUDE tax) by default
};

export const getTodayDateString = (): string => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const DEFAULT_INVOICE_DRAFT = (nextNum: string): InvoiceDraft => ({
  metadata: {
    invoiceNumber: nextNum,
    issueDate: getTodayDateString(),
    dueDate: '',
    paymentTerms: '',
    notes: '',
  },
  customer: {
    name: '',
    address: '',
    phone: '',
    email: '',
  },
  items: [
    { id: '1', description: '', quantity: 0, unitPrice: 0 }
  ],
  discountType: 'percentage',
  discountValue: 0,
  status: 'Due',
  mfsTrxId: '',
  bankName: '',
  bankBranch: '',
  bankRoutingNo: '',
  bankTransactionId: '',
});

/**
 * Currency formatter helper
 */
export function formatMoney(amount: number, currencySymbol: string): string {
  // Prevent floating point anomalies (e.g. 0.1 + 0.2 = 0.30000000000000004)
  const roundedAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
  
  // Format with thousand separators and always 2 decimal places
  const formatted = roundedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return `${currencySymbol}${formatted}`;
}

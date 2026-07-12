/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Currency, BusinessProfile, TaxConfig, InvoiceDraft } from './types';

export const POPULAR_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', label: '$ USD (US Dollar)', locale: 'en-US', symbolPlacement: 'before', decimalPlaces: 2 },
  { code: 'EUR', symbol: '€', label: '€ EUR (Euro)', locale: 'de-DE', symbolPlacement: 'after-space', decimalPlaces: 2 },
  { code: 'GBP', symbol: '£', label: '£ GBP (British Pound)', locale: 'en-GB', symbolPlacement: 'before', decimalPlaces: 2 },
  { code: 'AUD', symbol: '$', label: '$ AUD (Australian Dollar)', locale: 'en-AU', symbolPlacement: 'before', decimalPlaces: 2 },
  { code: 'CAD', symbol: '$', label: '$ CAD (Canadian Dollar)', locale: 'en-CA', symbolPlacement: 'before', decimalPlaces: 2 },
  { code: 'BDT', symbol: '৳', label: '৳ BDT (Bangladeshi Taka)', locale: 'bn-BD', symbolPlacement: 'before-space', decimalPlaces: 2 },
  { code: 'INR', symbol: '₹', label: '₹ INR (Indian Rupee)', locale: 'en-IN', symbolPlacement: 'before-space', decimalPlaces: 2 },
  { code: 'JPY', symbol: '¥', label: '¥ JPY (Japanese Yen)', locale: 'ja-JP', symbolPlacement: 'before', decimalPlaces: 0 },
  { code: 'SGD', symbol: '$', label: '$ SGD (Singapore Dollar)', locale: 'en-SG', symbolPlacement: 'before', decimalPlaces: 2 },
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
  currency: { code: 'USD', symbol: '$', label: '$ USD (US Dollar)', locale: 'en-US', symbolPlacement: 'before', decimalPlaces: 2 },
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
  taxName: 'Tax',
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
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ],
  discountType: 'percentage',
  discountValue: 0,
  status: 'Due',
  paymentMethod: '',
  paidAmount: 0,
  mfsTrxId: '',
  bankName: '',
  bankBranch: '',
  bankRoutingNo: '',
  bankTransactionId: '',
});

/**
 * Currency formatter helper
 */
export function formatMoney(amount: number, currency: Currency | string): string {
  if (typeof currency === 'string') {
    // backward compatibility or raw symbol fallback
    const roundedAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
    const formatted = roundedAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currency}${formatted}`;
  }

  const decimals = currency.decimalPlaces !== undefined ? currency.decimalPlaces : 2;
  const factor = Math.pow(10, decimals);
  const roundedAmount = Math.round((amount + Number.EPSILON) * factor) / factor;

  const locale = currency.locale || 'en-US';
  const formatted = roundedAmount.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const symbol = currency.symbol || '';
  const placement = currency.symbolPlacement || 'before';

  switch (placement) {
    case 'after':
      return `${formatted}${symbol}`;
    case 'after-space':
      return `${formatted} ${symbol}`;
    case 'before-space':
      return `${symbol} ${formatted}`;
    case 'before':
    default:
      return `${symbol}${formatted}`;
  }
}

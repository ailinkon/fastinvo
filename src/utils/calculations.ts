import { LineItem, TaxConfig, DiscountType } from '../types';

/** Round to cents, guarding against floating-point drift. */
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(item?: LineItem | null): number {
  if (!item) return 0;
  const qty = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
  const price = typeof item.unitPrice === 'number' && !isNaN(item.unitPrice) ? item.unitPrice : 0;
  return r2(qty * price);
}

/**
 * Determines whether a line item is a real item (entered by user)
 * versus an untouched auto-added blank/placeholder row.
 * Filters out rows where name is empty OR "service/product" AND unitPrice is 0.
 * Keeps legitimate $0 items if user typed a custom name for them.
 */
export function isRealLineItem(item?: LineItem | null): boolean {
  if (!item) return false;
  const desc = (item.description || '').trim().toLowerCase();
  const isPlaceholderOrEmpty = desc === '' || desc === 'service/product';
  const isZeroPrice = !item.unitPrice || item.unitPrice === 0;

  return !(isPlaceholderOrEmpty && isZeroPrice);
}

export function filterRealItems(items?: LineItem[] | null): LineItem[] {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(isRealLineItem);
}

export interface InvoiceTotals {
  subtotal: number;   // Mode B: prices as entered. Mode A: net of tax, before discount.
  discount: number;   // Mode B: as entered/derived. Mode A: net of tax.
  taxAmount: number;
  grandTotal: number; // Guaranteed: r2(subtotal - discount + taxAmount) === grandTotal
}

export function calculateInvoiceTotals(
  items?: LineItem[] | null,
  discountType: DiscountType = 'percentage',
  discountValue: number = 0,
  tax?: TaxConfig | null,
): InvoiceTotals {
  const validItems = filterRealItems(items);

  // Round each line to cents FIRST, then sum — so rows visibly add up.
  const grossSubtotal = r2(validItems.reduce((sum, i) => sum + lineTotal(i), 0));

  const validDiscountVal = typeof discountValue === 'number' && !isNaN(discountValue) ? discountValue : 0;
  let discountGross =
    discountType === 'percentage'
      ? r2(grossSubtotal * (Math.max(0, validDiscountVal) / 100))
      : r2(Math.max(0, validDiscountVal));
  discountGross = Math.min(discountGross, grossSubtotal);

  const safeTax = tax || { taxEnabled: false, taxRate: 0, taxInclusive: false };

  // No tax
  if (!safeTax.taxEnabled || !safeTax.taxRate || safeTax.taxRate <= 0) {
    return {
      subtotal: grossSubtotal,
      discount: discountGross,
      taxAmount: 0,
      grandTotal: r2(grossSubtotal - discountGross),
    };
  }

  // Mode A: prices INCLUDE tax
  if (safeTax.taxInclusive) {
    const grandTotal = r2(grossSubtotal - discountGross);
    const taxAmount = r2((grandTotal * safeTax.taxRate) / (100 + safeTax.taxRate));
    const subtotal = r2((grossSubtotal * 100) / (100 + safeTax.taxRate));
    // Discount shown net of tax, derived so the breakdown ALWAYS
    // reconciles to the cent: subtotal − discount + tax === grandTotal.
    const discount = r2(subtotal + taxAmount - grandTotal);
    return { subtotal, discount, taxAmount, grandTotal };
  }

  // Mode B: prices EXCLUDE tax
  const afterDiscount = r2(grossSubtotal - discountGross);
  const taxAmount = r2((afterDiscount * safeTax.taxRate) / 100);
  return {
    subtotal: grossSubtotal,
    discount: discountGross,
    taxAmount,
    grandTotal: r2(afterDiscount + taxAmount),
  };
}

export type ComputedStatus = 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue';

export function getInvoiceStatus(draft?: {
  status?: string;
  paidAmount?: number;
  metadata?: { dueDate?: string };
} | null, grandTotal: number = 0): ComputedStatus {
  if (!draft) return 'Unpaid';
  const paid = draft.paidAmount || (draft.status === 'Paid' ? grandTotal : 0);
  const balanceDue = Math.max(0, grandTotal - paid);

  if (draft.status === 'Paid' || balanceDue <= 0.01) {
    return 'Paid';
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dueDateStr = draft.metadata?.dueDate ? draft.metadata.dueDate.split('T')[0] : '';
  const isOverdue = Boolean(dueDateStr && dueDateStr < todayStr && balanceDue > 0.01);

  if (isOverdue) {
    return 'Overdue';
  }

  if (paid > 0.01 && balanceDue > 0.01) {
    return 'Partially Paid';
  }

  return 'Unpaid';
}

export type ComputedQuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired';

export function getQuotationStatus(draft?: {
  quotationStatus?: string;
  metadata?: { validUntil?: string };
} | null): ComputedQuotationStatus {
  if (!draft) return 'Draft';
  const currentStatus = (draft.quotationStatus as ComputedQuotationStatus) || 'Draft';
  if (currentStatus === 'Accepted' || currentStatus === 'Declined') {
    return currentStatus;
  }
  const todayStr = new Date().toISOString().split('T')[0];
  const validUntilStr = draft.metadata?.validUntil ? draft.metadata.validUntil.split('T')[0] : '';
  if (validUntilStr && validUntilStr < todayStr) {
    return 'Expired';
  }
  return currentStatus;
}

/**
 * Checks if an invoice qualifies for a reminder:
 * - Must be an Invoice (not a quote)
 * - Must be Unpaid or Partially Paid
 * - Due date is approaching (within ~3 days) or past due (overdue), or unpaid with no due date
 */
export function shouldShowReminder(draft?: {
  documentType?: string;
  status?: string;
  paidAmount?: number;
  metadata?: { dueDate?: string };
} | null, grandTotal: number = 0): boolean {
  if (!draft || draft.documentType === 'quotation') return false;
  
  const status = getInvoiceStatus(draft, grandTotal);
  if (status === 'Paid') return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDateStr = draft.metadata?.dueDate ? draft.metadata.dueDate.split('T')[0] : '';
  if (!dueDateStr) {
    // If no due date is set, but invoice is unpaid/partially paid, still allow sending reminder
    return true;
  }

  const dueDate = new Date(dueDateStr);
  if (isNaN(dueDate.getTime())) return true;
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Approaching within 3 days (<= 3) or past due (< 0)
  return diffDays <= 3;
}

export function getDaysUntilDue(dueDateStr?: string): { days: number; isOverdue: boolean; isDueToday: boolean } | null {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr.split('T')[0]);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return {
    days: Math.abs(diffDays),
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
  };
}



import { LineItem, TaxConfig, DiscountType } from '../types';

/** Round to cents, guarding against floating-point drift. */
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** A single row's total, rounded to cents — use for row display too. */
export const lineTotal = (item: LineItem): number => r2(item.quantity * item.unitPrice);

export interface InvoiceTotals {
  subtotal: number;   // Mode B: prices as entered. Mode A: net of tax, before discount.
  discount: number;   // Mode B: as entered/derived. Mode A: net of tax.
  taxAmount: number;
  grandTotal: number; // Guaranteed: r2(subtotal - discount + taxAmount) === grandTotal
}

export function calculateInvoiceTotals(
  items: LineItem[],
  discountType: DiscountType,
  discountValue: number,
  tax: TaxConfig,
): InvoiceTotals {
  const validItems = items.filter(
    (i) => i.description.trim() !== '' || i.unitPrice > 0,
  );

  // Round each line to cents FIRST, then sum — so rows visibly add up.
  const grossSubtotal = r2(validItems.reduce((sum, i) => sum + lineTotal(i), 0));

  let discountGross =
    discountType === 'percentage'
      ? r2(grossSubtotal * (Math.max(0, discountValue) / 100))
      : r2(Math.max(0, discountValue));
  discountGross = Math.min(discountGross, grossSubtotal);

  // No tax
  if (!tax.taxEnabled || tax.taxRate <= 0) {
    return {
      subtotal: grossSubtotal,
      discount: discountGross,
      taxAmount: 0,
      grandTotal: r2(grossSubtotal - discountGross),
    };
  }

  // Mode A: prices INCLUDE tax
  if (tax.taxInclusive) {
    const grandTotal = r2(grossSubtotal - discountGross);
    const taxAmount = r2((grandTotal * tax.taxRate) / (100 + tax.taxRate));
    const subtotal = r2((grossSubtotal * 100) / (100 + tax.taxRate));
    // Discount shown net of tax, derived so the breakdown ALWAYS
    // reconciles to the cent: subtotal − discount + tax === grandTotal.
    const discount = r2(subtotal + taxAmount - grandTotal);
    return { subtotal, discount, taxAmount, grandTotal };
  }

  // Mode B: prices EXCLUDE tax
  const afterDiscount = r2(grossSubtotal - discountGross);
  const taxAmount = r2((afterDiscount * tax.taxRate) / 100);
  return {
    subtotal: grossSubtotal,
    discount: discountGross,
    taxAmount,
    grandTotal: r2(afterDiscount + taxAmount),
  };
}

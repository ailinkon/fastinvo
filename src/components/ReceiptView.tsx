import React, { useRef, useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MoreHorizontal, 
  Download, 
  Share2, 
  Printer, 
  CheckCircle,
  Receipt as ReceiptIcon,
  Copy,
  Check,
  Mail,
  MessageCircle,
  X
} from 'lucide-react';
import html2canvasPro from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { exportPdf } from '../utils/exportPdf';
import { InvoiceDraft, BusinessProfile, TaxConfig } from '../types';
import { formatMoney } from '../constants';
import { calculateInvoiceTotals, filterRealItems } from '../utils/calculations';
import { ShareModal } from './ShareModal';

interface ReceiptViewProps {
  draft: InvoiceDraft;
  profile: BusinessProfile;
  tax: TaxConfig;
  transactionId?: string;
  paymentMethod?: string;
  onBack: () => void;
}

export default function ReceiptView({
  draft,
  profile,
  tax,
  transactionId = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
  paymentMethod = 'Cash',
  onBack,
}: ReceiptViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const receiptCardRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const validItems = filterRealItems(draft.items);
  const { subtotal, discount, taxAmount, grandTotal } = calculateInvoiceTotals(
    validItems,
    draft.discountType,
    draft.discountValue,
    tax
  );

  const paymentDate = (draft as any).paidDate || new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const receiptNo = draft.metadata.invoiceNumber || 'REC-001';
  const receiptFileName = `Receipt-${receiptNo}.pdf`;

  const itemsText = validItems
    .map(item => `• ${item.description || 'Item'} (${item.quantity} x ${formatMoney(item.unitPrice, profile.currency.symbol)}) = ${formatMoney(item.quantity * item.unitPrice, profile.currency.symbol)}`)
    .join('\n');

  const receiptTextSummary = `OFFICIAL PAYMENT RECEIPT #${receiptNo}
${profile.companyName || 'Business Name'}

Date: ${paymentDate}
Customer: ${draft.customer.name || 'Valued Customer'}

ITEMS:
${itemsText}

Subtotal: ${formatMoney(subtotal, profile.currency.symbol)}
${tax.taxEnabled && taxAmount > 0 ? `${tax.taxName || 'Tax'} (${tax.taxRate}%): ${formatMoney(taxAmount, profile.currency.symbol)}\n` : ''}TOTAL PAID: ${formatMoney(draft.paidAmount || grandTotal, profile.currency.symbol)}
Payment Method: ${paymentMethod}
Transaction Ref: ${transactionId}
Status: PAID & CONFIRMED

${profile.thankYouMessage || 'Thank you for your business!'}`;

  const generateReceiptPDF = async (): Promise<jsPDF | null> => {
    if (!receiptCardRef.current) return null;

    const element = receiptCardRef.current;
    
    // Save original styles
    const prevShadow = element.style.boxShadow;
    const prevRadius = element.style.borderRadius;
    const prevTransform = element.style.transform;

    // Temporarily strip card shadow & outer rounded corners for a clean edge-to-edge receipt capture
    element.style.boxShadow = 'none';
    element.style.borderRadius = '0px';
    element.style.transform = 'none';

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvasPro(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
    } finally {
      // Restore UI display styles
      element.style.boxShadow = prevShadow;
      element.style.borderRadius = prevRadius;
      element.style.transform = prevTransform;
    }

    const imgData = canvas.toDataURL('image/png');
    
    // Dynamically calculate PDF dimensions matching exact receipt aspect ratio (100mm width)
    const pdfWidthMm = 100;
    const pdfHeightMm = Math.round((canvas.height * pdfWidthMm) / canvas.width);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
    return pdf;
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      const doc = await generateReceiptPDF();
      if (!doc) return;
      await exportPdf(doc, receiptFileName);
    } catch (err) {
      console.error('Download receipt PDF failed:', err);
      alert('Could not generate receipt PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = () => {
    setIsMenuOpen(false);
    setShowShareModal(true);
  };

  const handlePrint = () => {
    setIsMenuOpen(false);
    window.print();
  };

  const handleCopyReceiptText = async () => {
    setIsMenuOpen(false);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(receiptTextSummary);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = receiptTextSummary;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedNotification('Receipt text copied to clipboard!');
      setTimeout(() => setCopiedNotification(null), 3000);
    } catch (err) {
      console.error('Failed to copy receipt:', err);
    }
  };

  const handleEmailReceipt = () => {
    setIsMenuOpen(false);
    const subject = encodeURIComponent(`Payment Receipt #${receiptNo} - ${profile.companyName || 'FastInvo'}`);
    const body = encodeURIComponent(receiptTextSummary);
    const emailTo = draft.customer.email || '';
    window.location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;
  };

  const handleWhatsAppReceipt = () => {
    setIsMenuOpen(false);
    const text = encodeURIComponent(receiptTextSummary);
    const cleanPhone = (draft.customer.phone || '').replace(/[^0-9+]/g, '');
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] dark:bg-slate-950 pb-24 font-sans space-y-6 max-w-xl mx-auto">
      
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Top Bar: Back arrow left, "Receipt" title centered, "..." menu icon right */}
      <div className="no-print bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
        <button
          onClick={onBack}
          id="receipt-back-btn"
          className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>

        <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
          Receipt
        </h2>

        {/* Options Dropdown Menu */}
        <div className="relative" ref={menuDropdownRef}>
          <button
            type="button"
            id="receipt-options-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${
              isMenuOpen
                ? 'bg-[#0F3D2E] text-white shadow-md shadow-[#0F3D2E]/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            aria-label="Options"
            aria-expanded={isMenuOpen}
          >
            <MoreHorizontal className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Dropdown Menu Popup */}
          {isMenuOpen && (
            <div 
              id="receipt-options-dropdown"
              className="absolute right-0 top-11 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-50 animate-fadeIn space-y-0.5"
            >
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Receipt Actions
                </span>
              </div>

              {/* Action 1: Share Modal */}
              <button
                type="button"
                onClick={handleShare}
                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Share Receipt...</span>
              </button>

              {/* Action 2: Download PDF */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleDownloadPDF();
                }}
                disabled={isGenerating}
                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{isGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>

              {/* Action 3: Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Print Receipt</span>
              </button>

              {/* Action 4: Copy Plain Text */}
              <button
                type="button"
                onClick={handleCopyReceiptText}
                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Copy Summary Text</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1">
                {/* Action 5: Send via WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsAppReceipt}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Send via WhatsApp</span>
                </button>

                {/* Action 6: Email Receipt */}
                <button
                  type="button"
                  onClick={handleEmailReceipt}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>Email Receipt</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable Paper Receipt Card Container */}
      <div className="px-4">
        <div
          ref={receiptCardRef}
          id="printable-receipt-card"
          className="bg-white text-slate-900 p-6 sm:p-8 rounded-[24px] shadow-xl border border-slate-200/60 space-y-5 relative overflow-hidden max-w-md mx-auto font-mono text-xs"
        >
          {/* Top Serrated Edge Decoration */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-slate-100 border-b border-dashed border-slate-300" />

          {/* Business Header & Logo */}
          <div className="text-center space-y-1.5 pt-2">
            {profile.logo ? (
              <img
                src={profile.logo}
                alt={profile.companyName}
                className="w-12 h-12 object-cover rounded-xl mx-auto mb-2 border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#0F3D2E] text-white flex items-center justify-center mx-auto mb-2 font-extrabold text-lg">
                <ReceiptIcon className="w-5 h-5 text-emerald-400" />
              </div>
            )}
            <h1 className="text-base font-black uppercase tracking-wider text-slate-900 font-sans">
              {profile.companyName || 'Business Name'}
            </h1>
            <p className="text-[11px] text-slate-500 leading-tight">
              {profile.address || 'Business Address'}
            </p>
            {profile.phone && <p className="text-[11px] text-slate-500">Tel: {profile.phone}</p>}
          </div>

          {/* Dashed Divider */}
          <div className="border-t border-dashed border-slate-300" />

          {/* Receipt Info */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between font-bold">
              <span>OFFICIAL RECEIPT:</span>
              <span className="text-[#0F3D2E]">#{draft.metadata.invoiceNumber || 'REC-001'}</span>
            </div>
            <div className="flex justify-between">
              <span>DATE:</span>
              <span>{paymentDate}</span>
            </div>
            <div className="flex justify-between">
              <span>CUSTOMER:</span>
              <span className="font-bold">{draft.customer.name || 'Valued Customer'}</span>
            </div>
            {draft.customer.email && (
              <div className="flex justify-between text-slate-500">
                <span>EMAIL:</span>
                <span>{draft.customer.email}</span>
              </div>
            )}
          </div>

          {/* Dashed Divider */}
          <div className="border-t border-dashed border-slate-300" />

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 border-b border-slate-200 pb-1">
              <span>Item / Qty</span>
              <span>Amount</span>
            </div>

            {validItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <div className="min-w-0 pr-2">
                  <span className="font-bold block truncate">{item.description || 'Service/Product'}</span>
                  <span className="text-[10px] text-slate-500">
                    {item.quantity} x {formatMoney(item.unitPrice, profile.currency.symbol)}
                  </span>
                </div>
                <span className="font-bold shrink-0">
                  {formatMoney(item.quantity * item.unitPrice, profile.currency.symbol)}
                </span>
              </div>
            ))}
          </div>

          {/* Dashed Divider */}
          <div className="border-t border-dashed border-slate-300" />

          {/* Totals Breakdown */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatMoney(subtotal, profile.currency.symbol)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span>-{formatMoney(discount, profile.currency.symbol)}</span>
              </div>
            )}

            {tax.taxEnabled && taxAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>{tax.taxName || 'Tax'} ({tax.taxRate}%):</span>
                <span>{formatMoney(taxAmount, profile.currency.symbol)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200 text-slate-900 font-sans">
              <span>TOTAL PAID:</span>
              <span className="text-[#0F3D2E]">
                {formatMoney(draft.paidAmount || grandTotal, profile.currency.symbol)}
              </span>
            </div>
          </div>

          {/* Dashed Divider */}
          <div className="border-t border-dashed border-slate-300" />

          {/* Payment Method Details */}
          <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-[10px] text-slate-600">
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="font-bold text-slate-800">{paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>Transaction Ref:</span>
              <span className="font-mono font-bold text-slate-800">{transactionId}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Status:</span>
              <span>PAID & CONFIRMED</span>
            </div>
          </div>

          {/* Thank you note */}
          <div className="text-center pt-2">
            <p className="text-[11px] font-bold text-slate-700 font-sans">
              {profile.thankYouMessage || 'Thank you for your prompt payment!'}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 font-medium">FastInvo E-Receipt System</p>
            <p className="text-[8.5px] text-slate-400/90 font-medium mt-0.5">Developed by Ashraful Islam</p>
          </div>

          {/* Bottom Serrated Edge Decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-100 border-t border-dashed border-slate-300" />
        </div>
      </div>

      {/* Action Bar Below: Three Equal-Width Buttons */}
      <div className="no-print px-4 max-w-md mx-auto">
        <div className="grid grid-cols-3 gap-2">
          {/* 1. Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="py-3 px-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-[#0F3D2E] dark:text-emerald-400 stroke-[2]" />
            <span>Download PDF</span>
          </button>

          {/* 2. Share */}
          <button
            type="button"
            onClick={handleShare}
            disabled={isGenerating}
            className="py-3 px-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4 text-[#0F3D2E] dark:text-emerald-400 stroke-[2]" />
            <span>Share</span>
          </button>

          {/* 3. Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="py-3 px-2 rounded-2xl bg-[#0F3D2E] text-white text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-md shadow-[#0F3D2E]/20 hover:bg-[#164E3B] transition-colors cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-emerald-300 stroke-[2]" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Payment Receipt #${receiptNo}`}
        subtitle={`${draft.customer.name || 'Valued Customer'} • ${formatMoney(draft.paidAmount || grandTotal, profile.currency.symbol)}`}
        textSummary={receiptTextSummary}
        fileName={receiptFileName}
        generatePdfDoc={generateReceiptPDF}
        recipientEmail={draft.customer.email || ''}
        recipientPhone={draft.customer.phone || ''}
      />

    </div>
  );
}

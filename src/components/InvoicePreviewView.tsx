/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Printer, Download, Eye, AlertCircle, ArrowLeft, CreditCard, ExternalLink, Smartphone, Wallet, Building2, CheckCircle, Check, X, Mail } from 'lucide-react';
import { InvoiceDraft, BusinessProfile, TaxConfig } from '../types';
import { formatMoney } from '../constants';
import { calculateInvoiceTotals, lineTotal } from '../utils/calculations';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoicePreviewViewProps {
  draft: InvoiceDraft;
  profile: BusinessProfile;
  tax: TaxConfig;
  onEdit: () => void;
}

export default function InvoicePreviewView({ draft, profile, tax, onEdit }: InvoicePreviewViewProps) {
  const validItems = draft.items.filter(item => item.description.trim() !== '' || item.unitPrice > 0);
  const grossSubtotal = Math.round((validItems.reduce((sum, i) => sum + lineTotal(i), 0) + Number.EPSILON) * 100) / 100;

  const { subtotal: netSubtotal, discount: netDiscount, taxAmount, grandTotal } =
    calculateInvoiceTotals(draft.items, draft.discountType, draft.discountValue, tax);

  const taxRateName = tax.taxName || 'Tax';

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState(draft.customer.email || '');

  useEffect(() => {
    if (draft.customer.email) {
      setEmailAddress(draft.customer.email);
    }
  }, [draft.customer.email]);

  const generatePDFBlob = async (): Promise<Blob | null> => {
    const element = document.getElementById('printable-invoice-canvas');
    if (!element) return null;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const computedHeight = pdfWidth / ratio;

    let heightLeft = computedHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, computedHeight, '', 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - computedHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, computedHeight, '', 'FAST');
      heightLeft -= pdfHeight;
    }

    return pdf.output('blob');
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const blob = await generatePDFBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const invoiceNo = draft.metadata.invoiceNumber || 'draft';
      a.download = `invoice-${invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Could not download PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSharePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const blob = await generatePDFBlob();
      if (!blob) return;
      const invoiceNo = draft.metadata.invoiceNumber || 'draft';
      const file = new File([blob], `invoice-${invoiceNo}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${invoiceNo}`,
          text: `Please find attached Invoice #${invoiceNo}.`,
        });
      } else {
        // Fallback to downloading
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceNo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Web Share API with file attachments is not supported on this browser. The PDF has been downloaded to your device instead.');
      }
    } catch (err) {
      console.error('Error sharing PDF:', err);
      handleDownloadPDF();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleEmailMailto = () => {
    const to = emailAddress.trim();
    const invoiceNo = draft.metadata.invoiceNumber || 'draft';
    const subject = encodeURIComponent(`Invoice #${invoiceNo} from ${profile.companyName || 'Us'}`);
    const body = encodeURIComponent(
      `Hello ${draft.customer.name || 'Customer'},\n\nPlease find attached our Invoice #${invoiceNo}.\n\nThank you for your business!\n\nBest regards,\n${profile.companyName || 'Us'}`
    );
    
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setShowEmailModal(false);
    
    // Trigger download automatically so they have the file ready to attach
    handleDownloadPDF();
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedTemplate = profile.template || 'minimalist';

  // HELPER component to render line items list based on template styling
  const renderItemsTable = (isSerif: boolean, alternateRows: boolean, accentHeaderClass: string = '') => (
    <table className="w-full text-left border-collapse" id="preview-invoice-table">
      <thead>
        <tr className={`border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${accentHeaderClass}`}>
          <th className={`py-2.5 w-1/2 font-semibold ${isSerif ? 'font-serif' : ''}`}>Description</th>
          <th className={`py-2.5 px-3 text-right w-20 font-semibold ${isSerif ? 'font-serif' : ''}`}>Qty</th>
          <th className={`py-2.5 px-3 text-right w-28 font-semibold ${isSerif ? 'font-serif' : ''}`}>Unit Price</th>
          <th className={`py-2.5 pl-3 text-right w-28 font-semibold ${isSerif ? 'font-serif' : ''}`}>Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {validItems.length > 0 ? (
          validItems.map((item, idx) => (
            <tr key={item.id} className={`text-xs text-slate-700 ${alternateRows && idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
              <td className="py-2.5 font-normal text-slate-800 pr-3">{item.description}</td>
              <td className="py-2.5 px-3 text-right font-mono">{item.quantity}</td>
              <td className="py-2.5 px-3 text-right font-mono">{formatMoney(item.unitPrice, profile.currency.symbol)}</td>
              <td className="py-2.5 pl-3 text-right font-mono font-bold text-slate-900">
                {formatMoney(lineTotal(item), profile.currency.symbol)}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="py-6 text-center text-xs text-slate-400 italic">
              No line items configured. Please add details in the Editor.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  // HELPER component to render invoice totals breakdown
  const renderTotalsSummary = (isSerif: boolean, doubleBorderTotal: boolean, primaryTextClass: string = 'text-slate-900') => (
    <div className="space-y-2 text-xs text-slate-600">
      {/* Gross Subtotal or Net Subtotal depending on tax mode */}
      <div className="flex justify-between">
        <span className="text-slate-400 font-semibold">
          {tax.taxEnabled && tax.taxInclusive && tax.taxRate > 0 ? 'Subtotal (Gross)' : 'Subtotal'}
        </span>
        <span className="font-mono text-slate-900 font-bold">{formatMoney(grossSubtotal, profile.currency.symbol)}</span>
      </div>

      {/* Discount line */}
      {draft.discountValue > 0 && (
        <div className="flex justify-between text-red-600 font-bold">
          <span>
            Discount {draft.discountType === 'percentage' ? `(${draft.discountValue}%)` : ''}
          </span>
          <span className="font-mono">-{formatMoney(netDiscount, profile.currency.symbol)}</span>
        </div>
      )}

      {/* Inclusive Net Subtotal section for clarity */}
      {tax.taxEnabled && tax.taxInclusive && tax.taxRate > 0 && (
        <div className="flex justify-between text-[11px] text-slate-400 border-t border-dashed border-slate-100 pt-1">
          <span>Net Subtotal (Excl. Tax)</span>
          <span className="font-mono">{formatMoney(netSubtotal, profile.currency.symbol)}</span>
        </div>
      )}

      {/* Tax line */}
      {tax.taxEnabled && tax.taxRate > 0 && (
        <div className="flex justify-between pb-1">
          <span className="text-slate-400 font-semibold">
            {taxRateName} {tax.taxRate}%
            <span className="text-[9px] font-normal text-slate-400 lowercase ml-1">
              ({tax.taxInclusive ? 'included' : 'excluded'})
            </span>
          </span>
          <span className="font-mono text-slate-900 font-bold">{formatMoney(taxAmount, profile.currency.symbol)}</span>
        </div>
      )}

      {/* Total Due with customizable accent design */}
      <div className={`border-t border-slate-200 pt-2 flex justify-between items-center ${doubleBorderTotal ? 'border-b-4 border-double border-slate-900 pb-1.5' : ''}`}>
        <span className={`text-xs font-bold ${isSerif ? 'font-serif' : 'font-sans'} text-slate-800`}>Total Due ({profile.currency.code})</span>
        <span className={`text-base font-extrabold font-mono ${primaryTextClass}`}>
          {formatMoney(grandTotal, profile.currency.symbol)}
        </span>
      </div>
    </div>
  );

  // HELPER component to render payment details/procedures cleanly
  const renderPaymentDetails = (titleColorClass: string = 'text-slate-400', isSerif: boolean = false) => {
    const methods = profile.paymentMethods || [];
    const procedure = profile.paymentProcedure;
    const gateway = profile.paymentGatewayInfo;
    const mfsProvider = profile.mfsProvider;
    const mfsAccountNo = profile.mfsAccountNo;
    const mfsAccountType = profile.mfsAccountType;
    
    // Check if any invoice-specific proofs exist
    const hasMfsProof = !!(draft.mfsTrxId || draft.mfsProvider);
    const hasBankProof = !!(draft.bankName || draft.bankBranch || draft.bankRoutingNo || draft.bankTransactionId);

    if (methods.length === 0 && !procedure && !gateway && !mfsProvider && !hasMfsProof && !hasBankProof) return null;

    return (
      <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 page-break-inside-avoid" id="preview-payment-details-block">
        <h4 className={`text-[10px] font-bold uppercase tracking-wider ${titleColorClass} ${isSerif ? 'font-serif' : 'font-sans'}`}>
          Payment Details & Confirmation
        </h4>
        <div className="space-y-2.5 text-xs">
          {/* Status Badge inside the Payment Block */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[11px]">Invoice Status:</span>
            {draft.status === 'Paid' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-250 uppercase tracking-wider font-sans">
                <Check className="w-3 h-3 text-emerald-600" />
                PAID
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-250 uppercase tracking-wider font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                DUE / UNPAID
              </span>
            )}
          </div>

          {methods.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-slate-500 font-medium mr-1 text-[11px]">Accepted Methods:</span>
              {methods.map((method) => (
                <span 
                  key={method} 
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider font-mono"
                >
                  {method}
                </span>
              ))}
            </div>
          )}

          {/* MFS Payment Proof details entered during invoice creation */}
          {hasMfsProof && (
            <div className="bg-purple-50/70 p-2.5 rounded border border-purple-200 text-purple-950 font-sans text-[11px] text-left flex items-center justify-between gap-2 shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>
                  {draft.mfsProvider ? `${draft.mfsProvider} Payment Proof` : 'MFS Transaction Proof'}:{' '}
                  {draft.mfsTrxId ? (
                    <>Trx ID: <strong className="font-mono bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-200 uppercase font-bold text-xs">{draft.mfsTrxId}</strong></>
                  ) : (
                    <span className="text-purple-400 italic">No Trx ID entered</span>
                  )}
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">Confirmed</span>
            </div>
          )}

          {/* Bank Payment Proof details entered during invoice creation */}
          {hasBankProof && (
            <div className="bg-blue-50/50 p-3 rounded border border-blue-200 text-blue-950 font-sans text-[11px] text-left space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] text-blue-700 border-b border-blue-100 pb-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Bank Transfer Confirmation Proof</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5 text-[11px]">
                {draft.bankName && (
                  <div>
                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wide">Bank Name</span>
                    <strong className="text-slate-800 font-bold">{draft.bankName}</strong>
                  </div>
                )}
                {draft.bankBranch && (
                  <div>
                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wide">Branch Name</span>
                    <strong className="text-slate-800">{draft.bankBranch}</strong>
                  </div>
                )}
                {draft.bankRoutingNo && (
                  <div>
                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wide">Routing Code</span>
                    <strong className="text-slate-800 font-mono font-bold">{draft.bankRoutingNo}</strong>
                  </div>
                )}
                {draft.bankTransactionId && (
                  <div>
                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wide">Tx ID / Receipt No</span>
                    <strong className="text-slate-800 font-mono font-bold bg-blue-100/60 px-1 py-0.2 rounded border border-blue-200">{draft.bankTransactionId}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {gateway && (
            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 text-blue-950 font-sans text-[11px] text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[9px] text-blue-700 block">Online Payment Gateway Info</span>
                  <span className="text-slate-700 font-medium break-all">{gateway}</span>
                </div>
              </div>
              {gateway.toLowerCase().startsWith('http') && (
                <a 
                  href={gateway} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="no-print inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3 py-1.5 rounded shadow-sm uppercase tracking-wider transition-all shrink-0 cursor-pointer"
                >
                  <span>Pay Online</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {mfsProvider && mfsAccountNo && (
            <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-200 text-purple-950 font-sans text-[11px] text-left flex items-start gap-2.5 shadow-2xs">
              <Smartphone className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <span className="font-bold uppercase tracking-wider text-[9px] text-purple-700 block">Mobile Financial Service (MFS) Details</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700">
                  <div>
                    <span className="text-slate-400 font-medium">Provider:</span> <strong className="text-slate-900 font-semibold">{mfsProvider}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Account No:</span> <strong className="text-slate-900 font-mono font-semibold">{mfsAccountNo}</strong>
                  </div>
                  {mfsAccountType && (
                    <div>
                      <span className="text-slate-400 font-medium">Type:</span> <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider font-mono">{mfsAccountType}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {procedure && (
            <div className="bg-slate-50/50 p-3 rounded border border-slate-150 text-slate-650 whitespace-pre-line leading-relaxed font-sans text-[11px] text-left">
              {procedure}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="invoice-preview-view">
      
      {/* Visual notification toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 shadow-sm p-4 rounded gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-500 rounded">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Document Live Preview</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Template: <strong className="capitalize text-blue-600">{selectedTemplate.replace('-', ' ')}</strong>. Prints exactly as rendered with zero app chrome.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            id="preview-btn-back-edit"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Editor
          </button>

          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            id="preview-btn-print-preview"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer min-h-[36px]"
          >
            <Eye className="w-3.5 h-3.5" />
            Print Preview (A4)
          </button>

          <button
            type="button"
            onClick={handleSharePDF}
            disabled={isGeneratingPDF}
            id="preview-btn-share-pdf"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400 transition-colors shadow-xs cursor-pointer min-h-[36px]"
          >
            {isGeneratingPDF ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                Share PDF
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            id="preview-btn-download-pdf"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-400 transition-colors shadow-xs cursor-pointer min-h-[36px]"
          >
            {isGeneratingPDF ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Paid Invoice Actions Banner */}
      {draft.status === 'Paid' && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print animate-fadeIn" id="paid-actions-banner">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-full shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">Payment Received & Confirmed</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                This invoice has been marked as fully <strong className="uppercase font-bold text-emerald-800">Paid</strong>. Proceed to print or send an e-invoice PDF to your customer.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPrintPreview(true)}
              id="paid-btn-proceed-print"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px]"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              Proceed to Print
            </button>

            <button
              type="button"
              onClick={handleSharePDF}
              disabled={isGeneratingPDF}
              id="paid-btn-share-pdf"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-400 transition-colors cursor-pointer min-h-[36px]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Share PDF
            </button>
            
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              id="paid-btn-send-email"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer min-h-[36px]"
            >
              <Mail className="w-3.5 h-3.5" />
              Email Invoice
            </button>
          </div>
        </div>
      )}

      {/* Warning if fields are blank */}
      {!draft.customer.name && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded flex items-start gap-2.5 no-print">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Missing Customer Information:</span> Please navigate back to the **Invoice Editor** and add a Customer Name so the invoice block looks complete.
          </div>
        </div>
      )}

      {/* Main printed sheet: A4 styled wrapper */}
      <div className="bg-white border border-slate-200 sm:shadow-md rounded overflow-hidden print-container" id="printable-invoice-canvas">
        
        {/* ==================== 1. MINIMALIST TEMPLATE ==================== */}
        {selectedTemplate === 'minimalist' && (
          <div className="p-6 sm:p-10 md:p-12 space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 border-b border-slate-100 pb-6">
              <div className="space-y-3">
                {profile.logo ? (
                  <div className="h-14 max-w-[180px] flex items-center">
                    <img src={profile.logo} alt={profile.companyName} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">{profile.companyName || 'YOUR BUSINESS'}</h1>
                )}
                {profile.companyName && profile.logo && <p className="text-xs font-bold text-slate-850">{profile.companyName}</p>}
              </div>

              <div className="text-left md:text-right space-y-1">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sender</h2>
                <div className="text-xs text-slate-600 whitespace-pre-line leading-normal">{profile.address || 'Address Not Configured'}</div>
                <div className="pt-1 text-[11px] text-slate-400 space-y-0.5">
                  {profile.phone && <p>Phone: {profile.phone}</p>}
                  {profile.email && <p>Email: {profile.email}</p>}
                  {profile.website && <p>Website: {profile.website}</p>}
                  {profile.taxRegNumber && <p className="font-mono text-slate-600 font-bold text-[11px] mt-1 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-150">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bill To</h3>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">{draft.customer.name || 'Recipient Name'}</p>
                  {draft.customer.address && <p className="text-xs text-slate-600 whitespace-pre-line leading-normal">{draft.customer.address}</p>}
                  <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                    {draft.customer.phone && <p>Phone: {draft.customer.phone}</p>}
                    {draft.customer.email && <p>Email: {draft.customer.email}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end justify-between text-left md:text-right space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Type</span>
                  <div className="flex items-center md:justify-end gap-2 mt-0.5">
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">INVOICE</h1>
                    {draft.status === 'Paid' ? (
                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">PAID</span>
                    ) : (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">DUE</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-left justify-end">
                  <span className="text-slate-400 font-semibold">Invoice Number:</span>
                  <span className="text-slate-800 font-mono font-bold text-right">{draft.metadata.invoiceNumber}</span>
                  <span className="text-slate-400 font-semibold">Issue Date:</span>
                  <span className="text-slate-800 text-right">{draft.metadata.issueDate}</span>
                  {draft.metadata.dueDate && (
                    <>
                      <span className="text-slate-400 font-semibold">Due Date:</span>
                      <span className="text-red-600 font-semibold text-right">{draft.metadata.dueDate}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">{renderItemsTable(false, false)}</div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 page-break-inside-avoid">
              <div className="md:col-span-7 space-y-4">
                {draft.metadata.notes && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes & Special Instructions</h4>
                    <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/50 p-3 rounded border border-slate-150">{draft.metadata.notes}</p>
                  </div>
                )}
                {renderPaymentDetails('text-slate-400', false)}
              </div>
              <div className="md:col-span-5 space-y-2 md:col-start-8">{renderTotalsSummary(false, false)}</div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-100 text-center invoice-footer">
              <p className="text-xs text-slate-400 tracking-wide font-semibold">Thank you for your business.</p>
            </div>
          </div>
        )}

        {/* ==================== 2. MODERN BLUE TEMPLATE ==================== */}
        {selectedTemplate === 'modern-blue' && (
          <div className="p-6 sm:p-10 md:p-12 space-y-8 bg-white">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 border-b-2 border-blue-100 pb-6">
              <div className="space-y-3">
                {profile.logo ? (
                  <div className="h-14 max-w-[180px] flex items-center">
                    <img src={profile.logo} alt={profile.companyName} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <h1 className="text-2xl font-black text-blue-900 tracking-tight">{profile.companyName || 'YOUR BUSINESS'}</h1>
                )}
                {profile.companyName && profile.logo && <p className="text-sm font-bold text-blue-900">{profile.companyName}</p>}
              </div>

              <div className="text-left md:text-right space-y-1">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Sender Profile</span>
                <div className="text-xs text-slate-600 whitespace-pre-line leading-normal mt-1">{profile.address || 'Address Not Configured'}</div>
                <div className="pt-1 text-[11px] text-slate-450 space-y-0.5">
                  {profile.phone && <p>Ph: {profile.phone}</p>}
                  {profile.email && <p>Email: {profile.email}</p>}
                  {profile.taxRegNumber && <p className="font-mono text-blue-700 font-bold text-[11px] mt-1 bg-blue-50/50 inline-block px-1.5 py-0.5 rounded border border-blue-100">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-4 sm:p-6 rounded-lg border border-slate-100">
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Billed To</h3>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">{draft.customer.name || 'Recipient Name'}</p>
                  {draft.customer.address && <p className="text-xs text-slate-600 whitespace-pre-line leading-normal">{draft.customer.address}</p>}
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1.5">
                    {draft.customer.phone && <p>Phone: {draft.customer.phone}</p>}
                    {draft.customer.email && <p>Email: {draft.customer.email}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end justify-between text-left md:text-right space-y-3">
                <div>
                  <div className="flex items-center md:justify-end gap-2">
                    <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight leading-none">INVOICE</h1>
                    {draft.status === 'Paid' ? (
                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">PAID</span>
                    ) : (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">DUE</span>
                    )}
                  </div>
                  <span className="text-[11px] text-blue-600 font-mono font-bold block mt-1">#{draft.metadata.invoiceNumber}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-left justify-end border-t border-slate-200/60 pt-2 w-full md:w-auto">
                  <span className="text-slate-400 font-medium">Issue Date:</span>
                  <span className="text-slate-800 text-right">{draft.metadata.issueDate}</span>
                  {draft.metadata.dueDate && (
                    <>
                      <span className="text-slate-400 font-medium">Due Date:</span>
                      <span className="text-blue-600 font-bold text-right">{draft.metadata.dueDate}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">{renderItemsTable(false, true, 'bg-blue-50/40 text-blue-900')}</div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 page-break-inside-avoid">
              <div className="md:col-span-7 space-y-4">
                {draft.metadata.notes && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Notes & Special Instructions</h4>
                    <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-blue-50/20 p-3.5 rounded border border-blue-50 font-sans">{draft.metadata.notes}</p>
                  </div>
                )}
                {renderPaymentDetails('text-blue-700', false)}
              </div>
              <div className="md:col-span-5 bg-blue-50/30 p-4 rounded-lg border border-blue-50/50 space-y-2 md:col-start-8">
                {renderTotalsSummary(false, false, 'text-blue-600')}
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-100 text-center invoice-footer">
              <p className="text-xs text-slate-400 tracking-wide font-semibold">Thank you for your business.</p>
            </div>
          </div>
        )}

        {/* ==================== 3. EDITORIAL SERIF TEMPLATE ==================== */}
        {selectedTemplate === 'editorial-serif' && (
          <div className="p-6 sm:p-10 md:p-12 space-y-8 bg-white font-serif">
            <div className="text-center border-b-2 border-slate-900 pb-6 space-y-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-normal text-slate-950 tracking-tight">{profile.companyName || 'YOUR BUSINESS'}</h1>
                <p className="text-xs text-slate-500 italic tracking-widest uppercase">Est. Business Profile</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 text-xs text-slate-600 pt-2 gap-2 leading-relaxed">
                <div className="text-left md:text-left">
                  <p className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-wider">Company Details</p>
                  {profile.phone && <p className="font-sans">Ph: {profile.phone}</p>}
                  {profile.email && <p className="font-sans">Em: {profile.email}</p>}
                  {profile.website && <p className="font-sans">{profile.website}</p>}
                </div>
                <div className="text-center">
                  <p className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="whitespace-pre-line font-serif leading-tight">{profile.address || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-wider">Tax Registration</p>
                  {profile.taxRegNumber ? (
                    <p className="font-sans">{profile.taxRegLabel}: <strong className="font-mono">{profile.taxRegNumber}</strong></p>
                  ) : <p className="italic font-serif text-slate-400">Not configured</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
              <div className="space-y-1.5">
                <h3 className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Prepared For</h3>
                <div className="space-y-1 leading-relaxed">
                  <p className="text-sm font-bold text-slate-900">{draft.customer.name || 'Recipient Name'}</p>
                  {draft.customer.address && <p className="text-xs text-slate-650 whitespace-pre-line leading-normal">{draft.customer.address}</p>}
                  <div className="text-[11px] text-slate-400 pt-1 font-sans">
                    {draft.customer.phone && <span>Phone: {draft.customer.phone}</span>}
                    {draft.customer.email && <span className="ml-3">Email: {draft.customer.email}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end justify-between text-left md:text-right space-y-2">
                <div>
                  <div className="flex items-center md:justify-end gap-2">
                    <h1 className="text-3xl font-light tracking-widest text-slate-950 uppercase leading-none">INVOICE</h1>
                    {draft.status === 'Paid' ? (
                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">PAID</span>
                    ) : (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">DUE</span>
                    )}
                  </div>
                  <p className="font-sans text-xs font-bold text-slate-500 tracking-wider mt-1.5">No. {draft.metadata.invoiceNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-left justify-end font-sans">
                  <span className="text-slate-400 font-medium">Issue Date:</span>
                  <span className="text-slate-800 text-right">{draft.metadata.issueDate}</span>
                  {draft.metadata.dueDate && (
                    <>
                      <span className="text-slate-400 font-medium">Due Date:</span>
                      <span className="text-slate-950 font-bold text-right">{draft.metadata.dueDate}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">{renderItemsTable(true, false)}</div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 page-break-inside-avoid">
              <div className="md:col-span-7 space-y-4">
                {draft.metadata.notes && (
                  <div className="space-y-1 bg-slate-50/30 p-4 border border-slate-150 rounded">
                    <h4 className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terms & Historical Notes</h4>
                    <p className="text-xs text-slate-750 whitespace-pre-line leading-relaxed font-serif">{draft.metadata.notes}</p>
                  </div>
                )}
                {renderPaymentDetails('text-slate-400', true)}
              </div>
              <div className="md:col-span-5 space-y-2 md:col-start-8">{renderTotalsSummary(true, true, 'text-slate-950')}</div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-200 text-center invoice-footer">
              <p className="text-xs text-slate-400 tracking-widest uppercase italic font-serif">Thank you for your business</p>
            </div>
          </div>
        )}

        {/* ==================== 4. COMPACT SLATE TEMPLATE ==================== */}
        {selectedTemplate === 'compact-slate' && (
          <div className="p-5 sm:p-8 md:p-10 space-y-6 bg-white font-sans text-xs">
            <div className="flex flex-col md:flex-row md:justify-between md:items-stretch gap-4 border-b border-slate-200 pb-5">
              <div className="flex flex-col justify-between">
                <div>
                  <h1 className="text-lg font-bold text-slate-850 tracking-tight">{profile.companyName || 'YOUR BUSINESS'}</h1>
                  <p className="text-[10px] text-slate-400 mt-0.5">Commercial Invoice</p>
                </div>
                <div className="mt-4 border-l-2 border-slate-400 pl-3 py-1 space-y-0.5 text-slate-500 text-[11px]">
                  {profile.phone && <p>Ph: {profile.phone}</p>}
                  {profile.email && <p>Em: {profile.email}</p>}
                  {profile.website && <p>{profile.website}</p>}
                </div>
              </div>

              <div className="text-left md:text-right flex flex-col justify-between items-start md:items-end">
                <div className="bg-slate-100 border border-slate-200 rounded p-2 text-slate-700 w-full md:w-64">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Document Identifier</span>
                  <div className="flex justify-between items-center mt-1 font-mono">
                    <span className="font-bold text-slate-900">#{draft.metadata.invoiceNumber}</span>
                    <div className="flex items-center gap-1.5">
                      {draft.status === 'Paid' ? (
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-250 px-1.5 py-0.5 rounded uppercase font-sans">PAID</span>
                      ) : (
                        <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-250 px-1.5 py-0.5 rounded uppercase font-sans">DUE</span>
                      )}
                      <span className="text-[10px] bg-slate-950 text-white font-sans font-bold px-1.5 py-0.5 rounded uppercase font-sans">Invoice</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 w-full md:w-auto grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <span>Issue Date:</span>
                  <strong className="text-slate-700 text-right">{draft.metadata.issueDate}</strong>
                  {draft.metadata.dueDate && (
                    <>
                      <span>Due Date:</span>
                      <strong className="text-red-600 text-right">{draft.metadata.dueDate}</strong>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50/70 border border-slate-200 rounded p-3 space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Billing Sender</span>
                <p className="font-semibold text-slate-850">{profile.companyName}</p>
                <p className="text-[11px] text-slate-500 whitespace-pre-line leading-snug">{profile.address}</p>
                {profile.taxRegNumber && <p className="text-[10px] text-slate-500 font-semibold pt-1">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded p-3 space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Billing Recipient</span>
                <p className="font-semibold text-slate-850">{draft.customer.name || 'Recipient'}</p>
                <p className="text-[11px] text-slate-500 whitespace-pre-line leading-snug">{draft.customer.address}</p>
                <div className="text-[10px] text-slate-400 pt-1 space-y-0.5">
                  {draft.customer.phone && <p>Ph: {draft.customer.phone}</p>}
                  {draft.customer.email && <p>Em: {draft.customer.email}</p>}
                </div>
              </div>
            </div>

            <div className="pt-1">{renderItemsTable(false, true, 'bg-slate-100 text-slate-800')}</div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 page-break-inside-avoid">
              <div className="md:col-span-7 space-y-3">
                {draft.metadata.notes && (
                  <div className="bg-slate-50/40 p-3 rounded border border-slate-150 space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Important Disclosures</span>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">{draft.metadata.notes}</p>
                  </div>
                )}
                {renderPaymentDetails('text-slate-400', false)}
              </div>
              <div className="md:col-span-5 bg-slate-50/60 p-3 rounded border border-slate-150 space-y-2 md:col-start-8">
                {renderTotalsSummary(false, false, 'text-slate-850')}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
              <p>System Generated Document. Thank you for your business.</p>
            </div>
          </div>
        )}

        {/* ==================== 5. BOLD ACCENT TEMPLATE ==================== */}
        {selectedTemplate === 'bold-accent' && (
          <div className="space-y-8 bg-white">
            {/* Top high impact banner */}
            <div className="bg-slate-900 text-white p-6 sm:p-10 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-black tracking-tight uppercase">{profile.companyName || 'YOUR BUSINESS'}</h1>
                <div className="text-xs text-slate-300 whitespace-pre-line leading-snug max-w-md">{profile.address}</div>
                {profile.taxRegNumber && <p className="text-[10px] text-slate-400 font-mono font-bold bg-slate-800 inline-block px-1.5 py-0.5 rounded">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
              </div>

              <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6 space-y-2">
                <div className="flex items-center md:justify-end gap-2">
                  <span className="text-2xl font-black tracking-widest block text-blue-400">INVOICE</span>
                  {draft.status === 'Paid' ? (
                    <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded tracking-wider uppercase font-sans">PAID</span>
                  ) : (
                    <span className="text-[9px] font-black bg-amber-500 text-slate-900 px-2 py-0.5 rounded tracking-wider uppercase font-sans">DUE</span>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-350 space-y-0.5 font-mono">
                  <p>Number: <strong className="text-white">#{draft.metadata.invoiceNumber}</strong></p>
                  <p>Issued: {draft.metadata.issueDate}</p>
                  {draft.metadata.dueDate && <p className="text-red-400 font-bold">Due Date: {draft.metadata.dueDate}</p>}
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-10 pb-12 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 pb-6 border-b border-slate-100">
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billed To</h3>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">{draft.customer.name || 'Recipient Name'}</p>
                    {draft.customer.address && <p className="text-xs text-slate-650 whitespace-pre-line leading-normal">{draft.customer.address}</p>}
                    <div className="text-[11px] text-slate-400 space-y-0.5 pt-1.5">
                      {draft.customer.phone && <p>Ph: {draft.customer.phone}</p>}
                      {draft.customer.email && <p>Email: {draft.customer.email}</p>}
                    </div>
                  </div>
                </div>

                <div className="text-left md:text-right space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Sender</h3>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    {profile.phone && <p>Phone: {profile.phone}</p>}
                    {profile.email && <p>Email: {profile.email}</p>}
                    {profile.website && <p>Web: {profile.website}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-2">{renderItemsTable(false, false, 'bg-slate-900 text-white')}</div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 page-break-inside-avoid">
                <div className="md:col-span-7 space-y-4">
                  {draft.metadata.notes && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes & Special Requirements</h4>
                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-150">{draft.metadata.notes}</p>
                    </div>
                  )}
                  {renderPaymentDetails('text-slate-400', false)}
                </div>
                <div className="md:col-span-5 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 md:col-start-8">
                  {renderTotalsSummary(false, false, 'text-slate-900')}
                </div>
              </div>

              <div className="mt-12 pt-6 border-t border-slate-100 text-center invoice-footer">
                <p className="text-xs text-slate-450 tracking-wider font-bold">Thank you for your business.</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ==================== PRINT PREVIEW MODAL ==================== */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex flex-col justify-between overflow-y-auto p-4 no-print" id="print-preview-modal-backdrop">
          {/* Header Controls */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between max-w-5xl w-full mx-auto shadow-2xl mb-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded text-white shadow-md">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Print Layout Preview</h3>
                <p className="text-[10px] text-slate-300">Simulates an A4 paper sheet (210mm x 297mm). Review exact pagination and margins before printing.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => {
                  setShowPrintPreview(false);
                  setTimeout(() => {
                    window.print();
                  }, 150);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5 min-h-[38px]"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF (Browser)
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white px-4 py-2 rounded text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5 min-h-[38px]"
              >
                {isGeneratingPDF ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF (Local)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPrintPreview(false)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3.5 py-2 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 min-h-[38px]"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>

          {/* Simulated A4 Container scroll area */}
          <div className="flex-1 w-full flex justify-center items-start overflow-auto p-4 max-w-5xl mx-auto">
            <div className="bg-slate-900/30 p-2 sm:p-6 md:p-8 rounded-2xl border border-slate-800/40 w-full flex justify-center shadow-inner overflow-x-auto">
              <div 
                className="bg-white text-slate-800 shadow-2xl border border-slate-300 relative rounded-sm font-sans shrink-0 overflow-hidden"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '12mm 15mm'
                }}
              >
                {/* Inner replica of active template */}
                {selectedTemplate === 'minimalist' && (
                  <div className="space-y-8 animate-fadeIn">
                    <div className="flex flex-row justify-between items-start gap-6 border-b border-slate-100 pb-6">
                      <div className="space-y-3">
                        {profile.logo ? (
                          <div className="h-14 max-w-[180px] flex items-center">
                            <img src={profile.logo} alt={profile.companyName} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{profile.companyName || 'YOUR BUSINESS'}</h1>
                        )}
                        {profile.companyName && profile.logo && <p className="text-xs font-bold text-slate-850">{profile.companyName}</p>}
                      </div>

                      <div className="text-right space-y-1">
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sender</h2>
                        <div className="text-xs text-slate-600 whitespace-pre-line leading-normal">{profile.address || 'Address Not Configured'}</div>
                        <div className="pt-1 text-[11px] text-slate-400 space-y-0.5">
                          {profile.phone && <p>Phone: {profile.phone}</p>}
                          {profile.email && <p>Email: {profile.email}</p>}
                          {profile.website && <p>Website: {profile.website}</p>}
                          {profile.taxRegNumber && <p className="font-mono text-slate-600 font-bold text-[11px] mt-1 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-150">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                      <div className="space-y-1.5">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bill To</h3>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-900">{draft.customer.name || 'Recipient Name'}</p>
                          {draft.customer.address && <p className="text-xs text-slate-600 whitespace-pre-line leading-normal">{draft.customer.address}</p>}
                          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                            {draft.customer.phone && <p>Phone: {draft.customer.phone}</p>}
                            {draft.customer.email && <p>Email: {draft.customer.email}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between text-right space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Type</span>
                          <div className="flex items-center justify-end gap-2 mt-0.5">
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">INVOICE</h1>
                            {draft.status === 'Paid' ? (
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">PAID</span>
                            ) : (
                              <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">DUE</span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-left justify-end">
                          <span className="text-slate-400 font-semibold">Invoice Number:</span>
                          <span className="text-slate-800 font-mono font-bold text-right">{draft.metadata.invoiceNumber}</span>
                          <span className="text-slate-400 font-semibold">Issue Date:</span>
                          <span className="text-slate-800 text-right">{draft.metadata.issueDate}</span>
                          {draft.metadata.dueDate && (
                            <>
                              <span className="text-slate-400 font-semibold">Due Date:</span>
                              <span className="text-red-600 font-semibold text-right">{draft.metadata.dueDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">{renderItemsTable(false, false)}</div>

                    <div className="grid grid-cols-12 gap-6 pt-4">
                      <div className="col-span-7 space-y-4">
                        {draft.metadata.notes && (
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes & Special Instructions</h4>
                            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/50 p-3 rounded border border-slate-150">{draft.metadata.notes}</p>
                          </div>
                        )}
                        {renderPaymentDetails('text-slate-400', false)}
                      </div>
                      <div className="col-span-5 space-y-2 col-start-8">{renderTotalsSummary(false, false)}</div>
                    </div>

                    <div className="absolute bottom-10 left-12 right-12 text-center border-t border-slate-100 pt-6">
                      <p className="text-xs text-slate-440 tracking-wide font-semibold">Thank you for your business.</p>
                    </div>
                  </div>
                )}

                {selectedTemplate === 'modern-blue' && (
                  <div className="space-y-8 bg-white animate-fadeIn">
                    <div className="flex flex-row justify-between items-start gap-6 border-b-2 border-blue-100 pb-6">
                      <div className="space-y-3">
                        {profile.logo ? (
                          <div className="h-14 max-w-[180px] flex items-center">
                            <img src={profile.logo} alt={profile.companyName} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <h1 className="text-2xl font-black text-blue-900 tracking-tight">{profile.companyName || 'YOUR BUSINESS'}</h1>
                        )}
                        {profile.companyName && profile.logo && <p className="text-sm font-bold text-blue-900">{profile.companyName}</p>}
                      </div>

                      <div className="text-right space-y-1">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Sender Profile</span>
                        <div className="text-xs text-slate-600 whitespace-pre-line leading-normal mt-1">{profile.address || 'Address Not Configured'}</div>
                        <div className="pt-1 text-[11px] text-slate-455 space-y-0.5">
                          {profile.phone && <p>Ph: {profile.phone}</p>}
                          {profile.email && <p>Email: {profile.email}</p>}
                          {profile.taxRegNumber && <p className="font-mono text-blue-700 font-bold text-[11px] mt-1 bg-blue-50/50 inline-block px-1.5 py-0.5 rounded border border-blue-100">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-slate-50/70 p-6 rounded-lg border border-slate-100">
                      <div className="space-y-1.5">
                        <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Billed To</h3>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900">{draft.customer.name || 'Recipient Name'}</p>
                          {draft.customer.address && <p className="text-xs text-slate-600 whitespace-pre-line leading-normal">{draft.customer.address}</p>}
                          <div className="text-[11px] text-slate-505 space-y-0.5 pt-1.5">
                            {draft.customer.phone && <p>Phone: {draft.customer.phone}</p>}
                            {draft.customer.email && <p>Email: {draft.customer.email}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between text-right space-y-3">
                        <div>
                          <div className="flex items-center justify-end gap-2">
                            <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight leading-none">INVOICE</h1>
                            {draft.status === 'Paid' ? (
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">PAID</span>
                            ) : (
                              <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">DUE</span>
                            )}
                          </div>
                          <span className="text-[11px] text-blue-600 font-mono font-bold block mt-1">#{draft.metadata.invoiceNumber}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-left justify-end border-t border-slate-200/60 pt-2 w-full">
                          <span className="text-slate-400 font-medium">Issue Date:</span>
                          <span className="text-slate-800 text-right">{draft.metadata.issueDate}</span>
                          {draft.metadata.dueDate && (
                            <>
                              <span className="text-slate-400 font-medium">Due Date:</span>
                              <span className="text-blue-600 font-bold text-right">{draft.metadata.dueDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">{renderItemsTable(false, true, 'bg-blue-50/40 text-blue-900')}</div>

                    <div className="grid grid-cols-12 gap-6 pt-4">
                      <div className="col-span-7 space-y-4">
                        {draft.metadata.notes && (
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Notes & Special Instructions</h4>
                            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-blue-50/20 p-3.5 rounded border border-blue-50 font-sans">{draft.metadata.notes}</p>
                          </div>
                        )}
                        {renderPaymentDetails('text-blue-700', false)}
                      </div>
                      <div className="col-span-5 bg-blue-50/10 p-4 rounded-lg border border-blue-100/50 space-y-2 col-start-8">
                        {renderTotalsSummary(false, false, 'text-blue-900')}
                      </div>
                    </div>

                    <div className="absolute bottom-10 left-12 right-12 text-center border-t border-blue-50 pt-6">
                      <p className="text-xs text-blue-600/70 tracking-wide font-bold">Thank you for your partnership.</p>
                    </div>
                  </div>
                )}

                {selectedTemplate === 'editorial-serif' && (
                  <div className="space-y-8 bg-white font-serif animate-fadeIn">
                    <div className="flex flex-row justify-between items-start gap-6 border-b border-slate-900 pb-6">
                      <div className="space-y-3">
                        {profile.logo ? (
                          <div className="h-14 max-w-[180px] flex items-center">
                            <img src={profile.logo} alt={profile.companyName} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <h1 className="text-3xl font-light tracking-wide text-slate-950 uppercase">{profile.companyName || 'YOUR BUSINESS'}</h1>
                        )}
                        {profile.companyName && profile.logo && <p className="text-xs font-serif italic text-slate-700">{profile.companyName}</p>}
                      </div>

                      <div className="text-right space-y-1 font-sans">
                        <h2 className="text-[9px] font-black tracking-widest text-slate-900 uppercase">Sender Origin</h2>
                        <div className="text-xs text-slate-600 whitespace-pre-line leading-normal">{profile.address || 'Address Not Configured'}</div>
                        <div className="pt-1 text-[11px] text-slate-400 space-y-0.5">
                          {profile.phone && <p>Ph: {profile.phone}</p>}
                          {profile.email && <p>Em: {profile.email}</p>}
                          {profile.taxRegNumber && <p className="font-mono text-slate-900 font-bold text-[11px] mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded border border-slate-250">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="text-[9px] font-black tracking-widest text-slate-900 uppercase font-sans">Recipient Profile</h3>
                        <div className="space-y-1 font-sans">
                          <p className="text-xs font-bold text-slate-900 font-serif">{draft.customer.name || 'Recipient Name'}</p>
                          {draft.customer.address && <p className="text-xs text-slate-655 whitespace-pre-line leading-normal">{draft.customer.address}</p>}
                          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1.5">
                            {draft.customer.phone && <p>Phone: {draft.customer.phone}</p>}
                            {draft.customer.email && <p>Email: {draft.customer.email}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between text-right space-y-2">
                        <div>
                          <div className="flex items-center justify-end gap-2">
                            <h1 className="text-3xl font-light tracking-widest text-slate-950 uppercase leading-none">INVOICE</h1>
                            {draft.status === 'Paid' ? (
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">PAID</span>
                            ) : (
                              <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded tracking-wider uppercase font-sans">DUE</span>
                            )}
                          </div>
                          <p className="font-sans text-xs font-bold text-slate-500 tracking-wider mt-1.5">No. {draft.metadata.invoiceNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-left justify-end font-sans">
                          <span className="text-slate-400 font-semibold">Issued On:</span>
                          <span className="text-slate-855 text-right font-medium">{draft.metadata.issueDate}</span>
                          {draft.metadata.dueDate && (
                            <>
                              <span className="text-slate-400 font-semibold">Due On:</span>
                              <span className="text-red-700 font-bold text-right">{draft.metadata.dueDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">{renderItemsTable(true, false)}</div>

                    <div className="grid grid-cols-12 gap-6 pt-4">
                      <div className="col-span-7 space-y-4">
                        {draft.metadata.notes && (
                          <div className="space-y-1.5">
                            <h4 className="text-[9px] font-bold tracking-widest text-slate-900 uppercase font-sans">Terms & Declarations</h4>
                            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed italic border-l-2 border-slate-900 pl-3 font-serif">{draft.metadata.notes}</p>
                          </div>
                        )}
                        {renderPaymentDetails('text-slate-900 font-sans font-bold', true)}
                      </div>
                      <div className="col-span-5 space-y-2 col-start-8">{renderTotalsSummary(true, true, 'text-slate-950')}</div>
                    </div>

                    <div className="absolute bottom-10 left-12 right-12 text-center border-t border-slate-200 pt-6 font-serif italic text-slate-500">
                      <p className="text-xs">With compliments and appreciation.</p>
                    </div>
                  </div>
                )}

                {selectedTemplate === 'compact-slate' && (
                  <div className="space-y-6 bg-white font-sans text-slate-800 animate-fadeIn">
                    <div className="flex flex-row justify-between items-start gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{profile.companyName || 'YOUR BUSINESS'}</h1>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono tracking-wide mt-1">SENDER PROFILE</p>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="flex items-center justify-end gap-1.5">
                          {draft.status === 'Paid' ? (
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-250 px-1.5 py-0.5 rounded uppercase font-sans">PAID</span>
                          ) : (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-250 px-1.5 py-0.5 rounded uppercase font-sans">DUE</span>
                          )}
                          <span className="text-[10px] bg-slate-950 text-white font-sans font-bold px-1.5 py-0.5 rounded uppercase font-sans">Invoice</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 block">#{draft.metadata.invoiceNumber}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Billing Origin</span>
                        <p className="text-[11px] text-slate-505 whitespace-pre-line leading-snug">{profile.address}</p>
                        {profile.taxRegNumber && <p className="text-[10px] text-slate-500 font-semibold pt-1">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200 rounded p-3 space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Billing Recipient</span>
                        <p className="font-semibold text-slate-850">{draft.customer.name || 'Recipient'}</p>
                        <p className="text-[11px] text-slate-505 whitespace-pre-line leading-snug">{draft.customer.address}</p>
                        <div className="text-[10px] text-slate-400 pt-1 space-y-0.5">
                          {draft.customer.phone && <p>Ph: {draft.customer.phone}</p>}
                          {draft.customer.email && <p>Em: {draft.customer.email}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">{renderItemsTable(false, true, 'bg-slate-100 text-slate-800')}</div>

                    <div className="grid grid-cols-12 gap-4 pt-2">
                      <div className="col-span-7 space-y-3">
                        {draft.metadata.notes && (
                          <div className="bg-slate-50/40 p-3 rounded border border-slate-150 space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Important Disclosures</span>
                            <p className="text-[11px] text-slate-655 whitespace-pre-line leading-relaxed">{draft.metadata.notes}</p>
                          </div>
                        )}
                        {renderPaymentDetails('text-slate-400', false)}
                      </div>
                      <div className="col-span-5 bg-slate-50/60 p-3 rounded border border-slate-150 space-y-2 col-start-8">
                        {renderTotalsSummary(false, false, 'text-slate-855')}
                      </div>
                    </div>

                    <div className="absolute bottom-10 left-12 right-12 text-center border-t border-slate-100 pt-4 text-[11px] text-slate-400">
                      <p>System Generated Document. Thank you for your business.</p>
                    </div>
                  </div>
                )}

                {selectedTemplate === 'bold-accent' && (
                  <div className="space-y-8 bg-white animate-fadeIn">
                    <div className="bg-slate-900 text-white p-10 -mx-[15mm] -mt-[12mm] flex flex-row justify-between items-center gap-6">
                      <div className="space-y-2">
                        <h1 className="text-2xl font-black tracking-tight uppercase">{profile.companyName || 'YOUR BUSINESS'}</h1>
                        <div className="text-xs text-slate-300 whitespace-pre-line leading-snug max-w-md">{profile.address}</div>
                        {profile.taxRegNumber && <p className="text-[10px] text-slate-400 font-mono font-bold bg-slate-800 inline-block px-1.5 py-0.5 rounded">{profile.taxRegLabel}: {profile.taxRegNumber}</p>}
                      </div>

                      <div className="text-right border-l border-slate-700 pl-6 space-y-2 font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-2xl font-black tracking-widest block text-blue-400 font-sans">INVOICE</span>
                          {draft.status === 'Paid' ? (
                            <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded tracking-wider uppercase font-sans">PAID</span>
                          ) : (
                            <span className="text-[9px] font-black bg-amber-500 text-slate-900 px-2 py-0.5 rounded tracking-wider uppercase font-sans">DUE</span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-slate-350 space-y-0.5">
                          <p>Number: <strong className="text-white">#{draft.metadata.invoiceNumber}</strong></p>
                          <p>Issued: {draft.metadata.issueDate}</p>
                          {draft.metadata.dueDate && <p className="text-red-400 font-bold">Due Date: {draft.metadata.dueDate}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6 pt-2 pb-6 border-b border-slate-100">
                        <div className="space-y-1.5">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billed To</h3>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-900">{draft.customer.name || 'Recipient Name'}</p>
                            {draft.customer.address && <p className="text-xs text-slate-650 whitespace-pre-line leading-normal">{draft.customer.address}</p>}
                            <div className="text-[11px] text-slate-400 space-y-0.5 pt-1.5">
                              {draft.customer.phone && <p>Ph: {draft.customer.phone}</p>}
                              {draft.customer.email && <p>Email: {draft.customer.email}</p>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-1.5">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Sender</h3>
                          <div className="text-xs text-slate-600 space-y-0.5">
                            {profile.phone && <p>Phone: {profile.phone}</p>}
                            {profile.email && <p>Email: {profile.email}</p>}
                            {profile.website && <p>Web: {profile.website}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">{renderItemsTable(false, false, 'bg-slate-900 text-white')}</div>

                      <div className="grid grid-cols-12 gap-6 pt-4">
                        <div className="col-span-7 space-y-4">
                          {draft.metadata.notes && (
                            <div className="space-y-1.5">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes & Special Requirements</h4>
                              <p className="text-xs text-slate-650 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-150">{draft.metadata.notes}</p>
                            </div>
                          )}
                          {renderPaymentDetails('text-slate-400', false)}
                        </div>
                        <div className="col-span-5 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 col-start-8">
                          {renderTotalsSummary(false, false, 'text-slate-900')}
                        </div>
                      </div>

                      <div className="absolute bottom-10 left-12 right-12 text-center border-t border-slate-100 pt-6">
                        <p className="text-xs text-slate-455 tracking-wider font-bold">Thank you for your business.</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
      {/* ==================== E-INVOICE EMAIL MODAL ==================== */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="email-invoice-modal-backdrop">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-150 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between text-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Email PDF Invoice</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => { e.preventDefault(); handleEmailMailto(); }} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-normal font-sans">
                Confirm your customer's email address below.
              </p>

              <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3.5 rounded-lg space-y-1.5 leading-normal">
                <p className="font-bold">⚠️ Note on PDF attachments:</p>
                <p className="text-[11px] text-amber-800">
                  Browser security regulations prevent web apps from attaching local files directly. 
                  When you click <strong>Open Mail Client</strong>, we will trigger a download of the PDF invoice. Please attach that file to your email manually.
                </p>
              </div>

              {/* Input field */}
              <div className="space-y-1.5">
                <label htmlFor="customer-email-field" className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Recipient Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    id="customer-email-field"
                    type="email"
                    required
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="customer@example.com"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 transition-all font-sans min-h-[38px]"
                  />
                </div>
              </div>

              {/* Details breakdown */}
              <div className="bg-slate-50 p-3 rounded border border-slate-150 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans text-[9px] uppercase font-bold tracking-wide">Invoice Number:</span>
                  <strong className="text-slate-800">#{draft.metadata.invoiceNumber || 'Draft'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans text-[9px] uppercase font-bold tracking-wide">Client Name:</span>
                  <strong className="text-slate-800">{draft.customer.name || 'N/A'}</strong>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-slate-100 flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded text-xs transition-all cursor-pointer min-h-[36px]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!emailAddress.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[36px] disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Open Mail Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

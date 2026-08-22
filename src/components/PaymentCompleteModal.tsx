import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  CheckCircle, 
  Download, 
  Share2, 
  CreditCard, 
  Banknote, 
  Building2, 
  Smartphone,
  Receipt
} from 'lucide-react';
import { InvoiceDraft, BusinessProfile, TaxConfig } from '../types';
import { formatMoney } from '../constants';

interface PaymentCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: InvoiceDraft;
  profile: BusinessProfile;
  tax: TaxConfig;
  transactionId?: string;
  paymentMethod?: string;
  onOpenReceipt: () => void;
  onShareReceipt?: () => void;
}

export default function PaymentCompleteModal({
  isOpen,
  onClose,
  draft,
  profile,
  tax,
  transactionId = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
  paymentMethod = 'Cash',
  onOpenReceipt,
  onShareReceipt,
}: PaymentCompleteModalProps) {
  const [copiedTxn, setCopiedTxn] = useState(false);

  if (!isOpen) return null;

  const handleCopyTxn = () => {
    navigator.clipboard.writeText(transactionId);
    setCopiedTxn(true);
    setTimeout(() => setCopiedTxn(false), 2000);
  };

  const paymentDate = (draft as any).paidDate || new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Render method icon
  const getMethodIcon = () => {
    const pm = (paymentMethod || '').toLowerCase();
    if (pm.includes('bank')) return <Building2 className="w-3.5 h-3.5 text-blue-600" />;
    if (pm.includes('mfs') || pm.includes('bkash') || pm.includes('nagad') || pm.includes('rocket')) {
      return <Smartphone className="w-3.5 h-3.5 text-pink-600" />;
    }
    return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn font-sans">
      
      {/* Modal / Bottom Sheet Container */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 animate-slideUp relative overflow-hidden">
        
        {/* Scatter / Confetti Background Particles */}
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none overflow-hidden opacity-40">
          <div className="absolute top-4 left-8 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <div className="absolute top-8 right-12 w-3 h-3 rotate-45 bg-amber-400" />
          <div className="absolute top-12 left-20 w-2.5 h-2.5 rounded-full bg-[#0F3D2E]" />
          <div className="absolute top-6 right-24 w-2 h-2 bg-pink-400 rounded-full" />
        </div>

        {/* Top Row: "Payment info" title centered, X close icon right */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 relative z-10">
          <div className="w-8" />
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
            Payment info
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Checkmark Badge & Heading */}
        <div className="text-center space-y-2 relative z-10 pt-2">
          <div className="w-16 h-16 rounded-full bg-[#0F172A] text-white flex items-center justify-center mx-auto shadow-lg shadow-slate-900/20 border-4 border-emerald-50 dark:border-slate-800">
            <Check className="w-8 h-8 stroke-[3] text-emerald-400" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Payment Complete
          </h2>
        </div>

        {/* Torn-Ticket / Receipt-Stub Visual Card */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-dashed border-slate-300 dark:border-slate-700 space-y-4 relative shadow-2xs">
          
          {/* Perforated edge effect top bar */}
          <div className="absolute -top-1.5 left-4 right-4 h-1 border-t-2 border-dotted border-slate-300 dark:border-slate-600" />

          {/* Large Bold Amount at Top */}
          <div className="text-center pt-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Total Paid
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 font-sans tracking-tight mt-0.5">
              {formatMoney(draft.paidAmount || 0, profile.currency.symbol)}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700/60" />

          {/* Details Table inside stub */}
          <div className="space-y-2.5 text-xs">
            {/* Client Row */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Client</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <div className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 text-[9px] flex items-center justify-center font-bold">
                  {draft.customer.name ? draft.customer.name.charAt(0) : 'C'}
                </div>
                <span>{draft.customer.name || 'Client'}</span>
              </div>
            </div>

            {/* Date Row */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{paymentDate}</span>
            </div>

            {/* Payment Method Row */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Payment Method</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                {getMethodIcon()}
                <span>{paymentMethod}</span>
              </div>
            </div>

            {/* Transaction ID Row */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Transaction ID</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{transactionId}</span>
                <button
                  type="button"
                  onClick={handleCopyTxn}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Copy ID"
                >
                  {copiedTxn ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Total Row */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
              <span>Invoice Total</span>
              <span className="font-mono">{formatMoney(draft.paidAmount || 0, profile.currency.symbol)}</span>
            </div>
          </div>

        </div>

        {/* Bottom Two Buttons Side by Side */}
        <div className="flex items-center gap-3 pt-2">
          {/* Download Receipt (Outline Pill) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenReceipt();
            }}
            className="flex-1 py-3 px-4 rounded-2xl border-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 text-xs font-extrabold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Receipt className="w-4 h-4" />
            <span>Download Receipt</span>
          </button>

          {/* Send / Share (Solid Dark Pill) */}
          <button
            type="button"
            onClick={() => {
              if (onShareReceipt) onShareReceipt();
              else {
                onClose();
                onOpenReceipt();
              }
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-extrabold transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/20"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Mail, 
  Copy, 
  Check, 
  Share2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  DollarSign, 
  User, 
  Smartphone,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { InvoiceDraft, BusinessProfile, TaxConfig } from '../types';
import { formatMoney } from '../constants';
import { calculateInvoiceTotals, getInvoiceStatus, getDaysUntilDue } from '../utils/calculations';

interface RemindClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: InvoiceDraft;
  profile: BusinessProfile;
  tax: TaxConfig;
}

export default function RemindClientModal({
  isOpen,
  onClose,
  draft,
  profile,
  tax,
}: RemindClientModalProps) {
  if (!isOpen) return null;

  const { grandTotal } = calculateInvoiceTotals(
    draft.items,
    draft.discountType,
    draft.discountValue,
    tax
  );

  const paidAmount = draft.paidAmount || (draft.status === 'Paid' ? grandTotal : 0);
  const balanceDue = Math.max(0, grandTotal - paidAmount);
  const status = getInvoiceStatus(draft, grandTotal);
  const dueInfo = getDaysUntilDue(draft.metadata.dueDate);

  const clientName = draft.customer.name || 'Valued Customer';
  const invoiceNumber = draft.metadata.invoiceNumber || 'INV-1001';
  const dueDate = draft.metadata.dueDate || 'due date';
  const companyName = profile.companyName || 'our business';
  const currencySymbol = profile.currency.symbol;
  const formattedAmount = formatMoney(balanceDue, currencySymbol);

  // Default friendly template
  const defaultMessage = `Hi ${clientName}, a friendly reminder that invoice #${invoiceNumber} for ${formattedAmount} is due on ${dueDate}. Thank you! - ${companyName}`;

  const [message, setMessage] = useState(defaultMessage);
  const [recipientPhone, setRecipientPhone] = useState(draft.customer.phone || '');
  const [recipientEmail, setRecipientEmail] = useState(draft.customer.email || '');
  const [copied, setCopied] = useState(false);

  // Clean phone number for WhatsApp / SMS URL (digits + optional leading plus)
  const cleanPhone = recipientPhone.replace(/[^\d+]/g, '');

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleWhatsApp = () => {
    const encodedText = encodeURIComponent(message);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Payment Reminder: Invoice #${invoiceNumber} from ${companyName}`);
    const body = encodeURIComponent(message);
    const mailtoUrl = recipientEmail 
      ? `mailto:${recipientEmail}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const handleSms = () => {
    const body = encodeURIComponent(message);
    const smsUrl = cleanPhone ? `sms:${cleanPhone}?body=${body}` : `sms:?body=${body}`;
    window.location.href = smsUrl;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #${invoiceNumber} Reminder`,
          text: message,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share dismissed', err);
      }
    } else {
      handleCopyMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Remind Client
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Free share hand-off via your own apps
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Invoice Summary Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Invoice
                </span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 font-mono">
                  #{invoiceNumber}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Balance Due
                </span>
                <span className="font-black text-sm text-slate-900 dark:text-slate-100 font-mono">
                  {formattedAmount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[170px]">{clientName}</span>
              </div>

              <div className="flex items-center gap-1">
                {status === 'Overdue' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                    <Clock className="w-3 h-3" />
                    {dueInfo?.days ? `${dueInfo.days}d Overdue` : 'Overdue'}
                  </span>
                ) : dueInfo?.isDueToday ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    <Clock className="w-3 h-3" />
                    Due Today
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    <Calendar className="w-3 h-3" />
                    Due: {dueDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                <Smartphone className="w-3 h-3 text-slate-400" />
                <span>Client Phone (for WhatsApp/SMS)</span>
              </label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="e.g. +1 234 567 8900"
                className="w-full text-xs font-mono py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                <Mail className="w-3 h-3 text-slate-400" />
                <span>Client Email</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Pre-filled Message Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Reminder Message
              </label>
              <button
                type="button"
                onClick={() => setMessage(defaultMessage)}
                className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold"
              >
                Reset to default
              </button>
            </div>

            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Quick Action Channels (User Sends Themselves) */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Send via your apps (Free & Direct)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={handleWhatsApp}
                className="py-2.5 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                <span>WhatsApp</span>
              </button>

              {/* SMS Button */}
              <button
                type="button"
                onClick={handleSms}
                className="py-2.5 px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Smartphone className="w-4 h-4 stroke-[2.2]" />
                <span>SMS</span>
              </button>

              {/* Email Button */}
              <button
                type="button"
                onClick={handleEmail}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Mail className="w-4 h-4 stroke-[2.2]" />
                <span>Email</span>
              </button>

              {/* Device Share / Copy */}
              {typeof navigator !== 'undefined' && 'share' in navigator ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4 stroke-[2.2]" />
                  <span>Share Sheet</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                    copied 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Copy Message Bar */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl text-xs text-slate-500 dark:text-slate-400">
            <span className="text-[11px] truncate mr-2">Or copy the text manually:</span>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center">
          <p className="text-[10px] text-slate-400">
            100% Free & Offline • You send directly from your device with zero gateway fees
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  Mail, 
  MessageSquare, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { exportPdf } from '../utils/exportPdf';
import { Capacitor } from '@capacitor/core';
import { FASTINVO_ICON_MARK } from '../assets/logo';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  textSummary: string;
  fileName: string;
  generatePdfDoc?: () => Promise<jsPDF | null>;
  recipientEmail?: string;
  recipientPhone?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  textSummary,
  fileName,
  generatePdfDoc,
  recipientEmail = '',
  recipientPhone = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textSummary);
      setCopied(true);
      setStatusMessage('Text summary copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setStatusMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      setStatusMessage('Could not copy automatically. You can copy the text below.');
    }
  };

  const handleWhatsApp = () => {
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    const bodyText = `📄 PDF E-RECEIPT - ${title}\n\n${textSummary}`;
    const encodedText = encodeURIComponent(bodyText);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`${title} (PDF E-Receipt)`);
    const body = encodeURIComponent(`OFFICIAL PDF E-RECEIPT\n\n${textSummary}\n\n[Document: ${fileName}]`);
    const mailtoUrl = `mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const handleSMS = () => {
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    const smsText = `[TEXT RECEIPT]\n${title}\n\n${textSummary}`;
    const body = encodeURIComponent(smsText);
    const smsUrl = `sms:${cleanPhone}?body=${body}`;
    window.location.href = smsUrl;
  };

  const handleDownloadPdf = async () => {
    if (!generatePdfDoc) return;
    try {
      setIsGenerating(true);
      setStatusMessage('Generating PDF...');
      const doc = await generatePdfDoc();
      if (doc) {
        await exportPdf(doc, fileName);
        setStatusMessage('PDF downloaded successfully!');
      } else {
        setStatusMessage('Failed to generate PDF document.');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setStatusMessage('Error downloading PDF.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleNativeShare = async () => {
    try {
      setIsGenerating(true);
      let pdfFile: File | null = null;
      if (generatePdfDoc) {
        const doc = await generatePdfDoc();
        if (doc) {
          if (Capacitor.isNativePlatform()) {
            await exportPdf(doc, fileName);
            return;
          }
          const blob = doc.output('blob');
          pdfFile = new File([blob], fileName, { type: 'application/pdf' });
        }
      }

      let shared = false;
      if (pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: title,
            text: textSummary,
          });
          shared = true;
        } catch (shareErr: any) {
          if (
            shareErr?.name === 'AbortError' ||
            shareErr?.message?.toLowerCase().includes('cancel') ||
            shareErr?.message?.toLowerCase().includes('abort')
          ) {
            shared = true;
          }
        }
      }

      if (!shared && navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: textSummary,
          });
          shared = true;
        } catch (shareErr: any) {
          if (
            shareErr?.name === 'AbortError' ||
            shareErr?.message?.toLowerCase().includes('cancel') ||
            shareErr?.message?.toLowerCase().includes('abort')
          ) {
            shared = true;
          }
        }
      }

      if (!shared) {
        // Fallback: Copy to clipboard and download PDF
        await handleCopyText();
        if (generatePdfDoc) {
          await handleDownloadPdf();
        }
        setStatusMessage('Browser permissions restricted native share. Summary copied & PDF downloaded instead!');
      }
    } catch (err) {
      console.error('Native share error:', err);
      await handleCopyText();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="share-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scaleUp text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-black p-0.5 border border-slate-700/50 shadow-md flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                src={FASTINVO_ICON_MARK} 
                alt="FastInvo Logo" 
                className="w-full h-full object-cover rounded-xl" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">

          {/* Toast / Status Alert */}
          {statusMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs p-3 rounded-2xl flex items-center gap-2 animate-fadeIn font-medium">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2.5">

            {/* WhatsApp - PDF E-Receipt */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-4 h-4 fill-white" />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1">
                  <span className="block font-extrabold truncate">WhatsApp</span>
                  <span className="text-[9px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1 py-0.2 rounded font-black shrink-0">PDF</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal block truncate">PDF E-Receipt</span>
              </div>
            </button>

            {/* Email - PDF E-Receipt */}
            <button
              type="button"
              onClick={handleEmail}
              className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/60 text-blue-800 dark:text-blue-200 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Mail className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1">
                  <span className="block font-extrabold truncate">Email</span>
                  <span className="text-[9px] bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-1 py-0.2 rounded font-black shrink-0">PDF</span>
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal block truncate">PDF E-Receipt</span>
              </div>
            </button>

            {/* SMS / Text - Text Receipt */}
            <button
              type="button"
              onClick={handleSMS}
              className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200/80 dark:border-purple-800/60 text-purple-800 dark:text-purple-200 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1">
                  <span className="block font-extrabold truncate">SMS / Text</span>
                  <span className="text-[9px] bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-1 py-0.2 rounded font-black shrink-0">Text</span>
                </div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal block truncate">Text Receipt</span>
              </div>
            </button>

            {/* Copy Text Summary */}
            <button
              type="button"
              onClick={handleCopyText}
              className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
            >
              <div className={`w-8 h-8 rounded-xl ${copied ? 'bg-emerald-600' : 'bg-slate-700 dark:bg-slate-600'} text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </div>
              <div className="text-left min-w-0">
                <span className="block font-extrabold truncate">{copied ? 'Copied!' : 'Copy Text'}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal block truncate">Copy text receipt</span>
              </div>
            </button>

          </div>

          {/* Full-width Options: Download PDF E-Receipt & Native Share */}
          <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
            {generatePdfDoc && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
                <span>{isGenerating ? 'Generating PDF...' : 'Download PDF E-Receipt'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNativeShare}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-400 stroke-[2]" />
              <span>Share PDF E-Receipt File (System Sheet)</span>
            </button>
          </div>

          {/* Text Summary Preview Box */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Text Summary Preview
            </span>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
              {textSummary}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

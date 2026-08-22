import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Smartphone, Building2, Wallet } from 'lucide-react';
import { BusinessProfile } from '../types';

interface PaymentQrSectionProps {
  profile: BusinessProfile;
  isSerif?: boolean;
  themeColor?: string;
  className?: string;
}

export function formatPaymentQrData(profile: BusinessProfile): {
  type: string;
  account: string;
  accountName?: string;
  bankName?: string;
  routing?: string;
  instructions?: string;
  qrPayload: string;
} | null {
  const account = (profile.paymentQrAccount || profile.mfsAccountNo || '').trim();
  if (!account) return null;

  const type = (profile.paymentQrType || profile.mfsProvider || 'bKash').trim();
  const accountName = (profile.paymentQrAccountName || '').trim();
  const bankName = (profile.paymentQrBankName || '').trim();
  const routing = (profile.paymentQrRouting || '').trim();
  const instructions = (profile.paymentQrInstructions || '').trim();

  let qrPayload = '';
  const typeLower = type.toLowerCase();

  if (typeLower === 'bank') {
    qrPayload = `Bank: ${bankName || 'Bank Transfer'}\nA/C: ${account}${accountName ? `\nHolder: ${accountName}` : ''}${routing ? `\nRouting: ${routing}` : ''}`;
    if (instructions) qrPayload += `\nNote: ${instructions}`;
  } else if (['bkash', 'nagad', 'rocket', 'upay'].includes(typeLower)) {
    // Structured scannable format
    qrPayload = `${type}: ${account}${accountName ? ` (${accountName})` : ''}`;
    if (instructions) qrPayload += `\n${instructions}`;
  } else {
    qrPayload = `${type}: ${account}${accountName ? ` (${accountName})` : ''}`;
    if (instructions) qrPayload += `\n${instructions}`;
  }

  return {
    type,
    account,
    accountName: accountName || undefined,
    bankName: bankName || undefined,
    routing: routing || undefined,
    instructions: instructions || undefined,
    qrPayload,
  };
}

export default function PaymentQrSection({
  profile,
  isSerif = false,
  className = '',
}: PaymentQrSectionProps) {
  const data = formatPaymentQrData(profile);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!data || !data.qrPayload) {
      setQrDataUrl('');
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(data.qrPayload, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate payment QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [data?.qrPayload]);

  if (!data) return null;

  const isBank = data.type.toLowerCase() === 'bank';
  const isMfs = ['bkash', 'nagad', 'rocket', 'upay'].includes(data.type.toLowerCase());

  return (
    <div
      className={`page-break-inside-avoid bg-slate-50/80 border border-slate-200/90 rounded-xl p-2.5 max-w-sm flex items-center gap-3 ${className}`}
      id="invoice-payment-qr-block"
    >
      {/* QR Code Image (Compact 56x56 px with white background) */}
      <div className="shrink-0 w-14 h-14 bg-white p-0.5 rounded-lg border border-slate-250 shadow-2xs flex items-center justify-center overflow-hidden">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Scan to Pay QR"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <QrCode className="w-8 h-8 text-slate-300 animate-pulse" />
        )}
      </div>

      {/* Payment Details Plain Text (Legible on print) */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-1.5 py-0.2 rounded font-sans">
            {isMfs ? (
              <Smartphone className="w-2.5 h-2.5" />
            ) : isBank ? (
              <Building2 className="w-2.5 h-2.5" />
            ) : (
              <Wallet className="w-2.5 h-2.5" />
            )}
            <span>Scan to Pay ({data.type})</span>
          </span>
        </div>

        {/* Printed Account Number */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-slate-500 font-sans">
            {isBank ? 'A/C:' : 'Number:'}
          </span>
          <span className="text-xs font-black font-mono text-slate-900 tracking-wide select-all">
            {data.account}
          </span>
        </div>

        {/* Account Name / Bank Info if present */}
        {(data.accountName || data.bankName) && (
          <div className={`text-[10px] text-slate-600 truncate leading-tight ${isSerif ? 'font-serif' : 'font-sans'}`}>
            {data.bankName && <span className="font-semibold">{data.bankName}</span>}
            {data.bankName && data.accountName && <span> • </span>}
            {data.accountName && <span>A/C Name: <strong className="font-semibold text-slate-800">{data.accountName}</strong></span>}
          </div>
        )}

        {/* Routing / Branch or Instructions */}
        {(data.routing || data.instructions) && (
          <p className="text-[9px] text-slate-500 truncate leading-tight font-sans">
            {data.routing && <span>Routing: {data.routing} </span>}
            {data.instructions && <span>{data.instructions}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

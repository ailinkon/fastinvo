import React from 'react';

interface InvoiceStatusDonutChartProps {
  paidCount: number;
  partiallyPaidCount?: number;
  unpaidCount?: number;
  pendingCount?: number; // Fallback if partiallyPaid + unpaid not separated
  overdueCount: number;
  totalCount: number;
  paidValue?: number;
  partiallyPaidValue?: number;
  unpaidValue?: number;
  overdueValue?: number;
  currencySymbol?: string;
  onSelectStatus?: (status: string) => void;
  title?: string;
  subtitle?: string;
}

export const InvoiceStatusDonutChart: React.FC<InvoiceStatusDonutChartProps> = ({
  paidCount,
  partiallyPaidCount,
  unpaidCount,
  pendingCount = 0,
  overdueCount,
  totalCount,
  onSelectStatus,
  title = "Invoice Distribution by Status",
  subtitle = "Overview of invoices categorized as Paid, Unpaid, and Overdue."
}) => {
  const size = 220;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2; // (220 - 26) / 2 = 97
  const circumference = 2 * Math.PI * radius; // ~609.47

  const safeTotal = totalCount > 0 ? totalCount : 0;

  // Has 4 explicit status counts?
  const has4Statuses = partiallyPaidCount !== undefined && unpaidCount !== undefined;

  const actualPartiallyPaid = has4Statuses ? (partiallyPaidCount || 0) : 0;
  const actualUnpaid = has4Statuses ? (unpaidCount || 0) : pendingCount;

  const paidPct = safeTotal > 0 ? paidCount / safeTotal : 0;
  const partPct = safeTotal > 0 ? actualPartiallyPaid / safeTotal : 0;
  const unpaidPct = safeTotal > 0 ? actualUnpaid / safeTotal : 0;
  const overduePct = safeTotal > 0 ? overdueCount / safeTotal : 0;

  const paidDash = paidPct * circumference;
  const partDash = partPct * circumference;
  const unpaidDash = unpaidPct * circumference;
  const overdueDash = overduePct * circumference;

  const paidOffset = 0;
  const partOffset = -paidDash;
  const unpaidOffset = -(paidDash + partDash);
  const overdueOffset = -(paidDash + partDash + unpaidDash);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Donut Chart Canvas */}
      <div className="relative flex items-center justify-center my-3">
        <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
          {safeTotal === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeWidth={strokeWidth}
            />
          ) : (
            <>
              {/* Background Ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/50"
                strokeWidth={strokeWidth}
              />

              {/* Paid Segment (Blue) */}
              {paidCount > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#2563EB" // Bright blue
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${paidDash} ${circumference - paidDash}`}
                  strokeDashoffset={paidOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-700 ease-out cursor-pointer hover:opacity-85"
                  onClick={() => onSelectStatus?.('Paid')}
                />
              )}

              {/* Partially Paid Segment (Amber) */}
              {actualPartiallyPaid > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#F59E0B" // Amber
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${partDash} ${circumference - partDash}`}
                  strokeDashoffset={partOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-700 ease-out cursor-pointer hover:opacity-85"
                  onClick={() => onSelectStatus?.('Partially Paid')}
                />
              )}

              {/* Unpaid / Pending Segment (Orange or Slate) */}
              {actualUnpaid > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={has4Statuses ? "#64748B" : "#D97706"} // Slate or Orange
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${unpaidDash} ${circumference - unpaidDash}`}
                  strokeDashoffset={unpaidOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-700 ease-out cursor-pointer hover:opacity-85"
                  onClick={() => onSelectStatus?.('Unpaid')}
                />
              )}

              {/* Overdue Segment (Red) */}
              {overdueCount > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#DC2626" // Red
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${overdueDash} ${circumference - overdueDash}`}
                  strokeDashoffset={overdueOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-700 ease-out cursor-pointer hover:opacity-85"
                  onClick={() => onSelectStatus?.('Overdue')}
                />
              )}
            </>
          )}
        </svg>

        {/* Center Text Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-sans">
            {totalCount}
          </span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
            Total Invoice
          </span>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex-wrap">
        <button
          type="button"
          onClick={() => onSelectStatus?.('Paid')}
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-3 h-3 rounded-xs bg-[#2563EB] inline-block shrink-0" />
          <span>Paid</span>
          <span className="text-slate-400 font-normal">({paidCount})</span>
        </button>

        {has4Statuses && (
          <button
            type="button"
            onClick={() => onSelectStatus?.('Partially Paid')}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="w-3 h-3 rounded-xs bg-[#F59E0B] inline-block shrink-0" />
            <span>Partially Paid</span>
            <span className="text-slate-400 font-normal">({actualPartiallyPaid})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onSelectStatus?.('Unpaid')}
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-3 h-3 rounded-xs bg-[#D97706] inline-block shrink-0" style={{ backgroundColor: has4Statuses ? '#64748B' : '#D97706' }} />
          <span>{has4Statuses ? 'Unpaid' : 'Pending'}</span>
          <span className="text-slate-400 font-normal">({actualUnpaid})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectStatus?.('Overdue')}
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-3 h-3 rounded-xs bg-[#DC2626] inline-block shrink-0" />
          <span>Overdue</span>
          <span className="text-slate-400 font-normal">({overdueCount})</span>
        </button>
      </div>
    </div>
  );
};

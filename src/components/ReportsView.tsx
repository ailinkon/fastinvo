import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Printer, 
  Calendar, 
  DollarSign, 
  Users, 
  FileText, 
  PieChart, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Percent, 
  ShieldCheck, 
  Search,
  Building2,
  ArrowUpRight,
  Filter,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { SavedInvoice, BusinessProfile, Client, AuthUser } from '../types';
import { formatMoney } from '../constants';
import { calculateInvoiceTotals, getInvoiceStatus } from '../utils/calculations';
import { InvoiceStatusDonutChart } from './InvoiceStatusDonutChart';
import { FASTINVO_ICON_MARK } from '../assets/logo';
import { Lock } from 'lucide-react';

interface ReportsViewProps {
  invoices: SavedInvoice[];
  profile: BusinessProfile;
  clients: Client[];
  currentUser?: AuthUser | null;
  onSelectInvoice: (invoice: SavedInvoice) => void;
  onGoToClients: () => void;
  onBack?: () => void;
}

type PeriodFilter = 'all' | 'this_month' | 'last_30' | 'this_quarter' | 'this_year';

export default function ReportsView({
  invoices = [],
  profile,
  clients = [],
  currentUser = null,
  onSelectInvoice,
  onGoToClients,
  onBack
}: ReportsViewProps) {
  const currencySymbol = profile?.currency?.symbol || '$';
  const isStaff = currentUser?.role === 'staff';
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [revenueViewMode, setRevenueViewMode] = useState<'snapshot' | 'trend'>(() => {
    try {
      return (sessionStorage.getItem('fastinvo_reports_rev_view') as 'snapshot' | 'trend') || 'snapshot';
    } catch {
      return 'snapshot';
    }
  });

  // 1. Filter invoices based on selected period
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    return (invoices || []).filter(inv => {
      if (!inv || !inv.draft) return false;
      // Exclude quotations from financial revenue reports
      if (inv.draft.documentType === 'quotation') return false;

      if (!inv.draft.metadata?.issueDate) return true;
      const invDate = new Date(inv.draft.metadata.issueDate);
      if (isNaN(invDate.getTime())) return true;

      if (period === 'this_month') {
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      }
      if (period === 'last_30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return invDate >= thirtyDaysAgo;
      }
      if (period === 'this_quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const invQuarter = Math.floor(invDate.getMonth() / 3);
        return currentQuarter === invQuarter && invDate.getFullYear() === now.getFullYear();
      }
      if (period === 'this_year') {
        return invDate.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }, [invoices, period]);

  // Search filter for detailed list
  const searchedInvoices = useMemo(() => {
    if (!searchQuery.trim()) return filteredInvoices;
    const q = searchQuery.toLowerCase();
    return filteredInvoices.filter(inv => 
      (inv.draft.metadata?.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.draft.customer?.name || '').toLowerCase().includes(q) ||
      (inv.draft.status || '').toLowerCase().includes(q)
    );
  }, [filteredInvoices, searchQuery]);

  // 2. Financial Aggregations
  const analytics = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalGrossSubtotal = 0;

    let paidCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;
    let partCount = 0;
    let overdueVal = 0;

    const monthlyMap: Record<string, { monthLabel: string; invoiced: number; collected: number }> = {};
    const clientMap: Record<string, { name: string; invoiced: number; collected: number; count: number }> = {};

    filteredInvoices.forEach(inv => {
      const totals = calculateInvoiceTotals(
        inv.draft.items || [], 
        inv.draft.discountType || 'percentage', 
        inv.draft.discountValue || 0, 
        inv.tax || { taxEnabled: false, taxRate: 0, taxInclusive: false }
      );
      const invoiceTotal = totals.grandTotal;
      const paid = inv.draft.paidAmount || (inv.draft.status === 'Paid' ? invoiceTotal : 0);
      const remaining = Math.max(0, invoiceTotal - paid);

      totalInvoiced += invoiceTotal;
      totalCollected += paid;
      totalOutstanding += remaining;
      totalTax += totals.taxAmount;
      totalDiscount += totals.discount;
      totalGrossSubtotal += totals.subtotal;

      const status = getInvoiceStatus(inv.draft, invoiceTotal);
      if (status === 'Paid') {
        paidCount++;
      } else if (status === 'Overdue') {
        overdueCount++;
        overdueVal += remaining;
      } else if (status === 'Partially Paid') {
        partCount++;
      } else {
        unpaidCount++;
      }

      // Monthly aggregation
      const d = inv.draft.metadata?.issueDate ? new Date(inv.draft.metadata.issueDate) : new Date();
      const monthKey = !isNaN(d.getTime()) 
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : 'Unknown';
      const monthLabel = !isNaN(d.getTime())
        ? d.toLocaleString('default', { month: 'short', year: '2-digit' })
        : 'N/A';

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { monthLabel, invoiced: 0, collected: 0 };
      }
      monthlyMap[monthKey].invoiced += invoiceTotal;
      monthlyMap[monthKey].collected += paid;

      // Client aggregation
      const clientName = inv.draft.customer?.name?.trim() || 'Unassigned Client';
      if (!clientMap[clientName]) {
        clientMap[clientName] = { name: clientName, invoiced: 0, collected: 0, count: 0 };
      }
      clientMap[clientName].invoiced += invoiceTotal;
      clientMap[clientName].collected += paid;
      clientMap[clientName].count += 1;
    });

    // Sorted monthly trends (last 6 months or chronological)
    const sortedMonths = Object.keys(monthlyMap)
      .sort()
      .map(k => monthlyMap[k]);

    // Top clients sorted by revenue
    const topClients = Object.values(clientMap)
      .sort((a, b) => b.invoiced - a.invoiced);

    const collectionRate = totalInvoiced > 0 
      ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100)) 
      : 0;

    const avgInvoiceVal = filteredInvoices.length > 0
      ? totalInvoiced / filteredInvoices.length
      : 0;

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalTax,
      totalDiscount,
      totalGrossSubtotal,
      paidCount,
      unpaidCount,
      overdueCount,
      partCount,
      overdueVal,
      sortedMonths,
      topClients,
      collectionRate,
      avgInvoiceVal,
    };
  }, [filteredInvoices]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert('No invoice data available to export for the selected period.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Document Type',
      'Client Name',
      'Client Email',
      'Issue Date',
      'Due Date',
      'Subtotal',
      'Discount',
      'Tax Amount',
      'Total Amount',
      'Amount Paid',
      'Balance Due',
      'Status'
    ];

    const rows = filteredInvoices.map(inv => {
      const totals = calculateInvoiceTotals(inv.draft.items, inv.draft.discountType, inv.draft.discountValue, inv.tax);
      const paid = inv.draft.paidAmount || (inv.draft.status === 'Paid' ? totals.grandTotal : 0);
      const due = Math.max(0, totals.grandTotal - paid);
      const status = getInvoiceStatus(inv.draft, totals.grandTotal);

      return [
        `"${inv.draft.metadata.invoiceNumber}"`,
        `"${inv.draft.documentType || 'invoice'}"`,
        `"${(inv.draft.customer.name || '').replace(/"/g, '""')}"`,
        `"${(inv.draft.customer.email || '').replace(/"/g, '""')}"`,
        `"${inv.draft.metadata.issueDate || ''}"`,
        `"${inv.draft.metadata.dueDate || ''}"`,
        totals.subtotal.toFixed(2),
        totals.discount.toFixed(2),
        totals.taxAmount.toFixed(2),
        totals.grandTotal.toFixed(2),
        paid.toFixed(2),
        due.toFixed(2),
        `"${status}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FastInvo_Financial_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Max value for monthly chart scaling
  const maxMonthlyVal = Math.max(1, ...analytics.sortedMonths.map(m => Math.max(m.invoiced, m.collected)));

  if (isStaff) {
    return (
      <div className="space-y-6 pb-24 max-w-xl mx-auto font-sans text-center py-12">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200/60 dark:border-amber-900/50">
            <Lock className="w-8 h-8 stroke-[2]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Reports Restricted to Workspace Owner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Business-wide revenue reports, tax liability analytics, and CSV exports are reserved for Workspace Owners and Admins. Staff members have permission to create invoices, send quotations, and record payments.
            </p>
          </div>
          {onBack && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onBack}
                className="py-2.5 px-6 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs shadow-md shadow-[#0F3D2E]/20 cursor-pointer active:scale-95 transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto font-sans">
      
      {/* 1. Header Row */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="p-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-black p-0.5 border border-slate-700/50 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                <img 
                  src={FASTINVO_ICON_MARK} 
                  alt="FastInvo Logo" 
                  className="w-full h-full object-cover rounded-lg" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Fast<span className="text-emerald-500">Invo</span> Financial Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time breakdown of revenue, tax liability, cash flow, and client performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Print Summary"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Period Filter Selector */}
      <div className="no-print flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {[
          { key: 'all', label: 'All Time' },
          { key: 'this_month', label: 'This Month' },
          { key: 'last_30', label: 'Last 30 Days' },
          { key: 'this_quarter', label: 'This Quarter' },
          { key: 'this_year', label: 'This Year' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setPeriod(item.key as PeriodFilter)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              period === item.key
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 3. Four Key Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Invoiced */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Invoiced</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {formatMoney(analytics.totalInvoiced, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>{filteredInvoices.length} Invoices</span>
            <span>Avg: {formatMoney(analytics.avgInvoiceVal, currencySymbol)}</span>
          </div>
        </div>

        {/* Revenue Collected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Revenue Collected</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatMoney(analytics.totalCollected, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{analytics.collectionRate}% Collection Rate</span>
            <span>{analytics.paidCount} Fully Paid</span>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatMoney(analytics.totalOutstanding, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>{analytics.overdueCount} Overdue</span>
            <span>{analytics.unpaidCount + analytics.partCount} Pending</span>
          </div>
        </div>

        {/* Tax & Discount Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Tax/VAT Collected</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {formatMoney(analytics.totalTax, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Discounts: {formatMoney(analytics.totalDiscount, currencySymbol)}</span>
            <span>Tax Rate: {invTaxRateString(filteredInvoices)}</span>
          </div>
        </div>

      </div>

      {/* 4. Visual Analytics: Donut Status Distribution + Monthly Revenue Comparison Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Invoice Distribution by Status Donut Chart */}
        <div className="lg:col-span-5 flex flex-col">
          <InvoiceStatusDonutChart
            paidCount={analytics.paidCount}
            pendingCount={analytics.unpaidCount + analytics.partCount}
            overdueCount={analytics.overdueCount}
            totalCount={filteredInvoices.length}
            title="Invoice Distribution by Status"
            subtitle="Overview of invoices categorized as Paid, Unpaid, and Overdue."
          />
        </div>

        {/* Monthly Revenue Comparison Card (Snapshot Donut & Trend Bar Chart) */}
        {(() => {
          // Label according to period
          const periodLabelMap: Record<PeriodFilter, string> = {
            all: 'All Time Revenue',
            this_month: 'This Month Revenue',
            last_30: 'Last 30 Days Revenue',
            this_quarter: 'This Quarter Revenue',
            this_year: 'This Year Revenue'
          };

          const snapshotMonthLabel = periodLabelMap[period] || 'Revenue Snapshot';

          const snapshotInvoiced = analytics.totalInvoiced;
          const snapshotCollected = analytics.totalCollected;
          const snapshotOutstanding = analytics.totalOutstanding;

          const collectionRate = snapshotInvoiced > 0
            ? Math.min(100, Math.round((snapshotCollected / snapshotInvoiced) * 100))
            : 0;

          // Donut math
          const donutSize = 190;
          const strokeWidth = 22;
          const radius = (donutSize - strokeWidth) / 2; // 84
          const circumference = 2 * Math.PI * radius; // ~527.78

          const ratioCollected = snapshotInvoiced > 0 ? Math.min(1, snapshotCollected / snapshotInvoiced) : 0;
          const ratioRemaining = Math.max(0, 1 - ratioCollected);

          const gap = (ratioCollected > 0 && ratioRemaining > 0) ? 6 : 0;
          const collectedDash = Math.max(0, ratioCollected * circumference - gap);
          const remainingDash = Math.max(0, ratioRemaining * circumference - gap);

          const collectedOffset = 0;
          const remainingOffset = -(ratioCollected * circumference);

          return (
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              {/* Card Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    Monthly Revenue Comparison
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Invoiced vs. Collected cashflow trends
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block shrink-0" /> Invoiced
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block shrink-0" /> Collected
                    </span>
                  </div>

                  {/* View Segmented Toggle */}
                  <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => {
                        setRevenueViewMode('snapshot');
                        try { sessionStorage.setItem('fastinvo_reports_rev_view', 'snapshot'); } catch (err) { console.error(err); }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        revenueViewMode === 'snapshot'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Snapshot
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRevenueViewMode('trend');
                        try { sessionStorage.setItem('fastinvo_reports_rev_view', 'trend'); } catch (err) { console.error(err); }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        revenueViewMode === 'trend'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Trend
                    </button>
                  </div>
                </div>
              </div>

              {/* View Content Body */}
              {revenueViewMode === 'snapshot' ? (
                /* VIEW 1: Snapshot Donut View */
                <div className="pt-2 flex-1 flex flex-col items-center justify-center space-y-3 transition-opacity duration-200">
                  <div className="relative flex items-center justify-center my-1">
                    <svg width={donutSize} height={donutSize} className="transform -rotate-90 overflow-visible">
                      {snapshotInvoiced === 0 ? (
                        <circle
                          cx={donutSize / 2}
                          cy={donutSize / 2}
                          r={radius}
                          fill="transparent"
                          stroke="currentColor"
                          className="text-slate-100 dark:text-slate-800"
                          strokeWidth={strokeWidth}
                        />
                      ) : (
                        <>
                          {/* Background ring */}
                          <circle
                            cx={donutSize / 2}
                            cy={donutSize / 2}
                            r={radius}
                            fill="transparent"
                            stroke="currentColor"
                            className="text-slate-100 dark:text-slate-800/50"
                            strokeWidth={strokeWidth}
                          />

                          {/* Collected Segment (Emerald) */}
                          {ratioCollected > 0 && (
                            <circle
                              cx={donutSize / 2}
                              cy={donutSize / 2}
                              r={radius}
                              fill="transparent"
                              stroke="#10B981"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${collectedDash} ${circumference - collectedDash}`}
                              strokeDashoffset={collectedOffset}
                              strokeLinecap="round"
                              className="transition-all duration-700 ease-out"
                            />
                          )}

                          {/* Remaining Invoiced Segment (Indigo) */}
                          {ratioRemaining > 0 && (
                            <circle
                              cx={donutSize / 2}
                              cy={donutSize / 2}
                              r={radius}
                              fill="transparent"
                              stroke="#4F46E5"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${remainingDash} ${circumference - remainingDash}`}
                              strokeDashoffset={remainingOffset}
                              strokeLinecap="round"
                              className="transition-all duration-700 ease-out"
                            />
                          )}
                        </>
                      )}
                    </svg>

                    {/* Donut Center Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-sans">
                        {collectionRate}%
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                        Collected of Invoiced
                      </span>
                    </div>
                  </div>

                  {/* Below Donut Labels */}
                  <div className="text-center space-y-1">
                    <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {snapshotMonthLabel}
                    </div>
                    <div className="flex items-center justify-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>
                        Invoiced: <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold font-mono">{formatMoney(snapshotInvoiced, profile.currency.symbol)}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>
                        Collected: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">{formatMoney(snapshotCollected, profile.currency.symbol)}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>
                        Due: <strong className="text-amber-600 dark:text-amber-400 font-extrabold font-mono">{formatMoney(snapshotOutstanding, profile.currency.symbol)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* VIEW 2: Trend Bar Chart View */
                analytics.sortedMonths.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    No invoice data recorded for this period. Create invoices to generate visual trend charts.
                  </div>
                ) : (
                  <div className="pt-2 space-y-4 flex-1 flex flex-col justify-end transition-opacity duration-200">
                    <div className="h-48 flex items-end justify-around gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                      {analytics.sortedMonths.map((m, idx) => {
                        const invHeightPct = Math.max(8, Math.round((m.invoiced / maxMonthlyVal) * 100));
                        const colHeightPct = Math.max(8, Math.round((m.collected / maxMonthlyVal) * 100));

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                            {/* Tooltip on hover */}
                            <div className="absolute -top-12 bg-slate-900 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20 whitespace-nowrap">
                              Invoiced: {formatMoney(m.invoiced, profile.currency.symbol)} | Paid: {formatMoney(m.collected, profile.currency.symbol)}
                            </div>

                            <div className="w-full flex items-end justify-center gap-1 max-w-[48px] h-full">
                              {/* Invoiced Bar */}
                              <div 
                                style={{ height: `${invHeightPct}%` }} 
                                className="w-1/2 bg-indigo-600 dark:bg-indigo-500 rounded-t-md transition-all duration-500 group-hover:brightness-110"
                              />
                              {/* Collected Bar */}
                              <div 
                                style={{ height: `${colHeightPct}%` }} 
                                className="w-1/2 bg-emerald-500 dark:bg-emerald-400 rounded-t-md transition-all duration-500 group-hover:brightness-110"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-full">
                              {m.monthLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          );
        })()}

      </div>

      {/* 5. Two-Column Layout: Top Clients & Financial Accounting Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Clients Leaderboard (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Top Client Leaderboard
              </h3>
            </div>
            <button
              onClick={onGoToClients}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Manage Clients &rarr;
            </button>
          </div>

          {analytics.topClients.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">No client sales recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {analytics.topClients.slice(0, 5).map((c, idx) => {
                const paidRate = c.invoiced > 0 ? Math.round((c.collected / c.invoiced) * 100) : 0;
                return (
                  <div 
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate block">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {c.count} {c.count === 1 ? 'Invoice' : 'Invoices'} &bull; {paidRate}% Paid
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono block">
                        {formatMoney(c.invoiced, profile.currency.symbol)}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                        {formatMoney(c.collected, profile.currency.symbol)} Rec.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tax & Financial Ledger (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Tax & Accounting Ledger
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Gross Subtotal</span>
              <span className="font-bold font-mono">{formatMoney(analytics.totalGrossSubtotal, profile.currency.symbol)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-rose-600 dark:text-rose-400">
              <span>Total Discounts Given</span>
              <span className="font-bold font-mono">- {formatMoney(analytics.totalDiscount, profile.currency.symbol)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Net Taxable Revenue</span>
              <span className="font-bold font-mono">{formatMoney(analytics.totalGrossSubtotal - analytics.totalDiscount, profile.currency.symbol)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
              <span>Tax / VAT Accrued</span>
              <span className="font-bold font-mono">+ {formatMoney(analytics.totalTax, profile.currency.symbol)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm font-black border-t-2 border-slate-900 dark:border-slate-100 pt-2">
              <span>Grand Total Invoiced</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(analytics.totalInvoiced, profile.currency.symbol)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 6. Detailed Invoices Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Invoice Audit Records
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual breakdown of all invoices in this report
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search invoice or client..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {searchedInvoices.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 italic">No invoice records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Invoice #</th>
                  <th className="pb-3 font-semibold">Client</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 text-right font-semibold">Total</th>
                  <th className="pb-3 text-right font-semibold">Paid</th>
                  <th className="pb-3 text-right font-semibold">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {searchedInvoices.map(inv => {
                  const totals = calculateInvoiceTotals(
                    inv.draft?.items || [], 
                    inv.draft?.discountType || 'percentage', 
                    inv.draft?.discountValue || 0, 
                    inv.tax || { taxEnabled: false, taxRate: 0, taxInclusive: false }
                  );
                  const paid = inv.draft?.paidAmount || (inv.draft?.status === 'Paid' ? totals.grandTotal : 0);
                  const due = Math.max(0, totals.grandTotal - paid);
                  const status = getInvoiceStatus(inv.draft || ({} as any), totals.grandTotal);

                  return (
                    <tr 
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {inv.draft?.metadata?.invoiceNumber || 'INV-000'}
                      </td>
                      <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                        {inv.draft?.customer?.name || 'Unassigned'}
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">
                        {inv.draft?.metadata?.issueDate || 'N/A'}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-block ${
                          status === 'Paid'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : status === 'Overdue'
                            ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : status === 'Partially Paid'
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold">
                        {formatMoney(totals.grandTotal, currencySymbol)}
                      </td>
                      <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatMoney(paid, currencySymbol)}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-900 dark:text-slate-100 font-bold">
                        {formatMoney(due, currencySymbol)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function invTaxRateString(invoices: SavedInvoice[]): string {
  if (invoices.length === 0) return '0%';
  const rate = invoices[0].tax?.taxRate || 0;
  return `${rate}%`;
}

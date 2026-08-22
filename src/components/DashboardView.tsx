import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  TrendingUp, 
  TrendingDown,
  ChevronDown, 
  Plus, 
  ArrowUpRight, 
  Receipt,
  Sparkles,
  Calendar,
  Users,
  FileText,
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  PieChart,
  ArrowRight,
  CheckCheck,
  Send,
  Settings as SettingsIcon
} from 'lucide-react';
import { SavedInvoice, BusinessProfile, Client } from '../types';
import { formatMoney } from '../constants';
import { calculateInvoiceTotals, getInvoiceStatus, ComputedStatus, shouldShowReminder } from '../utils/calculations';
import { InvoiceStatusDonutChart } from './InvoiceStatusDonutChart';
import RemindClientModal from './RemindClientModal';
import { FASTINVO_ICON_MARK } from '../assets/logo';

interface DashboardViewProps {
  invoices: SavedInvoice[];
  profile: BusinessProfile;
  clients: Client[];
  onNewInvoice: () => void;
  onSelectInvoice: (invoice: SavedInvoice) => void;
  onGoToClients: () => void;
  onGoToHistory: (statusFilter?: string) => void;
  onGoToSettings?: () => void;
}

export default function DashboardView({
  invoices,
  profile,
  clients,
  onNewInvoice,
  onSelectInvoice,
  onGoToClients,
  onGoToHistory,
  onGoToSettings,
}: DashboardViewProps) {
  const [showBellNotice, setShowBellNotice] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [remindInvoice, setRemindInvoice] = useState<SavedInvoice | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleMarkAllAsRead = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allIds = notificationsList.map(n => n.id);
    const updated = Array.from(new Set([...readNotificationIds, ...allIds]));
    setReadNotificationIds(updated);
    try {
      localStorage.setItem('fastinvo_read_notifications', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (readNotificationIds.includes(id)) return;
    const updated = [...readNotificationIds, id];
    setReadNotificationIds(updated);
    try {
      localStorage.setItem('fastinvo_read_notifications', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const currencySymbol = profile?.currency?.symbol || '$';
  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

  // Compute status distributions & financial totals
  let totalInvoiced = 0;
  let totalReceived = 0;
  let totalOutstanding = 0;

  let paidValue = 0;
  let partiallyPaidValue = 0;
  let unpaidValue = 0;
  let overdueValue = 0;

  let paidCount = 0;
  let partiallyPaidCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;

  const notificationsList: { id: string; title: string; subtitle: string; type: 'overdue' | 'payment'; inv?: SavedInvoice }[] = [];

  (invoices || []).forEach((inv) => {
    if (!inv || !inv.draft) return;
    // Quotations do not count towards invoiced/received revenue until converted to invoice
    if (inv.draft.documentType === 'quotation') return;

    const { grandTotal } = calculateInvoiceTotals(
      inv.draft.items || [], 
      inv.draft.discountType || 'percentage', 
      inv.draft.discountValue || 0, 
      inv.tax || { taxEnabled: false, taxRate: 0, taxInclusive: false }
    );
    const paidAmount = inv.draft.paidAmount || (inv.draft.status === 'Paid' ? grandTotal : 0);
    const balanceDue = Math.max(0, grandTotal - paidAmount);

    const status = getInvoiceStatus(inv.draft, grandTotal);

    totalInvoiced += grandTotal;
    totalReceived += paidAmount;
    totalOutstanding += balanceDue;

    if (status === 'Paid') {
      paidValue += grandTotal;
      paidCount++;
      if (paidAmount > 0) {
        notificationsList.push({
          id: `pay-${inv.id}`,
          title: `Payment received: ${formatMoney(paidAmount, currencySymbol)}`,
          subtitle: `${inv.draft.customer?.name || 'Client'} (${inv.draft.metadata?.invoiceNumber || 'INV'})`,
          type: 'payment',
          inv,
        });
      }
    } else if (status === 'Partially Paid') {
      partiallyPaidValue += balanceDue;
      partiallyPaidCount++;
      notificationsList.push({
        id: `part-${inv.id}`,
        title: `Partial payment: ${formatMoney(paidAmount, currencySymbol)} received`,
        subtitle: `${formatMoney(balanceDue, currencySymbol)} remaining for ${inv.draft.metadata?.invoiceNumber || 'INV'}`,
        type: 'payment',
        inv,
      });
    } else if (status === 'Overdue') {
      overdueValue += balanceDue;
      overdueCount++;
      notificationsList.push({
        id: `over-${inv.id}`,
        title: `Overdue: ${inv.draft.metadata?.invoiceNumber || 'INV'} (${formatMoney(balanceDue, currencySymbol)})`,
        subtitle: `Due date passed for ${inv.draft.customer?.name || 'Client'}`,
        type: 'overdue',
        inv,
      });
    } else {
      unpaidValue += balanceDue;
      unpaidCount++;
    }
  });

  const unreadNotifications = notificationsList.filter(item => !readNotificationIds.includes(item.id));
  const badgeCount = unreadNotifications.length;

  // Donut chart calculations
  const totalChartVal = paidValue + partiallyPaidValue + unpaidValue + overdueValue;

  const statusSegments = [
    {
      status: 'Paid',
      label: 'Paid',
      value: paidValue,
      count: paidCount,
      color: '#10B981', // Emerald
      bgClass: 'bg-emerald-500',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      icon: CheckCircle,
    },
    {
      status: 'Partially Paid',
      label: 'Partially Paid',
      value: partiallyPaidValue,
      count: partiallyPaidCount,
      color: '#F59E0B', // Amber
      bgClass: 'bg-amber-500',
      textClass: 'text-amber-700 dark:text-amber-400',
      icon: PieChart,
    },
    {
      status: 'Unpaid',
      label: 'Unpaid',
      value: unpaidValue,
      count: unpaidCount,
      color: '#64748B', // Slate/Tan
      bgClass: 'bg-slate-500',
      textClass: 'text-slate-700 dark:text-slate-300',
      icon: Clock,
    },
    {
      status: 'Overdue',
      label: 'Overdue',
      value: overdueValue,
      count: overdueCount,
      color: '#EF4444', // Rose/Red
      bgClass: 'bg-rose-500',
      textClass: 'text-rose-700 dark:text-rose-400',
      icon: AlertTriangle,
    },
  ];

  // First run empty state
  const isFirstRun = invoices.length === 0;

  return (
    <div className="space-y-5 pb-24 max-w-3xl mx-auto font-sans">
      
      {/* 1. Top Header Row: Business Name & Logo (Left) + Notification Bell (Right) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-black p-0.5 border border-slate-700/60 shadow-md shadow-slate-900/20 overflow-hidden flex items-center justify-center shrink-0">
            <img 
              src={FASTINVO_ICON_MARK} 
              alt="FastInvo Logo" 
              className="w-full h-full object-cover rounded-xl" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base text-slate-900 dark:text-slate-100 tracking-tight block leading-none">
                Fast<span className="text-emerald-500">Invo</span>
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Official
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">
              {profile.companyName || 'Business Suite'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Button */}
          {onGoToSettings && (
            <button
              type="button"
              onClick={onGoToSettings}
              id="dashboard-settings-btn"
              className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Settings & Workspace Configuration"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4.5 h-4.5 stroke-[1.8]" />
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowBellNotice(!showBellNotice)}
              className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5 stroke-[2]" />
              {badgeCount > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                </>
              )}
            </button>

            {/* Notification Popover */}
            {showBellNotice && (
              <div className="absolute right-0 top-11 z-50 w-80 sm:w-84 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3 text-xs font-semibold animate-scaleUp">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bell className="w-4 h-4 text-[#0F3D2E] dark:text-emerald-400 shrink-0" />
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 truncate">Live Activity & Alerts</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                      {badgeCount} unread
                    </span>
                    {badgeCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-emerald-800 dark:text-emerald-200 font-extrabold bg-emerald-100 dark:bg-emerald-900/80 hover:bg-emerald-200 dark:hover:bg-emerald-800 px-2 py-0.5 rounded-full cursor-pointer flex items-center gap-1 border border-emerald-300/60 dark:border-emerald-700 transition-all active:scale-95"
                        title="Mark all notifications as read"
                      >
                        <CheckCheck className="w-3 h-3 stroke-[2.5]" />
                        <span>Read All</span>
                      </button>
                    )}
                  </div>
                </div>

                {notificationsList.length === 0 ? (
                  <p className="text-slate-500 text-[11px] text-center py-2">
                    All caught up! No overdue invoices or recent updates.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {notificationsList.map((item) => {
                      const isRead = readNotificationIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            handleMarkAsRead(item.id);
                            setShowBellNotice(false);
                            if (item.inv) onSelectInvoice(item.inv);
                            else onGoToHistory();
                          }}
                          className={`p-2.5 rounded-xl transition-all border flex items-start gap-2.5 cursor-pointer ${
                            isRead
                              ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-60'
                              : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {item.type === 'overdue' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                                {item.title}
                              </p>
                              {!isRead && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block" title="Unread" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {item.subtitle}
                            </p>
                            {item.inv && item.type === 'overdue' && (
                              <div className="mt-1.5 pt-1 border-t border-rose-200/50 dark:border-rose-900/50 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRemindInvoice(item.inv!);
                                    setShowBellNotice(false);
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>Remind Client</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowBellNotice(false);
                    onGoToHistory();
                  }}
                  className="w-full text-center py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer block"
                >
                  View All Invoices →
                </button>
              </div>
            )}
          </div>

          {/* More Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              aria-label="Options Menu"
            >
              <MoreHorizontal className="w-5 h-5 stroke-[2]" />
            </button>

            {showMenuDropdown && (
              <div className="absolute right-0 top-11 z-50 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-1.5 space-y-1 text-xs font-semibold animate-scaleUp">
                <button
                  onClick={() => { setShowMenuDropdown(false); onNewInvoice(); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#0F3D2E]" />
                  <span>New Invoice</span>
                </button>
                <button
                  onClick={() => { setShowMenuDropdown(false); onGoToHistory(); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>All Invoices</span>
                </button>
                <button
                  onClick={() => { setShowMenuDropdown(false); onGoToClients(); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Manage Clients</span>
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  onClick={() => { setShowMenuDropdown(false); onGoToHistory('Paid'); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer text-[11px]"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Filter Paid Invoices</span>
                </button>
                <button
                  onClick={() => { setShowMenuDropdown(false); onGoToHistory('Unpaid'); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer text-[11px]"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter Unpaid Invoices</span>
                </button>
                <button
                  onClick={() => { setShowMenuDropdown(false); onGoToHistory('Overdue'); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer text-[11px]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Filter Overdue Invoices</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Card (Emerald Gradient): Total Outstanding Balance */}
      <div className="rounded-[24px] bg-gradient-to-br from-[#0F3D2E] via-[#164E3B] to-[#1E5C46] text-white p-6 shadow-xl shadow-[#0F3D2E]/15 space-y-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/90 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            Total Outstanding Balance
          </span>
          <span className="text-[11px] font-bold bg-white/15 px-3 py-1 rounded-full text-emerald-100 backdrop-blur-xs">
            Live Cashflow
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <div className="text-3xl sm:text-4xl font-black tracking-tight font-sans text-white">
            {formatMoney(totalOutstanding, currencySymbol)}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-300 bg-emerald-950/70 px-2.5 py-1 rounded-full border border-emerald-500/30 shrink-0">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+12.4% vs last mo</span>
          </span>
        </div>

        <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100/90 font-medium">
          <span>{invoices.length} Total Issued Invoices</span>
          <span>{formatMoney(totalReceived, currencySymbol)} Received to Date</span>
        </div>
      </div>

      {/* First-Run Empty State OR Status Distribution Donut + Compact Monthly Row */}
      {isFirstRun ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-8 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 text-[#0F3D2E] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/60">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Welcome to FastInvo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              At a glance, you&apos;ll see your cash flow, payment status distribution, and monthly breakdown right here. Create your first invoice in seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewInvoice}
            className="py-3 px-6 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs transition-all shadow-md shadow-[#0F3D2E]/20 inline-flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-300 stroke-[3]" />
            <span>Create your first invoice</span>
          </button>
        </div>
      ) : (
        <>
          {/* Status Distribution Donut Chart Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-5">
            <InvoiceStatusDonutChart
              paidCount={paidCount}
              partiallyPaidCount={partiallyPaidCount}
              unpaidCount={unpaidCount}
              overdueCount={overdueCount}
              totalCount={invoices.length}
              paidValue={paidValue}
              partiallyPaidValue={partiallyPaidValue}
              unpaidValue={unpaidValue}
              overdueValue={overdueValue}
              currencySymbol={currencySymbol}
              onSelectStatus={(status) => onGoToHistory(status)}
              title="Invoice Distribution by Status"
              subtitle="Overview of invoices categorized as Paid, Partially Paid, Unpaid, and Overdue."
            />

            {/* Re-added Detailed Breakdown Options List */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>All Status Options</span>
                <span className="text-[10px] text-slate-400">Tap option to filter invoices</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {statusSegments.map((seg) => {
                  const IconComponent = seg.icon;
                  const pct = totalChartVal > 0 ? ((seg.value / totalChartVal) * 100).toFixed(1) : '0.0';

                  return (
                    <div
                      key={seg.status}
                      onClick={() => onGoToHistory(seg.status)}
                      className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-98"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-white"
                          style={{ backgroundColor: seg.color }}
                        >
                          <IconComponent className="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                              {seg.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              ({seg.count})
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 block">
                            {pct}% of volume
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono block">
                          {formatMoney(seg.value, currencySymbol)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Compact "This Month" Summary Row */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                {currentMonthName} Summary
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Calculated Metrics
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-right">
              {/* Invoiced Column */}
              <div className="text-left space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Invoiced
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 font-mono block">
                  {formatMoney(totalInvoiced, currencySymbol)}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>+8.5%</span>
                </span>
              </div>

              {/* Received Column */}
              <div className="text-left space-y-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Received
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 font-mono block">
                  {formatMoney(totalReceived, currencySymbol)}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>+14.2%</span>
                </span>
              </div>

              {/* Outstanding Column */}
              <div className="text-left space-y-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Outstanding
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 font-mono block">
                  {formatMoney(totalOutstanding, currencySymbol)}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-2.5 h-2.5" />
                  <span>-3.1%</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remind Client Modal */}
      {remindInvoice && (
        <RemindClientModal
          isOpen={!!remindInvoice}
          onClose={() => setRemindInvoice(null)}
          draft={remindInvoice.draft}
          profile={profile}
          tax={remindInvoice.tax}
        />
      )}

    </div>
  );
}

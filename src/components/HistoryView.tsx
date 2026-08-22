import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Receipt, 
  Plus, 
  Eye, 
  Trash2, 
  Copy,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  PieChart,
  ArrowUpDown,
  X,
  Undo2,
  Bell,
  MoreHorizontal,
  Pencil,
  CheckSquare,
  Square,
  Check,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { SavedInvoice, BusinessProfile, AuthUser } from '../types';
import { formatMoney } from '../constants';
import { calculateInvoiceTotals, getInvoiceStatus, ComputedStatus, shouldShowReminder } from '../utils/calculations';
import RemindClientModal from './RemindClientModal';

interface HistoryViewProps {
  savedInvoices: SavedInvoice[];
  profile: BusinessProfile;
  currentUser?: AuthUser | null;
  initialStatusFilter?: string;
  onSelectInvoice: (invoice: SavedInvoice) => void;
  onEditInvoice?: (invoice: SavedInvoice) => void;
  onDeleteInvoice: (id: string) => void;
  onNewInvoice: () => void;
  onDuplicateInvoice?: (invoice: SavedInvoice) => void;
  onRecordPaymentForInvoice?: (invoice: SavedInvoice) => void;
  onConvertQuoteToInvoice?: (invoice: SavedInvoice) => void;
  onBack?: () => void;
}

export default function HistoryView({
  savedInvoices = [],
  profile,
  currentUser = null,
  initialStatusFilter = 'All',
  onSelectInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onNewInvoice,
  onDuplicateInvoice,
  onRecordPaymentForInvoice,
  onConvertQuoteToInvoice,
  onBack
}: HistoryViewProps) {
  const currencySymbol = profile?.currency?.symbol || '$';
  const isStaff = currentUser?.role === 'staff';
  const [docTypeTab, setDocTypeTab] = useState<'all' | 'invoice' | 'quotation'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(initialStatusFilter);
  const [sortOption, setSortOption] = useState<'date' | 'amount' | 'status'>('date');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'this_month' | 'last_30'>('all');
  const [minAmountFilter, setMinAmountFilter] = useState<string>('');
  const [maxAmountFilter, setMaxAmountFilter] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [remindInvoice, setRemindInvoice] = useState<SavedInvoice | null>(null);

  // Undo Delete Buffer for single and bulk deletes
  const [undoBuffer, setUndoBuffer] = useState<{ invoices: SavedInvoice[]; timeoutId: any } | null>(null);

  useEffect(() => {
    if (initialStatusFilter) {
      setFilterStatus(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Handle Non-Destructive Delete with Undo Toast (supports array of items)
  const handleDeleteMultipleWithUndo = (invoicesToDelete: SavedInvoice[]) => {
    if (invoicesToDelete.length === 0) return;

    // If there's an existing undo pending, commit it immediately
    if (undoBuffer) {
      clearTimeout(undoBuffer.timeoutId);
      undoBuffer.invoices.forEach(inv => onDeleteInvoice(inv.id));
    }

    const timeoutId = setTimeout(() => {
      invoicesToDelete.forEach(inv => onDeleteInvoice(inv.id));
      setUndoBuffer(null);
    }, 4500);

    setUndoBuffer({ invoices: invoicesToDelete, timeoutId });
    setSelectedIds([]);
  };

  const handleUndoDelete = () => {
    if (undoBuffer) {
      clearTimeout(undoBuffer.timeoutId);
      setUndoBuffer(null);
      setToastMessage('Documents restored successfully.');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Filter logic
  const filtered = (savedInvoices || []).filter((inv) => {
    if (!inv || !inv.draft) return false;

    // Exclude the pending soft-deleted items from visible list
    if (undoBuffer && undoBuffer.invoices.some(u => u.id === inv.id)) {
      return false;
    }

    const isQuote = inv.draft.documentType === 'quotation';

    // Document Type Filter
    if (docTypeTab === 'invoice' && isQuote) return false;
    if (docTypeTab === 'quotation' && !isQuote) return false;

    const { grandTotal } = calculateInvoiceTotals(
      inv.draft.items || [],
      inv.draft.discountType || 'percentage',
      inv.draft.discountValue || 0,
      inv.tax || { taxEnabled: false, taxRate: 0, taxInclusive: false }
    );
    const computedStatus = getInvoiceStatus(inv.draft, grandTotal);

    // Status Filter
    if (filterStatus !== 'All') {
      if (isQuote) {
        const qStatus = inv.draft.quotationStatus || 'Draft';
        if (filterStatus !== qStatus) return false;
      } else {
        if (filterStatus === 'Paid' && computedStatus !== 'Paid') return false;
        if (filterStatus === 'Partially Paid' && computedStatus !== 'Partially Paid') return false;
        if (filterStatus === 'Unpaid' && computedStatus !== 'Unpaid') return false;
        if (filterStatus === 'Overdue' && computedStatus !== 'Overdue') return false;
      }
    }

    // Amount Range Filter
    if (minAmountFilter && grandTotal < parseFloat(minAmountFilter)) return false;
    if (maxAmountFilter && grandTotal > parseFloat(maxAmountFilter)) return false;

    // Search query
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;

    const amountStr = grandTotal.toString();
    const invNum = (inv.draft.metadata?.invoiceNumber || '').toLowerCase();
    const quoNum = (inv.draft.metadata?.quotationNumber || '').toLowerCase();
    const custName = (inv.draft.customer?.name || '').toLowerCase();
    const custEmail = (inv.draft.customer?.email || '').toLowerCase();

    return (
      custName.includes(query) ||
      custEmail.includes(query) ||
      invNum.includes(query) ||
      quoNum.includes(query) ||
      amountStr.includes(query)
    );
  });

  // Sort Logic
  const sorted = [...filtered].sort((a, b) => {
    const totalsA = calculateInvoiceTotals(
      a.draft?.items || [], 
      a.draft?.discountType || 'percentage', 
      a.draft?.discountValue || 0, 
      a.tax || { taxEnabled: false, taxRate: 0, taxInclusive: false }
    );
    const totalsB = calculateInvoiceTotals(
      b.draft?.items || [], 
      b.draft?.discountType || 'percentage', 
      b.draft?.discountValue || 0, 
      b.tax || { taxEnabled: false, taxRate: 0, taxInclusive: false }
    );

    if (sortOption === 'amount') {
      return totalsB.grandTotal - totalsA.grandTotal;
    } else if (sortOption === 'status') {
      return (a.draft?.status || '').localeCompare(b.draft?.status || '');
    } else {
      // Date descending
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }
  });

  // Selection handlers
  const handleToggleSelectAll = () => {
    const visibleIds = sorted.map(inv => inv.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    const invoicesToDelete = savedInvoices.filter(inv => selectedIds.includes(inv.id));
    if (invoicesToDelete.length === 0) return;
    handleDeleteMultipleWithUndo(invoicesToDelete);
  };

  const handleRemindClick = (inv: SavedInvoice) => {
    setRemindInvoice(inv);
  };

  const allVisibleSelected = sorted.length > 0 && sorted.every(inv => selectedIds.includes(inv.id));
  const someVisibleSelected = sorted.some(inv => selectedIds.includes(inv.id));

  return (
    <div className="space-y-4 pb-28 max-w-3xl mx-auto font-sans relative">

      {/* Screen Title & Add CTA Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Invoice History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {savedInvoices.length} total invoice{savedInvoices.length !== 1 ? 's' : ''} stored
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewInvoice}
          className="py-2.5 px-4 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs transition-all shadow-md shadow-[#0F3D2E]/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 text-emerald-300 stroke-[3]" />
          <span>+ Create New</span>
        </button>
      </div>

      {/* Document Type Selector Tabs: All | Invoices | Quotations */}
      <div className="p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => { setDocTypeTab('all'); setFilterStatus('All'); }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            docTypeTab === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          All Documents
        </button>
        <button
          type="button"
          onClick={() => { setDocTypeTab('invoice'); setFilterStatus('All'); }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            docTypeTab === 'invoice'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Invoices
        </button>
        <button
          type="button"
          onClick={() => { setDocTypeTab('quotation'); setFilterStatus('All'); }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            docTypeTab === 'quotation'
              ? 'bg-[#0F3D2E] text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Quotations
        </button>
      </div>

      {/* 1. Search Bar Pinned at Top */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for Invoice"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F3D2E] shadow-2xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilterModal(true)}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0 ${
            minAmountFilter || maxAmountFilter || dateRangeFilter !== 'all'
              ? 'bg-[#0F3D2E] text-white border-[#0F3D2E]'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
          aria-label="Filter"
          title="Filter Sheet"
        >
          <Filter className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* 2. Status Chip Filter Row directly under search */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {(docTypeTab === 'quotation'
          ? ['All', 'Draft', 'Sent', 'Accepted', 'Declined', 'Expired']
          : ['All', 'Paid', 'Partially Paid', 'Unpaid', 'Overdue']
        ).map((st) => {
          const isActive = filterStatus === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shadow-2xs border ${
                isActive
                  ? 'bg-[#0F3D2E] text-white border-[#0F3D2E]'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          );
        })}
      </div>

      {/* List Header Bar: Multi-Select Toggle + Count + Sort Selector */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1">
        <div className="flex items-center gap-2">
          {sorted.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:text-emerald-700 cursor-pointer"
            >
              {allVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-[#0F3D2E] dark:text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{allVisibleSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          <span>Showing {sorted.length} invoice{sorted.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="bg-transparent text-xs font-extrabold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="date">Sort: Date (Newest)</option>
            <option value="amount">Sort: Amount (High-Low)</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="bg-[#0F3D2E] text-white rounded-2xl p-3 shadow-lg flex items-center justify-between gap-3 animate-slideUp">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-extrabold">
              {selectedIds.length} invoice{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>

            {!isStaff ? (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="py-1.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bulk Delete ({selectedIds.length})</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-emerald-200 bg-white/10 px-2.5 py-1 rounded-xl">
                Staff (Delete restricted)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Invoice/Quotation Cards List */}
      {sorted.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            No invoices match your search
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('All');
              setMinAmountFilter('');
              setMaxAmountFilter('');
              setDateRangeFilter('all');
            }}
            className="text-xs font-bold text-[#0F3D2E] dark:text-emerald-400 underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((inv) => {
            const isQuote = inv.draft?.documentType === 'quotation';
            const { grandTotal } = calculateInvoiceTotals(
              inv.draft?.items || [],
              inv.draft?.discountType || 'percentage',
              inv.draft?.discountValue || 0,
              inv.tax || { taxEnabled: false, taxRate: 0, taxInclusive: false }
            );
            const paidAmount = inv.draft?.paidAmount || (inv.draft?.status === 'Paid' ? grandTotal : 0);
            const computedStatus = getInvoiceStatus(inv.draft || ({} as any), grandTotal);

            const isSelected = selectedIds.includes(inv.id);

            const clientInitials = inv.draft?.customer?.name
              ? inv.draft.customer.name.charAt(0).toUpperCase()
              : 'C';

            return (
              <div
                key={inv.id}
                className={`bg-white dark:bg-slate-900 border rounded-[22px] p-4 shadow-2xs space-y-3 transition-all relative ${
                  isSelected
                    ? 'border-[#0F3D2E] ring-2 ring-[#0F3D2E]/20 bg-emerald-50/10 dark:bg-emerald-950/10'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Main Card Body */}
                <div
                  onClick={() => onSelectInvoice(inv)}
                  className="space-y-2.5 cursor-pointer"
                >
                  {/* Top Row: Multi-selection checkbox + Client Logo/Avatar + Name/Email + Status Pill */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectOne(inv.id, e)}
                        className="p-1 text-slate-400 hover:text-[#0F3D2E] dark:hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                        title={isSelected ? 'Deselect invoice' : 'Select invoice'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#0F3D2E] dark:text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                        )}
                      </button>

                      {/* Client Logo / Avatar */}
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-[#0F3D2E] dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-slate-200/60 overflow-hidden">
                        {inv.profile?.logo ? (
                          <img
                            src={inv.profile.logo}
                            alt={inv.draft?.customer?.name || 'Client'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{clientInitials}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                            {inv.draft?.customer?.name || 'Recipient Client'}
                          </h3>
                          {isQuote && (
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">
                              Quote
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium truncate">
                          {inv.draft?.customer?.email || inv.draft?.customer?.phone || 'No email provided'}
                        </p>
                      </div>
                    </div>

                    {/* Status Chip pairing Color + Icon + Label (Never color alone) */}
                    <div className="shrink-0">
                      {isQuote ? (
                        (() => {
                          const qStatus = inv.draft?.quotationStatus || 'Draft';
                          const statusColors: Record<string, string> = {
                            Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                            Sent: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                            Accepted: 'bg-emerald-600 text-white',
                            Declined: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                            Expired: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                          };
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${statusColors[qStatus] || statusColors.Draft}`}>
                              Quote: {qStatus}
                            </span>
                          );
                        })()
                      ) : (
                        <>
                          {computedStatus === 'Paid' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Paid</span>
                            </span>
                          )}

                          {computedStatus === 'Partially Paid' && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                              <PieChart className="w-3 h-3 text-amber-600" />
                              <span>Partially Paid</span>
                            </span>
                          )}

                          {computedStatus === 'Unpaid' && (
                            <span className="inline-flex items-center gap-1 bg-[#EFECE6] text-[#7A6038] dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                              <Clock className="w-3 h-3 text-[#7A6038]" />
                              <span>Unpaid</span>
                            </span>
                          )}

                          {computedStatus === 'Overdue' && (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Overdue</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Thin Divider under top row */}
                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Bottom Row: 3 Columns (Amount | No | Date) */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        {isQuote ? 'Estimated Total' : 'Amount'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight block mt-0.5">
                        {computedStatus === 'Partially Paid'
                          ? `${formatMoney(paidAmount, currencySymbol)} of ${formatMoney(grandTotal, currencySymbol)}`
                          : formatMoney(grandTotal, currencySymbol)}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        No
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300 font-mono block mt-0.5">
                        #{isQuote
                          ? (inv.draft?.metadata?.quotationNumber || inv.draft?.metadata?.invoiceNumber || 'QUO-1001')
                          : (inv.draft?.metadata?.invoiceNumber || 'INV-1001')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        {isQuote ? 'Valid Until' : 'Date'}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mt-0.5">
                        {isQuote
                          ? (inv.draft?.metadata?.validUntil || '14 Days')
                          : (inv.draft?.metadata?.issueDate || 'Recent')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Footer Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {onEditInvoice && (
                      <button
                        type="button"
                        onClick={() => onEditInvoice(inv)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-bold text-[11px] hover:bg-indigo-100 dark:hover:bg-indigo-900 cursor-pointer flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800"
                        title="Amend or edit details"
                      >
                        <Pencil className="w-3 h-3 stroke-[2.2]" />
                        <span>Amend / Edit</span>
                      </button>
                    )}

                    {isQuote && onConvertQuoteToInvoice && !inv.draft.convertedInvoiceNumber && (
                      <button
                        type="button"
                        onClick={() => onConvertQuoteToInvoice(inv)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-200" />
                        <span>Convert to Invoice</span>
                      </button>
                    )}

                    {!isQuote && computedStatus !== 'Paid' && onRecordPaymentForInvoice && (
                      <button
                        type="button"
                        onClick={() => onRecordPaymentForInvoice(inv)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] hover:bg-emerald-100 cursor-pointer border border-emerald-200/60"
                      >
                        Record Payment
                      </button>
                    )}

                    {!isQuote && computedStatus !== 'Paid' && (
                      <button
                        type="button"
                        onClick={() => handleRemindClick(inv)}
                        className="px-2 py-1.5 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Remind</span>
                      </button>
                    )}

                    {onDuplicateInvoice && (
                      <button
                        type="button"
                        onClick={() => onDuplicateInvoice(inv)}
                        className="px-2 py-1.5 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Duplicate</span>
                      </button>
                    )}
                  </div>

                  {/* Delete Action with Undo (Admin only) */}
                  {!isStaff && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMultipleWithUndo([inv])}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                      title="Delete invoice (Admin only)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Floating Undo Toast Banner */}
      {undoBuffer && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 border border-slate-700 animate-slideUp">
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {undoBuffer.invoices.length === 1
                  ? `Invoice #${undoBuffer.invoices[0].draft.metadata.invoiceNumber || 'INV'} deleted`
                  : `${undoBuffer.invoices.length} invoices deleted`}
              </p>
              <p className="text-[10px] text-slate-400">Invoice deleted — Undo</p>
            </div>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          </div>
        </div>
      )}

      {/* General Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white text-xs font-extrabold py-2 px-4 rounded-full shadow-lg border border-emerald-700 animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* Filter Modal Sheet */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 max-w-md w-full space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Filter Invoices
              </h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              {/* Status Section */}
              <div className="space-y-2">
                <label className="text-slate-400 uppercase tracking-wider text-[10px] block">
                  Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['All', 'Paid', 'Partially Paid', 'Unpaid', 'Overdue'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer ${
                        filterStatus === st
                          ? 'bg-[#0F3D2E] text-white border-[#0F3D2E]'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Range Section */}
              <div className="space-y-2">
                <label className="text-slate-400 uppercase tracking-wider text-[10px] block">
                  Amount Range ({profile.currency.symbol})
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min amount"
                    value={minAmountFilter}
                    onChange={(e) => setMinAmountFilter(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Max amount"
                    value={maxAmountFilter}
                    onChange={(e) => setMaxAmountFilter(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('All');
                  setMinAmountFilter('');
                  setMaxAmountFilter('');
                  setDateRangeFilter('all');
                  setShowFilterModal(false);
                }}
                className="w-1/2 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 font-extrabold text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="w-1/2 py-3 rounded-2xl bg-[#0F3D2E] text-white font-extrabold text-xs cursor-pointer shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
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

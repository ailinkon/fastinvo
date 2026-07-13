import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  User, 
  Trash2, 
  ArrowUpRight, 
  FileText, 
  CheckCircle, 
  Clock, 
  X, 
  Download, 
  ExternalLink, 
  Printer, 
  History,
  Info
} from 'lucide-react';
import { SavedInvoice } from '../types';
import { formatMoney } from '../constants';
import InvoicePreviewView from './InvoicePreviewView';

interface HistoryViewProps {
  invoices: SavedInvoice[];
  onDeleteInvoice: (id: string) => void;
  onRestoreInvoice: (invoice: SavedInvoice) => void;
}

export default function HistoryView({ invoices, onDeleteInvoice, onRestoreInvoice }: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Due'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<SavedInvoice | null>(null);

  // Filter invoices based on search term and status filter
  const filteredInvoices = invoices.filter(item => {
    const matchesSearch = 
      item.draft.metadata.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.draft.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.draft.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      item.draft.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: 'Paid' | 'Due') => {
    if (status === 'Paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
        <Clock className="w-3 h-3 text-amber-500" />
        Due
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const getInvoiceTotal = (item: SavedInvoice) => {
    const validItems = item.draft.items.filter(i => i.description.trim() !== '' || i.unitPrice > 0);
    const subtotal = validItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    
    // Calculate discount
    let discountAmt = 0;
    if (item.draft.discountValue > 0) {
      if (item.draft.discountType === 'percentage') {
        discountAmt = subtotal * (item.draft.discountValue / 100);
      } else {
        discountAmt = item.draft.discountValue;
      }
    }
    discountAmt = Math.min(discountAmt, subtotal);
    const afterDiscount = subtotal - discountAmt;

    // Calculate tax
    let taxAmt = 0;
    if (item.tax.taxEnabled && item.tax.taxRate > 0) {
      if (item.tax.taxInclusive) {
        taxAmt = afterDiscount * item.tax.taxRate / (100 + item.tax.taxRate);
      } else {
        taxAmt = afterDiscount * (item.tax.taxRate / 100);
      }
    }

    const total = item.tax.taxInclusive ? afterDiscount : afterDiscount + taxAmt;
    return formatMoney(total, item.profile.currency);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="history-view-container">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            Invoice History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Access older finalized invoices to view, share, download, or edit again.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col md:flex-row gap-4 items-center justify-between" id="history-filters-toolbar">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by invoice #, client name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            id="history-search-input"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-150 dark:border-slate-800 w-full md:w-auto" id="history-status-filter-tabs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex-1 md:flex-initial py-1.5 px-4 text-xs font-bold rounded-md transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Paid')}
            className={`flex-1 md:flex-initial py-1.5 px-4 text-xs font-bold rounded-md transition-all cursor-pointer ${
              statusFilter === 'Paid'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            Paid ({invoices.filter(i => i.draft.status === 'Paid').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Due')}
            className={`flex-1 md:flex-initial py-1.5 px-4 text-xs font-bold rounded-md transition-all cursor-pointer ${
              statusFilter === 'Due'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            Due ({invoices.filter(i => i.draft.status !== 'Paid').length})
          </button>
        </div>
      </div>

      {/* History List or Table */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center shadow-xs" id="history-empty-state">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">No invoices found</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            {invoices.length === 0 
              ? "Create and print/download an invoice in the editor to save it automatically to your history."
              : "Try adjusting your search terms or filter selection."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs" id="history-table-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Saved Date</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Grand Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {filteredInvoices.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.draft.metadata.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{item.draft.customer.name || 'Unnamed Client'}</div>
                      {item.draft.customer.email && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{item.draft.customer.email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {getInvoiceTotal(item)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.draft.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(item)}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer min-h-[34px] min-w-[34px]"
                          title="Open PDF Preview / Download / Share"
                        >
                          <FileText className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRestoreInvoice(item)}
                          className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Load invoice back into Editor to modify"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          Edit/Load
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete Invoice ${item.draft.metadata.invoiceNumber} from history? This is irreversible.`)) {
                              onDeleteInvoice(item.id);
                            }
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer min-h-[34px] min-w-[34px]"
                          title="Delete permanently from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Full Preview Modal Overlay */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto animate-fadeIn" id="history-modal-overlay">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-150 w-full max-w-5xl my-8 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between sticky top-0 z-50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400 shrink-0" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Viewing Invoice {selectedInvoice.draft.metadata.invoiceNumber} (Saved snapshot)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Close overlay"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 bg-[#f8fafc] dark:bg-slate-950 max-h-[80vh] overflow-y-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-4 shadow-sm">
                <InvoicePreviewView
                  draft={selectedInvoice.draft}
                  profile={selectedInvoice.profile}
                  tax={selectedInvoice.tax}
                  onEdit={() => {
                    const confirmRestore = window.confirm(
                      "Would you like to load this invoice back into the Editor? Note: This will replace your current active draft."
                    );
                    if (confirmRestore) {
                      onRestoreInvoice(selectedInvoice);
                      setSelectedInvoice(null);
                    }
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between px-6">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Saved on {formatDate(selectedInvoice.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-850 hover:bg-slate-800 dark:hover:bg-slate-750 text-white rounded-lg transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

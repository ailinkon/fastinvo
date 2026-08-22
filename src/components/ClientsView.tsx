import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Building2,
  DollarSign,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  PieChart,
  Eye,
  Send,
  Calendar,
  Receipt,
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Client, SavedInvoice, BusinessProfile, AuthUser } from '../types';
import { formatMoney } from '../constants';
import { calculateInvoiceTotals, getInvoiceStatus, shouldShowReminder } from '../utils/calculations';
import RemindClientModal from './RemindClientModal';

interface ClientsViewProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  invoices: SavedInvoice[];
  profile: BusinessProfile;
  currentUser?: AuthUser | null;
  onCreateInvoiceForClient: (client: Client) => void;
  onSelectInvoice?: (invoice: SavedInvoice) => void;
  onBack?: () => void;
}

export default function ClientsView({
  clients,
  setClients,
  invoices,
  profile,
  currentUser = null,
  onCreateInvoiceForClient,
  onSelectInvoice,
  onBack
}: ClientsViewProps) {
  const isStaff = currentUser?.role === 'staff';
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [detailTab, setDetailTab] = useState<'activity' | 'overview'>('activity');
  const [activityFilter, setActivityFilter] = useState<'all' | 'invoices' | 'quotations'>('all');
  const [remindInvoice, setRemindInvoice] = useState<SavedInvoice | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const openAddModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setShowAddModal(true);
  };

  const openEditModal = (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClient(client);
    setFormName(client.name);
    setFormEmail(client.email || '');
    setFormPhone(client.phone || '');
    setFormAddress(client.address || '');
    setShowAddModal(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingClient) {
      const updatedClient: Client = {
        ...editingClient,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
      };

      setClients(prev =>
        prev.map(c => (c.id === editingClient.id ? updatedClient : c))
      );
      if (selectedClientDetail && selectedClientDetail.id === editingClient.id) {
        setSelectedClientDetail(updatedClient);
      }
      setToastMsg(`Updated client "${formName.trim()}"`);
    } else {
      const newClient: Client = {
        id: `c-${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
      };
      setClients(prev => [...prev, newClient]);
      setToastMsg(`Saved client "${formName.trim()}"`);
    }

    setTimeout(() => setToastMsg(null), 3000);
    setShowAddModal(false);
  };

  const promptDeleteClient = (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingClient(client);
  };

  const confirmDeleteClient = () => {
    if (!deletingClient) return;
    const name = deletingClient.name;
    setClients(prev => prev.filter(c => c.id !== deletingClient.id));
    if (selectedClientDetail && selectedClientDetail.id === deletingClient.id) {
      setSelectedClientDetail(null);
    }
    setDeletingClient(null);
    setToastMsg(`Removed client "${name}"`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Helper to match invoices for a client
  const getInvoicesForClient = (client: Client) => {
    const nameQuery = (client.name || '').trim().toLowerCase();
    const emailQuery = (client.email || '').trim().toLowerCase();

    return invoices.filter(inv => {
      const invCustName = (inv.draft.customer.name || '').trim().toLowerCase();
      const invCustEmail = (inv.draft.customer.email || '').trim().toLowerCase();

      if (nameQuery && invCustName === nameQuery) return true;
      if (emailQuery && invCustEmail && invCustEmail === emailQuery) return true;
      return false;
    });
  };

  // Compute Client financial statistics
  const getClientStats = (client: Client) => {
    let totalInvoiced = 0;
    let totalReceived = 0;
    let outstanding = 0;
    let quoteCount = 0;
    let quoteEstimatedTotal = 0;

    const clientInvs = getInvoicesForClient(client);

    clientInvs.forEach(inv => {
      const { grandTotal } = calculateInvoiceTotals(
        inv.draft.items,
        inv.draft.discountType,
        inv.draft.discountValue,
        inv.tax
      );

      if (inv.draft.documentType === 'quotation') {
        quoteCount++;
        quoteEstimatedTotal += grandTotal;
      } else {
        totalInvoiced += grandTotal;
        const paidAmount = inv.draft.paidAmount || (inv.draft.status === 'Paid' ? grandTotal : 0);
        totalReceived += paidAmount;
        outstanding += Math.max(0, grandTotal - paidAmount);
      }
    });

    return {
      totalInvoiced,
      totalReceived,
      outstanding,
      quoteCount,
      quoteEstimatedTotal,
      totalDocs: clientInvs.length,
    };
  };

  const filteredClients = clients.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto font-sans relative">
      
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: CLIENT DETAIL & ACTIVITY LOG VIEW
         ───────────────────────────────────────────────────────────── */}
      {selectedClientDetail ? (
        <div className="space-y-5 animate-fadeIn">
          {/* Top Bar with Back Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedClientDetail(null)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Clients</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEditModal(selectedClientDetail)}
                className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold text-xs transition-colors cursor-pointer"
                title="Edit Client"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onCreateInvoiceForClient(selectedClientDetail)}
                className="py-2 px-3.5 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs transition-all shadow-md shadow-[#0F3D2E]/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span>+ New Invoice</span>
              </button>
            </div>
          </div>

          {/* Client Profile Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F3D2E] dark:text-emerald-300 font-black text-xl flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                  {selectedClientDetail.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {selectedClientDetail.name}
                    </h2>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      Active Client
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Client ID: {selectedClientDetail.id}
                  </p>
                </div>
              </div>

              {/* Quick Contact Chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                {selectedClientDetail.phone && (
                  <a
                    href={`tel:${selectedClientDetail.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-700 text-xs font-semibold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{selectedClientDetail.phone}</span>
                  </a>
                )}
                {selectedClientDetail.email && (
                  <a
                    href={`mailto:${selectedClientDetail.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-700 text-xs font-semibold transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate max-w-[200px]">{selectedClientDetail.email}</span>
                  </a>
                )}
              </div>
            </div>

            {selectedClientDetail.address && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{selectedClientDetail.address}</span>
              </div>
            )}
          </div>

          {/* Financial Totals Summary Bar for Client */}
          {(() => {
            const stats = getClientStats(selectedClientDetail);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Invoiced */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                    <span>Total Invoiced</span>
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
                    {formatMoney(stats.totalInvoiced, profile.currency.symbol)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Across {stats.totalDocs} document{stats.totalDocs !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Total Paid / Received */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl p-4 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                    <span>Total Paid</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono">
                    {formatMoney(stats.totalReceived, profile.currency.symbol)}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                    Collected to date
                  </p>
                </div>

                {/* Outstanding Balance */}
                <div className={`rounded-2xl p-4 shadow-2xs space-y-1 border ${
                  stats.outstanding > 0
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}>
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider">
                    <span>Outstanding Due</span>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <p className={`text-lg font-black font-mono ${
                    stats.outstanding > 0
                      ? 'text-amber-900 dark:text-amber-300'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {formatMoney(stats.outstanding, profile.currency.symbol)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {stats.outstanding > 0 ? 'Pending payment' : 'No balance due'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Sub-Tabs: Activity Timeline vs Client Details */}
          <div className="p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDetailTab('activity')}
              className={`flex-1 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                detailTab === 'activity'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Activity Log ({getInvoicesForClient(selectedClientDetail).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('overview')}
              className={`flex-1 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                detailTab === 'overview'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Client Profile & Notes</span>
            </button>
          </div>

          {/* TAB 1: ACTIVITY LOG & TIMELINE */}
          {detailTab === 'activity' && (
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-500 mr-1">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activityFilter === 'all'
                        ? 'bg-[#0F3D2E] text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('invoices')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activityFilter === 'invoices'
                        ? 'bg-[#0F3D2E] text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Invoices
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('quotations')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activityFilter === 'quotations'
                        ? 'bg-[#0F3D2E] text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Quotations
                  </button>
                </div>
              </div>

              {/* Chronological Activity Timeline List */}
              {(() => {
                const clientInvs = getInvoicesForClient(selectedClientDetail)
                  .filter(inv => {
                    const isQuote = inv.draft.documentType === 'quotation';
                    if (activityFilter === 'invoices' && isQuote) return false;
                    if (activityFilter === 'quotations' && !isQuote) return false;
                    return true;
                  })
                  .sort((a, b) => {
                    const dateA = a.draft.metadata.issueDate || a.createdAt || '';
                    const dateB = b.draft.metadata.issueDate || b.createdAt || '';
                    return dateB.localeCompare(dateA);
                  });

                if (clientInvs.length === 0) {
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F3D2E] dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          No Activity Records Found
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          No invoices or quotations match this filter for {selectedClientDetail.name}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCreateInvoiceForClient(selectedClientDetail)}
                        className="py-2.5 px-4 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs transition-all shadow-md shadow-[#0F3D2E]/20 inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4 text-emerald-300 stroke-[3]" />
                        <span>Create First Invoice</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {clientInvs.map((inv) => {
                      const isQuote = inv.draft.documentType === 'quotation';
                      const { grandTotal } = calculateInvoiceTotals(
                        inv.draft.items,
                        inv.draft.discountType,
                        inv.draft.discountValue,
                        inv.tax
                      );
                      const paidAmount = inv.draft.paidAmount || (inv.draft.status === 'Paid' ? grandTotal : 0);
                      const balanceDue = Math.max(0, grandTotal - paidAmount);
                      const computedStatus = getInvoiceStatus(inv.draft, grandTotal);
                      const canRemind = !isQuote && shouldShowReminder(inv.draft, grandTotal);

                      const docNumber = isQuote
                        ? (inv.draft.metadata.quotationNumber || inv.draft.metadata.invoiceNumber || 'QUO-1001')
                        : (inv.draft.metadata.invoiceNumber || 'INV-1001');

                      return (
                        <div
                          key={inv.id}
                          className="relative pl-12"
                        >
                          {/* Timeline Icon Node */}
                          <div className={`absolute left-2.5 top-4 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-slate-100 dark:ring-slate-900 z-10 ${
                            isQuote
                              ? 'bg-blue-500 text-white'
                              : computedStatus === 'Paid'
                              ? 'bg-emerald-500 text-white'
                              : computedStatus === 'Overdue'
                              ? 'bg-rose-500 text-white'
                              : computedStatus === 'Partially Paid'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-700 text-white'
                          }`}>
                            {isQuote ? (
                              <FileText className="w-3 h-3 stroke-[2.5]" />
                            ) : computedStatus === 'Paid' ? (
                              <CheckCircle className="w-3 h-3 stroke-[2.5]" />
                            ) : computedStatus === 'Overdue' ? (
                              <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                            ) : (
                              <Clock className="w-3 h-3 stroke-[2.5]" />
                            )}
                          </div>

                          {/* Card Content */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                    isQuote
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                      : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}>
                                    {isQuote ? 'Quotation' : 'Invoice'}
                                  </span>
                                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
                                    #{docNumber}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  <span>Issued: {inv.draft.metadata.issueDate || 'Recent'}</span>
                                  {inv.draft.metadata.dueDate && (
                                    <span>• Due: {inv.draft.metadata.dueDate}</span>
                                  )}
                                </p>
                              </div>

                              {/* Status Pill */}
                              <div>
                                {isQuote ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                    {inv.draft.quotationStatus || 'Draft'}
                                  </span>
                                ) : (
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    computedStatus === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : computedStatus === 'Overdue'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : computedStatus === 'Partially Paid'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-[#EFECE6] text-[#7A6038] dark:bg-slate-800 dark:text-slate-300'
                                  }`}>
                                    {computedStatus}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Financial breakdown */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                  {isQuote ? 'Estimated Total' : 'Total Amount'}
                                </span>
                                <span className="font-black text-slate-900 dark:text-slate-100 font-mono">
                                  {formatMoney(grandTotal, profile.currency.symbol)}
                                </span>
                              </div>

                              {!isQuote && (
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                    {balanceDue > 0 ? 'Remaining Due' : 'Status'}
                                  </span>
                                  <span className={`font-black font-mono ${balanceDue > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {balanceDue > 0 ? formatMoney(balanceDue, profile.currency.symbol) : 'Fully Settled'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                              {canRemind && (
                                <button
                                  type="button"
                                  onClick={() => setRemindInvoice(inv)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-300/60 dark:border-emerald-800 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Remind Client</span>
                                </button>
                              )}

                              {onSelectInvoice && (
                                <button
                                  type="button"
                                  onClick={() => onSelectInvoice(inv)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                >
                                  <Eye className="w-3 h-3 text-slate-500" />
                                  <span>View Document</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: OVERVIEW & CLIENT DETAILS */}
          {detailTab === 'overview' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                Saved Client Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Full Name / Company</span>
                  <p className="font-extrabold text-slate-900 dark:text-slate-100">{selectedClientDetail.name}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Email Address</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedClientDetail.email || 'Not provided'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Phone Number</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedClientDetail.phone || 'Not provided'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Billing Address</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 whitespace-pre-line">{selectedClientDetail.address || 'Not provided'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => promptDeleteClient(selectedClientDetail)}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Client</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(selectedClientDetail)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           VIEW 2: MAIN CLIENTS LIST DIRECTORY
           ───────────────────────────────────────────────────────────── */
        <div className="space-y-4">
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
                  Client Directory
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {clients.length} saved client{clients.length !== 1 ? 's' : ''} with live activity logs
                </p>
              </div>
            </div>

            <button
              onClick={openAddModal}
              className="py-2.5 px-4 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs transition-all shadow-md shadow-[#0F3D2E]/20 flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 text-emerald-300 stroke-[3]" />
              <span>+ Add Client</span>
            </button>
          </div>

          {/* Pinned Search Bar */}
          <div className="relative">
            <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients by name, email or phone..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Clients Cards Grid */}
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F3D2E] dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {clients.length === 0 ? 'No clients saved yet' : 'No clients match your search'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {clients.length === 0 
                    ? 'Save your frequent clients to quickly populate invoices and view chronological activity logs.' 
                    : 'Try clearing your search query.'}
                </p>
              </div>
              {clients.length === 0 && (
                <button
                  onClick={openAddModal}
                  className="mt-2 inline-flex items-center gap-2 bg-[#0F3D2E] hover:bg-[#164E3B] text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-300 stroke-[3]" />
                  <span>Add Your First Client</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClients.map((client) => {
                const stats = getClientStats(client);
                const initial = client.name.charAt(0).toUpperCase();

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClientDetail(client)}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all space-y-4 relative flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F3D2E] dark:text-emerald-400 font-extrabold text-base flex items-center justify-center shrink-0 border border-emerald-100/60 dark:border-emerald-900/50">
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                {client.name}
                              </h3>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {client.email && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[180px]">{client.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => openEditModal(client, e)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Client"
                          >
                            <Edit3 className="w-4 h-4 stroke-[1.75]" />
                          </button>
                          {!isStaff && (
                            <button
                              onClick={(e) => promptDeleteClient(client, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Delete Client (Admin only)"
                            >
                              <Trash2 className="w-4 h-4 stroke-[1.75]" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Details Block */}
                      <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-2xl space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {client.phone && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-start gap-2 text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{client.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Financial Stats Bar */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Total Invoiced
                          </span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">
                            {formatMoney(stats.totalInvoiced, profile.currency.symbol)}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          stats.outstanding > 0
                            ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-150/60 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase block">
                            Outstanding
                          </span>
                          <span className="font-extrabold">
                            {formatMoney(stats.outstanding, profile.currency.symbol)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientDetail(client);
                        }}
                        className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Activity className="w-3 h-3 text-emerald-600" />
                        <span>Activity Log ({stats.totalDocs})</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateInvoiceForClient(client);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-[11px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <FileText className="w-3 h-3 text-emerald-300" />
                        <span>+ Invoice</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                {editingClient ? 'Edit Client Details' : 'Add New Client'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Client / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. billing@acme.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Billing Address
                </label>
                <textarea
                  rows={3}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. 123 Enterprise Way, Suite 100, San Francisco, CA"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  {editingClient ? 'Save Changes' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 text-center animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/50">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Delete Saved Client?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove <span className="font-bold text-slate-800 dark:text-slate-200">&ldquo;{deletingClient.name}&rdquo;</span> from your saved clients list?
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingClient(null)}
                className="w-1/2 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                className="w-1/2 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remind Client Modal from Timeline */}
      {remindInvoice && (
        <RemindClientModal
          isOpen={!!remindInvoice}
          onClose={() => setRemindInvoice(null)}
          draft={remindInvoice.draft}
          profile={profile}
          tax={remindInvoice.tax}
        />
      )}

      {/* Floating Toast Message */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-extrabold py-2.5 px-4 rounded-full shadow-lg border border-slate-700 animate-fadeIn">
          {toastMsg}
        </div>
      )}

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Percent, 
  Coins, 
  Calendar, 
  User, 
  FileText, 
  Info, 
  RefreshCw, 
  Eraser, 
  Eye,
  CreditCard,
  Smartphone
} from 'lucide-react';
import { InvoiceDraft, LineItem, BusinessProfile, TaxConfig, DiscountType, Client } from '../types';
import { formatMoney, getTodayDateString, DEFAULT_INVOICE_DRAFT } from '../constants';
import { Undo2, Redo2, BookOpen, UserPlus, Save, Check, X, Edit, Trash, Search, Building2, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';
import { BANGLADESHI_BANKS, generateMockRoutingNumber } from '../utils/bankData';

const MFS_OPTIONS = ['Bkash', 'Celsin', 'Nagad', 'Rocket', 'Upay', 'M-Cash'];

const PAYMENT_METHOD_OPTIONS = [
  { id: 'Cash', name: 'Cash', desc: 'Direct physical currency' },
  { id: 'Card', name: 'Card', desc: 'Credit, debit, or smart card' },
  { id: 'Bank transfer', name: 'Bank transfer', desc: 'ACH, direct deposit, or wire' },
  { id: 'MFS Transfer', name: 'MFS Transfer', desc: 'Mobile personal number transfer' },
  { id: 'MFS merchant pay', name: 'MFS merchant pay', desc: 'Mobile merchant counter payment' }
];

interface InvoiceEditorViewProps {
  draft: InvoiceDraft;
  setDraft: (draft: InvoiceDraft | ((prev: InvoiceDraft) => InvoiceDraft)) => void;
  profile: BusinessProfile;
  setProfile: (profile: BusinessProfile) => void;
  tax: TaxConfig;
  onPreview: () => void;
  onNewInvoice: () => void;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function InvoiceEditorView({
  draft,
  setDraft,
  profile,
  setProfile,
  tax,
  onPreview,
  onNewInvoice,
  clients,
  setClients,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}: InvoiceEditorViewProps) {
  
  // Track error warnings for inputs
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [paymentSubTab, setPaymentSubTab] = React.useState<'methods' | 'mfs' | 'instructions'>('methods');

  // Automated bank routing status states
  const [isFetchingRouting, setIsFetchingRouting] = React.useState(false);
  const [routingFeedback, setRoutingFeedback] = React.useState('');
  const [showCustomBank, setShowCustomBank] = React.useState(false);
  const [showCustomBranch, setShowCustomBranch] = React.useState(false);

  // Prompts and confirmation notices
  const [showSaveClientPrompt, setShowSaveClientPrompt] = React.useState(false);
  const [paymentMethodPrompt, setPaymentMethodPrompt] = React.useState<{ id: string; name: string } | null>(null);
  const [paymentNotice, setPaymentNotice] = React.useState<string | null>(null);

  const currentMethods = profile.paymentMethods || [];

  const handleTogglePaymentMethod = (methodId: string) => {
    let updated: string[];
    if (currentMethods.includes(methodId)) {
      updated = currentMethods.filter(m => m !== methodId);
      setProfile({
        ...profile,
        paymentMethods: updated
      });
    } else {
      const matchedOpt = PAYMENT_METHOD_OPTIONS.find(o => o.id === methodId);
      if (matchedOpt) {
        setPaymentMethodPrompt({ id: methodId, name: matchedOpt.name });
      } else {
        updated = [...currentMethods, methodId];
        setProfile({
          ...profile,
          paymentMethods: updated
        });
      }
    }
  };

  const handleConfirmSinglePaymentMethod = (methodId: string, methodName: string) => {
    setProfile({
      ...profile,
      paymentMethods: [methodId]
    });
    setPaymentMethodPrompt(null);
    setPaymentNotice(`Proceeding to take payment via ${methodName}!`);
    setTimeout(() => setPaymentNotice(null), 5000);
    
    if (methodId.toLowerCase().includes('mfs')) {
      setPaymentSubTab('mfs');
    } else {
      setPaymentSubTab('instructions');
    }
  };

  const handleConfirmMixedPaymentMethod = (methodId: string) => {
    if (!currentMethods.includes(methodId)) {
      setProfile({
        ...profile,
        paymentMethods: [...currentMethods, methodId]
      });
    }
    setPaymentMethodPrompt(null);
    setPaymentNotice(`Configured mixed payment method. Multi-selection enabled.`);
    setTimeout(() => setPaymentNotice(null), 4000);
  };

  // Client Management States
  const [showClientManager, setShowClientManager] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [newClientName, setNewClientName] = React.useState('');
  const [newClientAddress, setNewClientAddress] = React.useState('');
  const [newClientPhone, setNewClientPhone] = React.useState('');
  const [newClientEmail, setNewClientEmail] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');

  const selectClient = (client: Client) => {
    setDraft({
      ...draft,
      customer: {
        name: client.name,
        address: client.address,
        phone: client.phone,
        email: client.email
      }
    });
    setSuccessMsg(`Populated from saved client: ${client.name}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveCurrentAsClient = () => {
    if (!draft.customer.name.trim()) {
      alert("Please enter a customer name first before saving.");
      return;
    }
    const newClient: Client = {
      id: Math.random().toString(36).substring(2, 9),
      name: draft.customer.name,
      address: draft.customer.address,
      phone: draft.customer.phone,
      email: draft.customer.email
    };
    setClients(prev => [...prev, newClient]);
    setSuccessMsg(`Successfully saved client: ${newClient.name}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddNewClient = () => {
    if (!newClientName.trim()) return;
    const client: Client = {
      id: Math.random().toString(36).substring(2, 9),
      name: newClientName,
      address: newClientAddress,
      phone: newClientPhone,
      email: newClientEmail
    };
    setClients(prev => [...prev, client]);
    // Clear inputs
    setNewClientName('');
    setNewClientAddress('');
    setNewClientPhone('');
    setNewClientEmail('');
    setSuccessMsg(`Successfully added client: ${client.name}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleStartEditClient = (client: Client) => {
    setEditingClient(client);
  };

  const handleSaveEditedClient = () => {
    if (!editingClient || !editingClient.name.trim()) return;
    setClients(prev => prev.map(c => c.id === editingClient.id ? editingClient : c));
    setEditingClient(null);
    setSuccessMsg(`Saved changes to client: ${editingClient.name}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteClient = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from saved clients?`)) {
      setClients(prev => prev.filter(c => c.id !== id));
      setSuccessMsg(`Deleted client: ${name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Calculations derived from current state
  const items = draft.items;
  
  // Filter out completely empty items when deriving final totals to keep them clean
  const validItems = items.filter(item => item.description.trim() !== '' || item.quantity > 0 || item.unitPrice > 0);
  
  // Subtotal of prices as entered
  const grossSubtotal = validItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  let discountAmountGross = 0;
  if (draft.discountType === 'percentage') {
    discountAmountGross = grossSubtotal * (draft.discountValue / 100);
  } else {
    discountAmountGross = draft.discountValue;
  }
  // Cap discount at subtotal to prevent negative billing
  discountAmountGross = Math.min(discountAmountGross, grossSubtotal);

  let netSubtotal = 0;
  let netDiscount = 0;
  let taxAmount = 0;
  let grandTotal = 0;

  if (tax.taxEnabled && tax.taxRate > 0) {
    if (tax.taxInclusive) {
      // Mode A — Prices INCLUDE tax (tax-inclusive):
      // grossTotal is what the customer pays (unit price * qty - discount)
      const grossTotal = Math.max(0, grossSubtotal - discountAmountGross);
      taxAmount = grossTotal * tax.taxRate / (100 + tax.taxRate);
      netSubtotal = grossTotal - taxAmount;
      grandTotal = grossTotal;
      netDiscount = discountAmountGross;
    } else {
      // Mode B — Prices EXCLUDE tax (tax-exclusive):
      // Tax added on top of subtotal - discount
      netSubtotal = grossSubtotal;
      netDiscount = discountAmountGross;
      const netTotalAfterDiscount = Math.max(0, netSubtotal - netDiscount);
      taxAmount = netTotalAfterDiscount * tax.taxRate / 100;
      grandTotal = netTotalAfterDiscount + taxAmount;
    }
  } else {
    // No Tax mode
    netSubtotal = grossSubtotal;
    netDiscount = discountAmountGross;
    taxAmount = 0;
    grandTotal = Math.max(0, grossSubtotal - discountAmountGross);
  }

  // Handle draft fields change
  const handleMetadataChange = (key: keyof typeof draft.metadata, value: string) => {
    setDraft({
      ...draft,
      metadata: { ...draft.metadata, [key]: value }
    });
  };

  const handlePaymentProofChange = (key: 'status' | 'mfsProvider' | 'mfsTrxId' | 'bankName' | 'bankBranch' | 'bankRoutingNo' | 'bankTransactionId', value: any) => {
    setDraft(prev => ({
      ...prev,
      [key]: value
    }));

    if (key === 'status' && value === 'Paid') {
      const clientName = draft.customer.name.trim();
      if (clientName) {
        const alreadySaved = clients.some(c => c.name.toLowerCase() === clientName.toLowerCase() || (draft.customer.email?.trim() && c.email?.toLowerCase() === draft.customer.email.trim().toLowerCase()));
        if (!alreadySaved) {
          setShowSaveClientPrompt(true);
        }
      }
    }
  };

  const simulateAutomatedRoutingFetch = (bank: string, branch: string, resolvedRouting: string) => {
    setIsFetchingRouting(true);
    setRoutingFeedback('Connecting to Bangladesh Bank national clearing directory...');
    
    setTimeout(() => {
      setRoutingFeedback(`Querying routing table for ${bank} - ${branch}...`);
      setTimeout(() => {
        setDraft(prev => ({
          ...prev,
          bankRoutingNo: resolvedRouting
        }));
        setIsFetchingRouting(false);
        setRoutingFeedback('Routing code fetched and auto-populated!');
        setTimeout(() => setRoutingFeedback(''), 3000);
      }, 450);
    }, 350);
  };

  const handleCustomerChange = (key: keyof typeof draft.customer, value: string) => {
    setDraft({
      ...draft,
      customer: { ...draft.customer, [key]: value }
    });

    if (value.trim()) {
      setErrors(prev => {
        const cpy = { ...prev };
        if (key === 'name') delete cpy.customerName;
        if (key === 'phone') delete cpy.customerPhone;
        if (key === 'address') delete cpy.customerAddress;
        return cpy;
      });
    }
  };

  const handlePreviewClick = () => {
    const newErrors: Record<string, string> = {};
    if (!draft.customer.name.trim()) {
      newErrors.customerName = 'Customer Name is required';
    }
    if (!draft.customer.phone.trim()) {
      newErrors.customerPhone = 'Customer Phone is required';
    }
    if (!draft.customer.address.trim()) {
      newErrors.customerAddress = 'Customer Billing Address is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      
      const firstErrKey = Object.keys(newErrors)[0];
      let id = '';
      if (firstErrKey === 'customerName') id = 'customer-name-input';
      else if (firstErrKey === 'customerPhone') id = 'customer-phone-input';
      else if (firstErrKey === 'customerAddress') id = 'customer-address-input';
      
      if (id) {
        const el = document.getElementById(id);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }
    
    setErrors(prev => {
      const cpy = { ...prev };
      delete cpy.customerName;
      delete cpy.customerPhone;
      delete cpy.customerAddress;
      return cpy;
    });

    onPreview();
  };

  const handleDiscountTypeToggle = () => {
    setDraft({
      ...draft,
      discountType: draft.discountType === 'percentage' ? 'fixed' : 'percentage',
      discountValue: 0 // Reset value when toggling
    });
  };

  const handleDiscountValueChange = (val: number) => {
    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
    setDraft({
      ...draft,
      discountValue: safeVal
    });
  };

  // Keyboard navigation & Auto-add row logic
  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...draft.items];
    
    // Type validation for inputs
    let typedValue = value;
    if (field === 'quantity') {
      typedValue = parseFloat(value);
      if (isNaN(typedValue)) typedValue = 0;
      if (typedValue < 0) {
        setErrors(prev => ({ ...prev, [`qty-${index}`]: "Must be positive" }));
        typedValue = 0;
      } else {
        setErrors(prev => {
          const cpy = { ...prev };
          delete cpy[`qty-${index}`];
          return cpy;
        });
      }
    } else if (field === 'unitPrice') {
      typedValue = parseFloat(value);
      if (isNaN(typedValue)) typedValue = 0;
      if (typedValue < 0) {
        setErrors(prev => ({ ...prev, [`price-${index}`]: "Must be positive" }));
        typedValue = 0;
      } else {
        setErrors(prev => {
          const cpy = { ...prev };
          delete cpy[`price-${index}`];
          return cpy;
        });
      }
    }

    updated[index] = { ...updated[index], [field]: typedValue };
    
    // Auto-add rows logic:
    // If we're modifying the very last item, and it's not empty, append a new empty row
    const isLast = index === updated.length - 1;
    const item = updated[index];
    const hasContent = item.description.trim() !== '' || item.quantity > 0 || item.unitPrice > 0;
    
    if (isLast && hasContent) {
      updated.push({
        id: Math.random().toString(36).substring(2, 9),
        description: '',
        quantity: 0,
        unitPrice: 0
      });
    }

    setDraft({ ...draft, items: updated });
  };

  // Explicit add row button (as alternative)
  const addExplicitRow = () => {
    const updated = [...draft.items];
    updated.push({
      id: Math.random().toString(36).substring(2, 9),
      description: '',
      quantity: 0,
      unitPrice: 0
    });
    setDraft({ ...draft, items: updated });
  };

  const deleteRow = (index: number) => {
    let updated = [...draft.items];
    updated.splice(index, 1);
    
    // Ensure there is always at least one row in the table
    if (updated.length === 0) {
      updated = [{ id: '1', description: '', quantity: 0, unitPrice: 0 }];
    }
    
    // Clean errors for deleted row
    setErrors(prev => {
      const cpy = { ...prev };
      delete cpy[`qty-${index}`];
      delete cpy[`price-${index}`];
      return cpy;
    });

    setDraft({ ...draft, items: updated });
  };

  // Keyboard Navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, cellType: 'description' | 'quantity' | 'unitPrice') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If we are on the unitPrice field (last cell), press Enter to jump to the next row's description
      if (cellType === 'unitPrice') {
        const nextRowIndex = index + 1;
        
        // Wait briefly for react state to flush if a row was dynamically appended
        setTimeout(() => {
          const nextInput = document.querySelector(
            `input[data-row-index="${nextRowIndex}"][data-cell-type="description"]`
          ) as HTMLInputElement | null;
          
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }, 80);
      } else if (cellType === 'description') {
        // Move to qty
        const qtyInput = document.querySelector(
          `input[data-row-index="${index}"][data-cell-type="quantity"]`
        ) as HTMLInputElement | null;
        if (qtyInput) {
          qtyInput.focus();
          qtyInput.select();
        }
      } else if (cellType === 'quantity') {
        // Move to unit price
        const priceInput = document.querySelector(
          `input[data-row-index="${index}"][data-cell-type="unitPrice"]`
        ) as HTMLInputElement | null;
        if (priceInput) {
          priceInput.focus();
          priceInput.select();
        }
      }
    }
  };

  const clearInvoice = () => {
    if (window.confirm("Are you sure you want to clear this draft invoice? Your company settings will be kept, but all line items and customer info will be wiped.")) {
      setDraft(DEFAULT_INVOICE_DRAFT(`${profile.invoicePrefix}${profile.nextInvoiceNumber}`));
      setErrors({});
    }
  };

  return (
    <div className="space-y-5" id="invoice-editor-view">
      
      {/* Top action toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">Invoice Editor</h2>
          <p className="text-xs text-slate-500 mt-0.5">Build your draft. Everything is autosaved locally.</p>
        </div>
        
        <div className="flex items-center gap-2 action-buttons">
          {/* Undo / Redo Buttons */}
          <div className="flex items-center border border-slate-200 rounded bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2.5 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border-r border-slate-1.50 ${
                canUndo 
                  ? 'text-slate-600 hover:bg-slate-50 active:bg-slate-100 cursor-pointer' 
                  : 'text-slate-300 cursor-not-allowed opacity-50'
              }`}
              title="Undo change (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2.5 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                canRedo 
                  ? 'text-slate-600 hover:bg-slate-50 active:bg-slate-100 cursor-pointer' 
                  : 'text-slate-300 cursor-not-allowed opacity-50'
              }`}
              title="Redo change (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePreviewClick}
            id="editor-btn-preview"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm cursor-pointer min-h-[44px]"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Invoice
          </button>
          
          <button
            type="button"
            onClick={onNewInvoice}
            id="editor-btn-new"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer min-h-[44px]"
            title="Increment counter and start a fresh invoice draft"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            New Invoice
          </button>

          <button
            type="button"
            onClick={clearInvoice}
            id="editor-btn-clear"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-100 hover:text-red-700 active:bg-red-100 transition-all cursor-pointer min-h-[44px]"
            title="Clear current invoice details"
          >
            <Eraser className="w-3.5 h-3.5 text-red-400" />
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Main Column: Editor Fields */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Box 1: Customer Info ("Bill To") */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <User className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs uppercase tracking-wider text-slate-500">Bill To (Customer Details)</h3>
              </div>

              {/* Client Shortcuts and Management Actions */}
              <div className="flex items-center gap-2 no-print">
                {clients.length > 0 && (
                  <select
                    onChange={(e) => {
                      const selected = clients.find(c => c.id === e.target.value);
                      if (selected) selectClient(selected);
                      e.target.value = ''; // reset selection
                    }}
                    defaultValue=""
                    className="text-xs bg-slate-50 hover:bg-slate-100 px-2 py-1 border border-slate-200 rounded text-slate-600 focus:outline-none cursor-pointer min-h-[30px]"
                  >
                    <option value="" disabled>⚡ Saved Clients...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                
                <button
                  type="button"
                  onClick={handleSaveCurrentAsClient}
                  disabled={!draft.customer.name.trim()}
                  className={`p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center ${!draft.customer.name.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title="Save current details as new client"
                >
                  <UserPlus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowClientManager(!showClientManager)}
                  className={`p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center ${showClientManager ? 'bg-blue-50 text-blue-600 font-bold' : ''}`}
                  title="Manage saved clients database"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>
            </div>

            {successMsg && (
              <div className="text-[11px] bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Client Database Manager Sub-panel */}
            {showClientManager && (
              <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Saved Clients Database</span>
                  <button
                    type="button"
                    onClick={() => setShowClientManager(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                  >
                    Close Manager
                  </button>
                </div>

                {/* Clients list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clients.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">No saved clients yet. Save current or add below!</p>
                  ) : (
                    clients.map((c) => (
                      <div key={c.id} className="bg-white border border-slate-150 p-2 rounded flex justify-between items-start gap-2 group hover:shadow-xs transition-shadow">
                        <div className="space-y-1 overflow-hidden">
                          <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                          {c.address && <p className="text-[11px] text-slate-500 whitespace-pre-line truncate leading-tight">{c.address}</p>}
                          <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2">
                            {c.phone && <span>Ph: {c.phone}</span>}
                            {c.email && <span>Email: {c.email}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => selectClient(c)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer"
                            title="Load client into editor"
                          >
                            Use
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditClient(c)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                            title="Edit client info"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(c.id, c.name)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Delete client"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Inline Editing Client Details Modal-like block */}
                {editingClient && (
                  <div className="border border-blue-100 bg-blue-50/30 p-3 rounded space-y-3">
                    <p className="font-bold text-slate-700 text-[10px] uppercase">Edit Saved Client Info</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-slate-500 uppercase">Client Name</label>
                        <input
                          type="text"
                          value={editingClient.name}
                          onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-slate-500 uppercase">Phone</label>
                        <input
                          type="text"
                          value={editingClient.phone}
                          onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-slate-500 uppercase">Email</label>
                        <input
                          type="email"
                          value={editingClient.email}
                          onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[9px] font-semibold text-slate-500 uppercase">Address</label>
                        <textarea
                          rows={2}
                          value={editingClient.address}
                          onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs resize-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingClient(null)}
                        className="px-2 py-1 border border-slate-200 rounded text-[10px] bg-white cursor-pointer hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditedClient}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-semibold cursor-pointer hover:bg-blue-700"
                      >
                        Save Client
                      </button>
                    </div>
                  </div>
                )}

                {/* Add New Client Box */}
                {!editingClient && (
                  <div className="border-t border-slate-200 pt-3 space-y-3">
                    <p className="font-bold text-slate-700 text-[10px] uppercase">Add New Client to Database</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="new-client-name" className="text-[9px] font-semibold text-slate-500 uppercase">Client Name</label>
                        <input
                          type="text"
                          id="new-client-name"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="e.g. Acme Corp"
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="new-client-phone" className="text-[9px] font-semibold text-slate-500 uppercase">Phone</label>
                        <input
                          type="text"
                          id="new-client-phone"
                          value={newClientPhone}
                          onChange={(e) => setNewClientPhone(e.target.value)}
                          placeholder="e.g. +1 555-0100"
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="new-client-email" className="text-[9px] font-semibold text-slate-500 uppercase">Email</label>
                        <input
                          type="email"
                          id="new-client-email"
                          value={newClientEmail}
                          onChange={(e) => setNewClientEmail(e.target.value)}
                          placeholder="e.g. hello@acme.com"
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label htmlFor="new-client-address" className="text-[9px] font-semibold text-slate-500 uppercase">Address</label>
                        <textarea
                          id="new-client-address"
                          rows={2}
                          value={newClientAddress}
                          onChange={(e) => setNewClientAddress(e.target.value)}
                          placeholder="e.g. 123 Enterprise Rd, Suite 10"
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs resize-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddNewClient}
                        disabled={!newClientName.trim()}
                        className={`px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-[10px] flex items-center gap-1 cursor-pointer ${!newClientName.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <Plus className="w-3 h-3" />
                        Add Client
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="customer-name-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Customer Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  id="customer-name-input"
                  required
                  value={draft.customer.name}
                  onChange={(e) => handleCustomerChange('name', e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className={`w-full px-3 py-1.5 border rounded text-sm focus:outline-none transition-all ${
                    errors.customerName 
                      ? 'border-red-300 bg-red-50/10 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                  } text-slate-800 placeholder-slate-400`}
                />
                {errors.customerName && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.customerName}</p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="customer-address-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Billing Address <span className="text-red-500 font-bold">*</span>
                </label>
                <textarea
                  id="customer-address-input"
                  rows={2}
                  required
                  value={draft.customer.address}
                  onChange={(e) => handleCustomerChange('address', e.target.value)}
                  placeholder="e.g. 456 Customer Ave, Tech District, San Francisco, CA"
                  className={`w-full px-3 py-1.5 border rounded text-sm focus:outline-none transition-all resize-none ${
                    errors.customerAddress 
                      ? 'border-red-300 bg-red-50/10 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                  } text-slate-800 placeholder-slate-400`}
                />
                {errors.customerAddress && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.customerAddress}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="customer-phone-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Phone <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  id="customer-phone-input"
                  required
                  value={draft.customer.phone}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                  placeholder="e.g. +1 555-987-6543"
                  className={`w-full px-3 py-1.5 border rounded text-sm focus:outline-none transition-all ${
                    errors.customerPhone 
                      ? 'border-red-300 bg-red-50/10 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                  } text-slate-800 placeholder-slate-400`}
                />
                {errors.customerPhone && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.customerPhone}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="customer-email-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  id="customer-email-input"
                  value={draft.customer.email}
                  onChange={(e) => handleCustomerChange('email', e.target.value)}
                  placeholder="e.g. accounting@customer.com"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Box 2: Line Items Table */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs uppercase tracking-wider text-slate-500">Line Items</h3>
              </div>
              
              {/* Mode A Helper Note */}
              {tax.taxEnabled && tax.taxInclusive && tax.taxRate > 0 && (
                <span className="text-[10px] bg-blue-50 border border-blue-100 px-2 py-1 rounded text-blue-700 flex items-center gap-1 font-medium">
                  <Info className="w-3 h-3 text-blue-500" />
                  Prices you enter include {tax.taxRate}% tax
                </span>
              )}
            </div>

            {/* Responsive Table Wrapper */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[500px]" id="editor-items-table">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 font-semibold w-1/2">Description</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-16">Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-28">Unit Price</th>
                    <th className="py-2.5 pl-3 font-semibold text-right w-24">Total</th>
                    <th className="py-2.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const rowTotal = item.quantity * item.unitPrice;
                    return (
                      <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                        {/* Description field */}
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={item.description}
                            data-row-index={index}
                            data-cell-type="description"
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                            placeholder="Service/Product description..."
                            className="w-full bg-transparent py-1 px-1.5 border border-transparent rounded hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none text-sm text-slate-800 transition-all"
                          />
                        </td>
                        
                        {/* Quantity field */}
                        <td className="py-2 px-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity || ''}
                              data-row-index={index}
                              data-cell-type="quantity"
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                              placeholder="0"
                              className="w-full bg-transparent py-1 px-1.5 text-right border border-transparent rounded hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none text-sm text-slate-800 font-mono transition-all"
                            />
                            {errors[`qty-${index}`] && (
                              <span className="absolute right-0 top-7 text-[9px] text-red-500 whitespace-nowrap bg-white px-1 border border-red-100 rounded shadow-xs z-10">{errors[`qty-${index}`]}</span>
                            )}
                          </div>
                        </td>

                        {/* Unit Price field */}
                        <td className="py-2 px-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice || ''}
                              data-row-index={index}
                              data-cell-type="unitPrice"
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                              placeholder="0.00"
                              className="w-full bg-transparent py-1 px-1.5 text-right border border-transparent rounded hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none text-sm text-slate-800 font-mono transition-all"
                            />
                            {errors[`price-${index}`] && (
                              <span className="absolute right-0 top-7 text-[9px] text-red-500 whitespace-nowrap bg-white px-1 border border-red-100 rounded shadow-xs z-10">{errors[`price-${index}`]}</span>
                            )}
                          </div>
                        </td>

                        {/* Auto-calculated line total */}
                        <td className="py-2 pl-3 text-right text-sm font-semibold text-slate-700 font-mono">
                          {formatMoney(rowTotal, profile.currency.symbol)}
                        </td>

                        {/* Delete button */}
                        <td className="py-2 text-right pl-2">
                          <button
                            type="button"
                            onClick={() => deleteRow(index)}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors cursor-pointer rounded"
                            title="Delete line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Manual row addition backup */}
            <div className="pt-1">
              <button
                type="button"
                onClick={addExplicitRow}
                id="editor-btn-add-item"
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 transition-all font-semibold py-1.5 px-3 rounded border border-slate-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </button>
            </div>
          </div>

          {/* Box 3: Notes / Payment Terms */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs uppercase tracking-wider text-slate-500">Invoice Footer Notes & Terms</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="invoice-notes-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Payment Instructions / Notes</label>
                <textarea
                  id="invoice-notes-input"
                  rows={3}
                  value={draft.metadata.notes}
                  onChange={(e) => handleMetadataChange('notes', e.target.value)}
                  placeholder="e.g. Please wire transfer to account:&#10;Bank Name: Commonwealth Bank&#10;BSB: 063-000, Account: 1234 5678"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400 transition-all resize-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="invoice-payment-terms-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Payment Terms Note <span className="text-slate-400 text-[10px] font-normal">(Optional)</span></label>
                <input
                  type="text"
                  id="invoice-payment-terms-input"
                  value={draft.metadata.paymentTerms}
                  onChange={(e) => handleMetadataChange('paymentTerms', e.target.value)}
                  placeholder="e.g. Payment due within 14 days"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Box 4: Payment Methods & Procedure Configuration */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4" id="editor-payment-procedure-box">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Payment Methods & Settings</h3>
              </div>
              
              {/* Tab Switcher */}
              <div className="flex border border-slate-200 rounded p-0.5 bg-slate-50 text-[11px] font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setPaymentSubTab('methods')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    paymentSubTab === 'methods'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Accepted
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSubTab('mfs')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    paymentSubTab === 'mfs'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  MFS Setup
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSubTab('instructions')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    paymentSubTab === 'instructions'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Instructions & URL
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {paymentSubTab === 'methods' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Accepted Payment Methods</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleTogglePaymentMethod(opt.id)}
                        className={`text-left p-2.5 rounded border text-xs flex flex-col gap-0.5 transition-all cursor-pointer ${
                          currentMethods.includes(opt.id)
                            ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500 font-semibold' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-slate-850 text-xs">{opt.name}</span>
                          <input
                            type="checkbox"
                            checked={currentMethods.includes(opt.id)}
                            onChange={() => {}} // event handled by button onClick
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 pointer-events-none shrink-0"
                          />
                        </div>
                        <span className="text-[10px] text-slate-455 font-normal leading-tight leading-snug">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentSubTab === 'mfs' && (
                <div className="space-y-3 bg-purple-50/10 p-3 rounded border border-purple-100">
                  <div className="flex items-start gap-2">
                    <Smartphone className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">Mobile Financial Service (MFS)</h4>
                      <p className="text-[10px] text-slate-400">Configure your primary mobile wallet information for this invoice.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="editor-mfs-provider" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">MFS Provider</label>
                      <select
                        id="editor-mfs-provider"
                        value={profile.mfsProvider || ''}
                        onChange={(e) => setProfile({ ...profile, mfsProvider: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-850 bg-white cursor-pointer min-h-[34px]"
                      >
                        <option value="">-- Select Provider --</option>
                        {MFS_OPTIONS.map((mfs) => (
                          <option key={mfs} value={mfs}>{mfs}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="editor-mfs-account" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Wallet Number</label>
                      <input
                        type="text"
                        id="editor-mfs-account"
                        value={profile.mfsAccountNo || ''}
                        onChange={(e) => setProfile({ ...profile, mfsAccountNo: e.target.value })}
                        placeholder="e.g. 017XXXXXXXX"
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-850 placeholder-slate-400 transition-all font-mono min-h-[34px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Wallet Type</label>
                      <div className="flex gap-1.5 text-[11px] min-h-[34px]">
                        {['Personal', 'Merchant'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setProfile({ ...profile, mfsAccountType: type })}
                            className={`flex-1 py-1 rounded border font-semibold text-center transition-all cursor-pointer ${
                              (profile.mfsAccountType || 'Personal') === type
                                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {profile.mfsProvider && profile.mfsAccountNo && (
                    <div className="bg-purple-50/50 p-2 rounded border border-purple-200/50 text-[10px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-1">
                      <span>
                        💡 Quick Help: <strong>{profile.mfsProvider}</strong> ({profile.mfsAccountType || 'Personal'}) wallet details will be formatted on your invoice automatically.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const prov = profile.mfsProvider;
                          const acc = profile.mfsAccountNo;
                          const type = profile.mfsAccountType || 'Personal';
                          const instr = `Send MFS payment via ${prov} (${type}) to wallet: ${acc}`;
                          const currentProcedure = profile.paymentProcedure || '';
                          const nextProcedure = currentProcedure 
                            ? `${currentProcedure}\n\n${instr}`
                            : instr;
                          setProfile({ ...profile, paymentProcedure: nextProcedure });
                        }}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 rounded transition-all shadow-3xs shrink-0 cursor-pointer text-center"
                      >
                        Append to Instructions
                      </button>
                    </div>
                  )}
                </div>
              )}

              {paymentSubTab === 'instructions' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="editor-payment-gateway-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Payment Gateway Link / URL</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="editor-payment-gateway-input"
                        value={profile.paymentGatewayInfo || ''}
                        onChange={(e) => setProfile({ ...profile, paymentGatewayInfo: e.target.value })}
                        placeholder="e.g. https://buy.stripe.com/abc123xyz"
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 transition-all font-sans"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Provide an optional online checkout URL (e.g., Stripe Payment Link). If present, a clickable <strong>"Pay Online"</strong> button will be rendered on the invoice.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="editor-payment-procedure-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Payment Procedure & Instructions</label>
                    <textarea
                      id="editor-payment-procedure-input"
                      rows={3}
                      value={profile.paymentProcedure || ''}
                      onChange={(e) => setProfile({ ...profile, paymentProcedure: e.target.value })}
                      placeholder="Specify exact bank details, mobile payment transfer instructions, or payment terms..."
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all bg-white font-sans whitespace-pre-line"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Invoice Metadata & Totals */}
        <div className="lg:col-span-1 space-y-5">
          
          {/* Card: Document Details */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs uppercase tracking-wider text-slate-500">Invoice Details</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="invoice-number-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Invoice Number</label>
                <input
                  type="text"
                  id="invoice-number-input"
                  value={draft.metadata.invoiceNumber}
                  onChange={(e) => handleMetadataChange('invoiceNumber', e.target.value)}
                  placeholder="INV-1001"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-mono transition-all"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="invoice-issue-date-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Issue Date</label>
                <input
                  type="date"
                  id="invoice-issue-date-input"
                  value={draft.metadata.issueDate}
                  onChange={(e) => handleMetadataChange('issueDate', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="invoice-due-date-input" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Due Date <span className="text-slate-400 text-[10px] font-normal">(Optional)</span></label>
                <input
                  type="date"
                  id="invoice-due-date-input"
                  value={draft.metadata.dueDate}
                  onChange={(e) => handleMetadataChange('dueDate', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card: Payment Status & Confirmation */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4" id="editor-payment-status-card">
            <div className="flex items-center gap-2 text-slate-800 font-semibold pb-2 border-b border-slate-100">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Payment Status & Proof</h3>
            </div>

            <div className="space-y-4">
              {/* Option to toggle Paid vs Due */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Payment Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentProofChange('status', 'Due')}
                    className={`py-2 px-3 rounded border text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      (draft.status || 'Due') === 'Due'
                        ? 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300 shadow-xs font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${ (draft.status || 'Due') === 'Due' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300' }`} />
                    Due (Unpaid)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentProofChange('status', 'Paid')}
                    className={`py-2 px-3 rounded border text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      draft.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300 shadow-xs font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${draft.status === 'Paid' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`} />
                    Paid
                  </button>
                </div>
              </div>

              {/* Sub-fields for MFS Transfer Proof */}
              {profile.paymentMethods?.some(m => m.toLowerCase().includes('mfs')) && (
                <div className="space-y-2.5 p-3 rounded bg-purple-50/10 border border-purple-100 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-purple-950 font-bold text-xs uppercase tracking-wider">
                    <Smartphone className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                    MFS Transaction Proof
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="draft-mfs-provider" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">MFS Provider</label>
                      <select
                        id="draft-mfs-provider"
                        value={draft.mfsProvider || ''}
                        onChange={(e) => handlePaymentProofChange('mfsProvider', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 bg-white cursor-pointer min-h-[34px]"
                      >
                        <option value="">-- Select Provider --</option>
                        {MFS_OPTIONS.map((mfs) => (
                          <option key={mfs} value={mfs}>{mfs}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="draft-mfs-trx" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">MFS Transaction ID (Trx ID)</label>
                      <input
                        type="text"
                        id="draft-mfs-trx"
                        value={draft.mfsTrxId || ''}
                        onChange={(e) => handlePaymentProofChange('mfsTrxId', e.target.value)}
                        placeholder="e.g. BK109X2L9P"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-mono transition-all uppercase placeholder:normal-case min-h-[34px]"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Select the provider and enter the (Trx ID) received in bKash/Nagad/Rocket SMS to verify payment.
                  </p>
                </div>
              )}

              {/* Sub-fields for Bank Transfer Proof */}
              {profile.paymentMethods?.includes('Bank transfer') && (
                <div className="space-y-3 p-3 rounded bg-blue-50/10 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Bank Transfer Proof
                  </div>

                  {/* Bank Name Selector */}
                  <div className="space-y-1">
                    <label htmlFor="draft-bank-name" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Bank Name</label>
                    {!showCustomBank ? (
                      <select
                        id="draft-bank-name"
                        value={draft.bankName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            setShowCustomBank(true);
                            handlePaymentProofChange('bankName', '');
                            handlePaymentProofChange('bankBranch', '');
                            handlePaymentProofChange('bankRoutingNo', '');
                          } else {
                            handlePaymentProofChange('bankName', val);
                            handlePaymentProofChange('bankBranch', '');
                            handlePaymentProofChange('bankRoutingNo', '');
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 bg-white cursor-pointer min-h-[34px]"
                      >
                        <option value="">-- Select Bank --</option>
                        {BANGLADESHI_BANKS.map(b => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                        <option value="CUSTOM">Type custom bank name...</option>
                      </select>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={draft.bankName || ''}
                          onChange={(e) => handlePaymentProofChange('bankName', e.target.value)}
                          placeholder="e.g. Dutch-Bangla Bank"
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 transition-all font-sans min-h-[34px]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomBank(false);
                            handlePaymentProofChange('bankName', '');
                          }}
                          className="px-2 py-1 text-[10px] text-slate-500 border border-slate-200 hover:bg-slate-50 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bank Branch Selector */}
                  {draft.bankName && (
                    <div className="space-y-1">
                      <label htmlFor="draft-bank-branch" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Branch Name</label>
                      {!showCustomBranch && BANGLADESHI_BANKS.find(b => b.name === draft.bankName) ? (
                        <select
                          id="draft-bank-branch"
                          value={draft.bankBranch || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'CUSTOM') {
                              setShowCustomBranch(true);
                              handlePaymentProofChange('bankBranch', '');
                              handlePaymentProofChange('bankRoutingNo', '');
                            } else {
                              const selectedBank = BANGLADESHI_BANKS.find(b => b.name === draft.bankName);
                              const selectedBranch = selectedBank?.branches.find(br => br.name === val);
                              handlePaymentProofChange('bankBranch', val);
                              if (selectedBranch) {
                                simulateAutomatedRoutingFetch(draft.bankName || '', val, selectedBranch.routingNo);
                              }
                            }
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 bg-white cursor-pointer min-h-[34px]"
                        >
                          <option value="">-- Select Branch --</option>
                          {BANGLADESHI_BANKS.find(b => b.name === draft.bankName)?.branches.map(br => (
                            <option key={br.name} value={br.name}>{br.name}</option>
                          ))}
                          <option value="CUSTOM">Type custom branch name...</option>
                        </select>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={draft.bankBranch || ''}
                              onChange={(e) => handlePaymentProofChange('bankBranch', e.target.value)}
                              onBlur={() => {
                                if (draft.bankBranch && draft.bankBranch.length > 2) {
                                  const code = generateMockRoutingNumber(draft.bankName || 'Custom', draft.bankBranch || '');
                                  simulateAutomatedRoutingFetch(draft.bankName || 'Custom', draft.bankBranch || '', code);
                                }
                              }}
                              placeholder="e.g. Motijheel Branch"
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 transition-all font-sans min-h-[34px]"
                            />
                            {BANGLADESHI_BANKS.find(b => b.name === draft.bankName) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCustomBranch(false);
                                  handlePaymentProofChange('bankBranch', '');
                                }}
                                className="px-2 py-1 text-[10px] text-slate-500 border border-slate-200 hover:bg-slate-50 rounded"
                              >
                                Select Predefined
                              </button>
                            )}
                          </div>
                          
                          {/* Auto retrieve button for custom branch */}
                          {draft.bankBranch && draft.bankBranch.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const code = generateMockRoutingNumber(draft.bankName || 'Custom', draft.bankBranch || '');
                                simulateAutomatedRoutingFetch(draft.bankName || 'Custom', draft.bankBranch || '', code);
                              }}
                              disabled={isFetchingRouting}
                              className="w-full flex items-center justify-center gap-1 py-1 px-2 border border-blue-200 bg-blue-50/30 text-blue-700 hover:bg-blue-50 text-[10px] font-bold uppercase rounded cursor-pointer min-h-[34px]"
                            >
                              <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
                              Auto-Fetch Routing Code
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Routing Number (Automated) */}
                  {(draft.bankRoutingNo || isFetchingRouting || routingFeedback) ? (
                    <div className="space-y-1 bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="flex items-center justify-between">
                        <label htmlFor="draft-bank-routing" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Branch Routing Number</label>
                        {isFetchingRouting && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            Fetching...
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        id="draft-bank-routing"
                        value={draft.bankRoutingNo || ''}
                        onChange={(e) => handlePaymentProofChange('bankRoutingNo', e.target.value)}
                        placeholder="e.g. 090273181"
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-mono transition-all bg-white min-h-[34px]"
                      />
                      {routingFeedback && (
                        <p className={`text-[9px] font-semibold ${routingFeedback.includes('successfully') || routingFeedback.includes('populated') || routingFeedback.includes('fetched') ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {routingFeedback}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* Transaction ID or Receipt Number */}
                  <div className="space-y-1">
                    <label htmlFor="draft-bank-txid" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Transaction ID / Receipt Number</label>
                    <input
                      type="text"
                      id="draft-bank-txid"
                      value={draft.bankTransactionId || ''}
                      onChange={(e) => handlePaymentProofChange('bankTransactionId', e.target.value)}
                      placeholder="e.g. TXN9824018A or Slip Ref"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-mono transition-all min-h-[34px]"
                    />
                  </div>
                </div>
              )}
              
              {/* Fallback if no specific proof sections are showing but they want general notes or card slip ref */}
              {!profile.paymentMethods?.some(m => m.toLowerCase().includes('mfs')) && !profile.paymentMethods?.includes('Bank transfer') && (
                <div className="text-[10px] text-slate-400 p-2.5 bg-slate-50 rounded border border-slate-100 leading-normal">
                  💡 Payment confirmation references (like Trx ID, bank receipts) display dynamically if <strong>MFS</strong> or <strong>Bank Transfer</strong> methods are accepted in your settings.
                </div>
              )}
            </div>
          </div>

          {/* Card: Live Totals Panel */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Summary</h4>
            
            <div className="space-y-3 pb-4 border-b border-slate-100">
              {tax.taxEnabled && tax.taxInclusive && tax.taxRate > 0 ? (
                <>
                  {/* Gross Subtotal */}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal (Gross)</span>
                    <span className="font-mono font-medium">{formatMoney(grossSubtotal, profile.currency.symbol)}</span>
                  </div>

                  {/* Discount input section */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleDiscountTypeToggle}
                        id="discount-toggle-btn"
                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors underline decoration-dotted flex items-center gap-1 cursor-pointer"
                      >
                        Discount {draft.discountType === 'percentage' ? '(%)' : `(${profile.currency.symbol})`}
                      </button>
                      
                      <div className="relative w-28">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={draft.discountValue || ''}
                          onChange={(e) => handleDiscountValueChange(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full pr-7 pl-2 py-1 text-right text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-800"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                          {draft.discountType === 'percentage' ? (
                            <Percent className="w-3 h-3" />
                          ) : (
                            <span className="text-[10px] font-mono">{profile.currency.symbol}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {draft.discountValue > 0 && (
                      <div className="flex justify-between text-xs text-red-600 font-semibold">
                        <span>Discount Applied (Gross)</span>
                        <span className="font-mono">-{formatMoney(netDiscount, profile.currency.symbol)}</span>
                      </div>
                    )}
                  </div>

                  {/* Net Subtotal */}
                  <div className="flex justify-between text-xs text-slate-500 border-t border-slate-50/50 pt-2 font-medium">
                    <span>Net Subtotal (Excl. Tax)</span>
                    <span className="font-mono">{formatMoney(netSubtotal, profile.currency.symbol)}</span>
                  </div>

                  {/* Extracted Tax */}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Tax ({tax.taxRate}% Included)</span>
                    <span className="font-mono font-medium">{formatMoney(taxAmount, profile.currency.symbol)}</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Standard Exclusive or No Tax mode */}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium">{formatMoney(grossSubtotal, profile.currency.symbol)}</span>
                  </div>

                  {/* Discount input section */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleDiscountTypeToggle}
                        id="discount-toggle-btn"
                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors underline decoration-dotted flex items-center gap-1 cursor-pointer"
                      >
                        Discount {draft.discountType === 'percentage' ? '(%)' : `(${profile.currency.symbol})`}
                      </button>
                      
                      <div className="relative w-28">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={draft.discountValue || ''}
                          onChange={(e) => handleDiscountValueChange(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full pr-7 pl-2 py-1 text-right text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-800"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                          {draft.discountType === 'percentage' ? (
                            <Percent className="w-3 h-3" />
                          ) : (
                            <span className="text-[10px] font-mono">{profile.currency.symbol}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {draft.discountValue > 0 && (
                      <div className="flex justify-between text-xs text-red-600 font-semibold">
                        <span>Discount Applied</span>
                        <span className="font-mono">-{formatMoney(netDiscount, profile.currency.symbol)}</span>
                      </div>
                    )}
                  </div>

                  {/* Tax line */}
                  {tax.taxEnabled && tax.taxRate > 0 && (
                    <div className="flex justify-between text-xs text-slate-500 border-t border-slate-50/50 pt-2">
                      <span>Tax (Added {tax.taxRate}%)</span>
                      <span className="font-mono font-medium">{formatMoney(taxAmount, profile.currency.symbol)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Grand Total panel */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-slate-800">Total Due</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {formatMoney(grandTotal, profile.currency.symbol)}
              </span>
            </div>

            {!draft.customer.name && (
              <div className="text-[10px] text-amber-700 bg-amber-50/70 p-3 rounded border border-amber-100 leading-normal">
                Please provide a <strong>Customer Name</strong> to generate the preview correctly.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Confirmation Notices / Toasts */}
      {paymentNotice && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs py-3 px-4 rounded-lg shadow-xl flex items-center gap-2 border border-slate-800 animate-slideUp font-sans">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{paymentNotice}</span>
        </div>
      )}

      {/* Payment Method Option Prompt */}
      {paymentMethodPrompt && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-150 overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2 text-slate-800">
              <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
              <h3 className="font-bold text-sm uppercase tracking-wide">Select Payment Method</h3>
            </div>
            
            <div className="p-5 space-y-3.5 text-slate-700 text-xs leading-normal font-sans">
              <p>
                You selected <strong className="text-slate-900 font-bold">{paymentMethodPrompt.name}</strong>. How would you like to configure this invoice?
              </p>
              
              <div className="bg-slate-50 p-3 rounded border border-slate-150 space-y-1.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Method Selected</div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  {paymentMethodPrompt.name}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleConfirmSinglePaymentMethod(paymentMethodPrompt.id, paymentMethodPrompt.name)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-3 rounded text-xs transition-all shadow-sm cursor-pointer text-center"
              >
                Proceed with {paymentMethodPrompt.name} Only
              </button>
              
              <button
                type="button"
                onClick={() => handleConfirmMixedPaymentMethod(paymentMethodPrompt.id)}
                className="flex-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2 px-3 rounded text-xs transition-all cursor-pointer text-center"
              >
                Mixed Payment (Keep Multi-Select)
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethodPrompt(null)}
                className="sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold py-2 px-3 rounded text-xs transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Client Prompt */}
      {showSaveClientPrompt && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-150 overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2 text-slate-850">
              <UserPlus className="w-5 h-5 text-emerald-600 shrink-0" />
              <h3 className="font-bold text-sm uppercase tracking-wide">Save Client Info?</h3>
            </div>
            
            <div className="p-5 space-y-3.5 text-xs text-slate-700 leading-normal font-sans">
              <p>
                You have marked this invoice as <strong className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase font-bold font-mono text-[10px]">Paid</strong>. Would you like to save this customer's details to your Saved Clients directory for future use?
              </p>
              
              <div className="bg-slate-50 p-3.5 rounded border border-slate-150 space-y-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-sans">Client Name</span>
                  <strong className="text-slate-850 font-bold">{draft.customer.name}</strong>
                </div>
                {draft.customer.email && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-sans">Email Address</span>
                    <span className="text-slate-800">{draft.customer.email}</span>
                  </div>
                )}
                {draft.customer.phone && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-sans">Phone Number</span>
                    <span className="text-slate-800">{draft.customer.phone}</span>
                  </div>
                )}
                {draft.customer.address && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-sans">Billing Address</span>
                    <span className="text-slate-800 line-clamp-2">{draft.customer.address}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  handleSaveCurrentAsClient();
                  setShowSaveClientPrompt(false);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-2.5 px-3 rounded text-xs transition-all shadow-sm cursor-pointer text-center"
              >
                Yes, Save Client
              </button>
              
              <button
                type="button"
                onClick={() => setShowSaveClientPrompt(false)}
                className="flex-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 px-3 rounded text-xs transition-all cursor-pointer text-center"
              >
                No, Thanks
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

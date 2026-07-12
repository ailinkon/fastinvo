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
  Smartphone,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { InvoiceDraft, LineItem, BusinessProfile, TaxConfig, DiscountType, Client } from '../types';
import { formatMoney, getTodayDateString, DEFAULT_INVOICE_DRAFT } from '../constants';
import { calculateInvoiceTotals, lineTotal } from '../utils/calculations';
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

interface AmountInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  decimalPlaces?: number;
  locale?: string;
  placeholder?: string;
  dataRowIndex?: number;
  dataCellType?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function AmountInput({
  value,
  onChange,
  className = '',
  id,
  autoFocus = false,
  decimalPlaces = 2,
  locale = 'en-US',
  placeholder = '0.00',
  dataRowIndex,
  dataCellType,
  onKeyDown,
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDisplay = (num: number): string => {
    return num.toLocaleString(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  };

  const displayValue = formatDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawStr = e.target.value;
    const digits = rawStr.replace(/\D/g, '');
    
    if (digits === '') {
      onChange(0);
      return;
    }
    
    const parsedInt = parseInt(digits, 10);
    const factor = Math.pow(10, decimalPlaces);
    const newValue = parsedInt / factor;
    
    onChange(newValue);
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    if (document.activeElement === input) {
      const length = input.value.length;
      if (input.selectionStart === 0 && input.selectionEnd === length) {
        return;
      }
      input.setSelectionRange(length, length);
    }
  }, [displayValue]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      id={id}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onFocus={handleFocus}
      className={className}
      placeholder={placeholder}
      data-row-index={dataRowIndex}
      data-cell-type={dataCellType}
      autoFocus={autoFocus}
    />
  );
}

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

  // Checkout & Interactive Payment Wizard states
  const [showPaymentScreen, setShowPaymentScreen] = React.useState(false);
  const [paymentStep, setPaymentStep] = React.useState<'select_method' | 'partial_dialog' | 'summary' | 'partial_setup'>('select_method');
  const [isPartialMode, setIsPartialMode] = React.useState(false);
  const [selectedPaymentMethodOption, setSelectedPaymentMethodOption] = React.useState<string>('');
  const [tempPartialAmount, setTempPartialAmount] = React.useState<string>('');
  const [showPartialModal, setShowPartialModal] = React.useState(false);
  const [modalSelectedMethod, setModalSelectedMethod] = React.useState<string>('Cash');

  // Split payment state
  const [splitAmounts, setSplitAmounts] = React.useState<Record<string, string>>({
    'Cash': '',
    'Bank Transfer': '',
    'EFT': '',
    'MFS': ''
  });
  const [splitMfsWallet, setSplitMfsWallet] = React.useState<string>('bKash');

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
    
    if ((methodId || '').toLowerCase().includes('mfs')) {
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

  // Checkout / Payment Wizard action handlers
  const handleProceedToPaymentClick = () => {
    if (isInvoiceEmpty) return;
    // Validate customer first
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

    // Reset states
    setIsPartialMode(false);
    setSelectedPaymentMethodOption('');
    setTempPartialAmount('');
    
    // Go to step 1
    setShowPaymentScreen(true);
    setPaymentStep('select_method');
  };

  const handleSelectMethod = (method: string) => {
    setSelectedPaymentMethodOption(method);
    // Initialize with full amount so paying in full is a single click away, but editable
    setTempPartialAmount(grandTotal.toFixed(2));
    setPaymentStep('partial_dialog');
  };

  const handleConfirmPartialAmount = () => {
    const parsed = parseFloat(tempPartialAmount);
    if (isNaN(parsed) || parsed < 0) return;

    setDraft(prev => {
      const isPaid = parsed >= grandTotal;
      return {
        ...prev,
        paymentMethod: parsed < grandTotal && parsed > 0 ? `${selectedPaymentMethodOption} (Partial)` : selectedPaymentMethodOption,
        paidAmount: parsed,
        status: isPaid ? 'Paid' : 'Due'
      };
    });
    setPaymentStep('summary');
  };

  const handleConfirmSplitPayment = () => {
    const entries = Object.keys(splitAmounts)
      .map(method => {
        const val = splitAmounts[method];
        const amt = parseFloat(val) || 0;
        return { method, amt };
      })
      .filter(e => e.amt > 0);

    const totalPaid = entries.reduce((sum, e) => sum + e.amt, 0);

    const methodStrings = entries.map(e => {
      const methodName = e.method === 'MFS' ? `MFS (${splitMfsWallet})` : e.method;
      return `${methodName} (${formatMoney(e.amt, profile.currency)})`;
    });

    const finalMethodDesc = methodStrings.length > 0 ? methodStrings.join(' + ') : 'Unpaid';

    setDraft(prev => {
      const isPaid = totalPaid >= grandTotal;
      return {
        ...prev,
        paymentMethod: isPaid ? finalMethodDesc : `${finalMethodDesc} (Partial)`,
        paidAmount: totalPaid,
        status: isPaid ? 'Paid' : 'Due'
      };
    });
    setPaymentStep('summary');
  };

  const handleApplyPartialModal = (amount: number, method: string) => {
    const isPaid = amount >= grandTotal;
    setDraft(prev => ({
      ...prev,
      paidAmount: amount,
      paymentMethod: `${method} (Partial)`,
      status: isPaid ? 'Paid' : 'Due'
    }));
    setShowPartialModal(false);
    setPaymentStep('summary');
  };

  // Calculations derived from current state
  const { items } = draft;
  const validItems = draft.items.filter(item => item.description.trim() !== '' || item.unitPrice > 0);
  const grossSubtotal = Math.round((validItems.reduce((sum, i) => sum + lineTotal(i), 0) + Number.EPSILON) * 100) / 100;

  const { subtotal: netSubtotal, discount: netDiscount, taxAmount, grandTotal } =
    calculateInvoiceTotals(draft.items, draft.discountType, draft.discountValue, tax);

  const isInvoiceEmpty = validItems.length === 0 || grandTotal <= 0;

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
        const alreadySaved = clients.some(c => (c.name || '').toLowerCase() === clientName.toLowerCase() || (draft.customer.email?.trim() && (c.email || '').toLowerCase() === draft.customer.email.trim().toLowerCase()));
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
    if (isInvoiceEmpty) return;
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
    const hasContent = item.description.trim() !== '' || item.unitPrice > 0;
    
    if (isLast && hasContent) {
      updated.push({
        id: Math.random().toString(36).substring(2, 9),
        description: '',
        quantity: 1,
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
      quantity: 1,
      unitPrice: 0
    });
    setDraft({ ...draft, items: updated });
  };

  const deleteRow = (index: number) => {
    let updated = [...draft.items];
    updated.splice(index, 1);
    
    // Ensure there is always at least one row in the table
    if (updated.length === 0) {
      updated = [{ id: '1', description: '', quantity: 1, unitPrice: 0 }];
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

  if (showPaymentScreen) {
    return (
      <div className="max-w-xl mx-auto my-4 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden font-sans relative" id="payment-checkout-container">
        {/* Checkout Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="font-extrabold text-sm uppercase tracking-wider">RECORD PAYMENT</h2>
              <p className="text-[10px] text-slate-400">Log how the customer paid</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPaymentScreen(false)}
            className="text-xs text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded px-2.5 py-1.5 transition-all cursor-pointer font-bold"
          >
            ← Back to Editor
          </button>
        </div>

        {paymentStep === 'select_method' && (
          <div className="p-6 space-y-6">
            {/* Bill amount banner */}
            <div className="text-center bg-slate-50 p-5 rounded-xl border border-slate-150/60 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Bill Amount</span>
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-1 block">
                {formatMoney(grandTotal, profile.currency)}
              </span>
            </div>

            {/* Selector Options */}
            <div className="space-y-4">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Payment Option</span>
              
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => handleSelectMethod('Cash')}
                  className="p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer text-center group active:scale-95 shadow-xs"
                >
                  <Coins className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMethod('Bank Transfer')}
                  className="p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer text-center group active:scale-95 shadow-xs"
                >
                  <Building2 className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Bank Transfer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMethod('EFT')}
                  className="p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer text-center group active:scale-95 shadow-xs"
                >
                  <CreditCard className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">EFT</span>
                </button>

                {/* MFS Option Button */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethodOption(selectedPaymentMethodOption === 'MFS' ? '' : 'MFS')}
                  className={`p-5 hover:bg-slate-50 border rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer text-center group active:scale-95 shadow-xs ${
                    selectedPaymentMethodOption === 'MFS' ? 'border-indigo-500 bg-indigo-50/10 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Smartphone className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">MFS</span>
                </button>
              </div>

              {/* Sub-MFS options display if MFS is selected */}
              {selectedPaymentMethodOption === 'MFS' && (
                <div className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-4 space-y-3 animate-fadeIn">
                  <span className="block text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Select Mobile Wallet Provider</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['bKash', 'Nagad', 'Rocket', 'Upay'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMethod(`MFS (${m})`)}
                        className="py-2.5 px-3 border border-indigo-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer text-center active:scale-95"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}              {/* Partial Payment Option Button */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPartialMode(true);
                    setSplitAmounts({
                      'Cash': (grandTotal / 2).toFixed(2),
                      'Bank Transfer': '',
                      'EFT': '',
                      'MFS': ''
                    });
                    setSplitMfsWallet('bKash');
                    setPaymentStep('partial_setup');
                  }}
                  className="w-full py-4 px-4 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <Percent className="w-4.5 h-4.5 text-amber-600 animate-pulse animate-duration-1000" />
                  <span>Pay Partially / Customize Amount</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
                  Select this to enter specific receipt amounts across different options and calculate total balance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Partial Setup step */}
        {paymentStep === 'partial_setup' && (
          <div className="p-6 space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center p-3 bg-amber-50 border border-amber-200 rounded-full">
                <Percent className="w-6 h-6 text-amber-600 animate-pulse" />
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
                Configure Split / Partial Payment
              </h3>
              <p className="text-[11px] text-slate-400">Input payment amounts for different options to add & calculate automatically</p>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 shadow-xs">
              {/* Bill vs Paid Info */}
              <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-200/80 pb-3">
                <span className="text-slate-500 font-sans">Total Bill Amount</span>
                <span className="font-mono text-slate-900 font-black text-sm">{formatMoney(grandTotal, profile.currency)}</span>
              </div>

              {/* Dynamic calculated Sum Total Received */}
              {(() => {
                const totalSplitReceived = (
                  (parseFloat(splitAmounts['Cash']) || 0) +
                  (parseFloat(splitAmounts['Bank Transfer']) || 0) +
                  (parseFloat(splitAmounts['EFT']) || 0) +
                  (parseFloat(splitAmounts['MFS']) || 0)
                );
                return (
                  <div className="bg-blue-50/45 border border-blue-150 rounded-xl p-4 flex justify-between items-center shadow-2xs">
                    <div>
                      <span className="block text-[10px] font-extrabold text-blue-700 uppercase tracking-wider font-sans">
                        Amount Received (Total)
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Sum of all input methods below</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-lg text-blue-900">
                        {formatMoney(totalSplitReceived, profile.currency)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Selection and input of Payment Options */}
              <div className="space-y-3 pt-2 border-t border-slate-200/60">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Enter Amount for Each Option</span>
                
                <div className="space-y-3">
                  {[
                    { id: 'Cash', icon: Coins, color: 'text-emerald-500', bg: 'bg-emerald-50/30' },
                    { id: 'Bank Transfer', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50/30' },
                    { id: 'EFT', icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-50/30' },
                    { id: 'MFS', icon: Smartphone, color: 'text-indigo-500', bg: 'bg-indigo-50/30' }
                  ].map((opt) => {
                    const IconComp = opt.icon;
                    const val = splitAmounts[opt.id] || '';
                    
                    // Calculate remaining amount dynamically to provide as a single-click prefill helper
                    const currentOtherTotal = Object.keys(splitAmounts)
                      .filter(k => k !== opt.id)
                      .reduce((sum, k) => sum + (parseFloat(splitAmounts[k]) || 0), 0);
                    const remainingForThis = Math.max(0, grandTotal - currentOtherTotal);

                    return (
                      <div key={opt.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 transition-all space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg ${opt.bg}`}>
                              <IconComp className={`w-4 h-4 ${opt.color}`} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-800 font-sans">{opt.id}</span>
                              {opt.id === 'MFS' && (
                                <span className="text-[9px] text-indigo-600 font-bold block font-sans">
                                  via {splitMfsWallet}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick helper buttons */}
                          <div className="flex gap-1">
                            {remainingForThis > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSplitAmounts(prev => ({
                                    ...prev,
                                    [opt.id]: remainingForThis.toFixed(2)
                                  }));
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[9px] font-extrabold cursor-pointer transition-colors font-sans"
                              >
                                Full Due
                              </button>
                            )}
                            {val && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSplitAmounts(prev => ({
                                    ...prev,
                                    [opt.id]: ''
                                  }));
                                }}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold cursor-pointer transition-colors font-sans"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Relative Input field with currency symbol */}
                        <div className="relative">
                          <AmountInput
                            value={parseFloat(val) || 0}
                            onChange={(newValue) => {
                              setSplitAmounts(prev => ({
                                ...prev,
                                [opt.id]: newValue === 0 ? '' : String(newValue)
                              }));
                            }}
                            decimalPlaces={profile.currency.decimalPlaces}
                            locale={profile.currency.locale}
                            placeholder="0.00"
                            className="w-full pr-8 pl-3.5 py-2 border border-slate-250 rounded-lg text-xs font-mono font-bold text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 font-mono font-bold text-xs">
                            {profile.currency.symbol}
                          </div>
                        </div>

                        {/* Nested wallet selector specifically for Mobile Financial Services option */}
                        {opt.id === 'MFS' && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-fadeIn">
                            <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
                              Select MFS Operator Wallet
                            </span>
                            <div className="grid grid-cols-4 gap-1">
                              {['bKash', 'Nagad', 'Rocket', 'Upay'].map((wallet) => {
                                const isWalletActive = splitMfsWallet === wallet;
                                return (
                                  <button
                                    key={wallet}
                                    type="button"
                                    onClick={() => setSplitMfsWallet(wallet)}
                                    className={`py-1 border rounded text-[9px] font-extrabold transition-all cursor-pointer text-center active:scale-95 ${
                                      isWalletActive
                                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-black'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/10'
                                    }`}
                                  >
                                    {wallet}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Calculator breakdown */}
              {(() => {
                const totalSplitReceived = (
                  (parseFloat(splitAmounts['Cash']) || 0) +
                  (parseFloat(splitAmounts['Bank Transfer']) || 0) +
                  (parseFloat(splitAmounts['EFT']) || 0) +
                  (parseFloat(splitAmounts['MFS']) || 0)
                );
                return (
                  <div className="bg-white rounded-xl p-4 border border-slate-150 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between items-center font-sans">
                      <span className="font-semibold text-slate-500">Amount Received (Total)</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatMoney(totalSplitReceived, profile.currency)}
                      </span>
                    </div>
                    
                    {(() => {
                      if (totalSplitReceived >= grandTotal) {
                        return (
                          <div className="flex justify-between items-center text-emerald-700 font-semibold border-t border-slate-100 pt-2 font-sans">
                            <span>Change to Return</span>
                            <span className="font-mono font-black text-sm">
                              {formatMoney(totalSplitReceived - grandTotal, profile.currency)}
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex justify-between items-center text-amber-700 font-semibold border-t border-slate-100 pt-2 font-sans">
                            <span>Remaining Balance Due</span>
                            <span className="font-mono font-black text-sm">
                              {formatMoney(grandTotal - totalSplitReceived, profile.currency)}
                            </span>
                          </div>
                        );
                      }
                    })()}

                    {/* Status Badge */}
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 font-sans">
                      <span className="font-semibold text-slate-500">Payment Status</span>
                      {(() => {
                        if (totalSplitReceived >= grandTotal) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                              ✓ PAID
                            </span>
                          );
                        } else if (totalSplitReceived > 0) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                              ⚠ DUE (PARTIAL)
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                              UNPAID
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setIsPartialMode(false);
                    setPaymentStep('select_method');
                  }}
                  className="flex-1 bg-white hover:bg-slate-55 border border-slate-200 font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer text-center text-slate-700 shadow-xs active:scale-95"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSplitPayment}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm cursor-pointer text-center active:scale-95"
                >
                  Confirm & Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enter Received Amount step (re-engineered from partial_dialog) */}
        {paymentStep === 'partial_dialog' && (
          <div className="p-6 space-y-6 animate-fadeIn">
            {/* Header with chosen payment method icon */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-3.5 bg-blue-50 border border-blue-100 rounded-full">
                {(selectedPaymentMethodOption || '').toLowerCase().includes('cash') ? (
                  <Coins className="w-6 h-6 text-emerald-500" />
                ) : (selectedPaymentMethodOption || '').toLowerCase().includes('bank') ? (
                  <Building2 className="w-6 h-6 text-blue-500" />
                ) : (selectedPaymentMethodOption || '').toLowerCase().includes('eft') ? (
                  <CreditCard className="w-6 h-6 text-purple-500" />
                ) : (
                  <Smartphone className="w-6 h-6 text-indigo-500" />
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Payment Option: <span className="text-slate-800 font-extrabold">{selectedPaymentMethodOption}</span>
              </h3>
              <p className="text-[11px] text-slate-400">Enter the payment amount received to calculate status & change</p>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 shadow-xs">
              {/* Bill vs Paid Info */}
              <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-200/80 pb-3">
                <span className="text-slate-500">Total Bill Amount</span>
                <span className="font-mono text-slate-900 font-black text-sm">{formatMoney(grandTotal, profile.currency)}</span>
              </div>

              {/* Amount input box */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="checkout-amount-received" className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Amount Received ({profile.currency.symbol})
                  </label>
                  <button
                    type="button"
                    onClick={() => setTempPartialAmount(grandTotal.toFixed(2))}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer font-sans"
                  >
                    Paid in Full
                  </button>
                </div>
                <div className="relative">
                  <AmountInput
                    id="checkout-amount-received"
                    value={parseFloat(tempPartialAmount) || 0}
                    onChange={(val) => setTempPartialAmount(String(val))}
                    decimalPlaces={profile.currency.decimalPlaces}
                    locale={profile.currency.locale}
                    placeholder="0.00"
                    className="w-full pr-8 pl-3.5 py-3 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400 font-mono font-bold text-sm">
                    {profile.currency.symbol}
                  </div>
                </div>
              </div>

              {/* Live Calculator breakdown */}
              <div className="bg-white rounded-xl p-4 border border-slate-150 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Amount Received</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatMoney(parseFloat(tempPartialAmount) || 0, profile.currency)}
                  </span>
                </div>
                
                {(() => {
                  const val = parseFloat(tempPartialAmount) || 0;
                  if (val >= grandTotal) {
                    return (
                      <div className="flex justify-between items-center text-emerald-700 font-semibold border-t border-slate-100 pt-2">
                        <span>Change to Return</span>
                        <span className="font-mono font-black text-sm">
                          {formatMoney(val - grandTotal, profile.currency)}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex justify-between items-center text-amber-700 font-semibold border-t border-slate-100 pt-2">
                        <span>Remaining Balance Due</span>
                        <span className="font-mono font-black text-sm">
                          {formatMoney(grandTotal - val, profile.currency)}
                        </span>
                      </div>
                    );
                  }
                })()}

                {/* Status Badge */}
                <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                  <span className="font-semibold text-slate-500 font-sans">Payment Status</span>
                  {(() => {
                    const val = parseFloat(tempPartialAmount) || 0;
                    if (val >= grandTotal) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider font-sans">
                          ✓ PAID
                        </span>
                      );
                    } else if (val > 0) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider font-sans">
                          ⚠ DUE (PARTIAL)
                        </span>
                      );
                    } else {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider font-sans">
                          UNPAID
                        </span>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentStep('select_method')}
                  className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer text-center text-slate-700 shadow-xs active:scale-95"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPartialAmount}
                  disabled={!tempPartialAmount || parseFloat(tempPartialAmount) < 0}
                  className={`flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm cursor-pointer text-center active:scale-95 ${
                    (!tempPartialAmount || parseFloat(tempPartialAmount) < 0) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Confirm & Next
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentStep === 'summary' && (
          <div className="p-6 space-y-6 animate-fadeIn">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center border-b border-slate-100 pb-3">
              Invoice Payment Summary
            </h3>

            {/* Calculations display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5 font-sans text-xs shadow-xs">
              <div className="flex justify-between items-center text-slate-500 font-semibold">
                <span>Bill Amount</span>
                <span className="font-mono text-slate-850 font-bold">{formatMoney(grandTotal, profile.currency)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 font-semibold">
                <span>Paid Amount</span>
                <span className="font-mono text-slate-850 font-bold">
                  {formatMoney(draft.paidAmount || 0, profile.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-3 mt-1">
                {draft.paidAmount >= grandTotal ? (
                  <>
                    <span className="text-emerald-700 font-bold uppercase text-[10px] tracking-wider">
                      Change Amount
                    </span>
                    <span className="font-mono font-black text-emerald-600 text-sm">
                      {formatMoney((draft.paidAmount || 0) - grandTotal, profile.currency)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-red-700 font-bold uppercase text-[10px] tracking-wider">
                      Remaining Due
                    </span>
                    <span className="font-mono font-black text-red-600 text-sm">
                      {formatMoney(grandTotal - (draft.paidAmount || 0), profile.currency)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Paid / Due Status Indicator with symbols */}
            <div className="flex justify-center py-1">
              {draft.paidAmount >= grandTotal ? (
                <div className="flex items-center gap-2.5 bg-emerald-100/70 text-emerald-800 border border-emerald-300 px-5 py-2.5 rounded-full text-xs font-extrabold shadow-xs">
                  <Check className="w-4.5 h-4.5 text-emerald-600 stroke-[3px]" />
                  <span>Paid</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-red-100/70 text-red-800 border border-red-300 px-5 py-2.5 rounded-full text-xs font-extrabold shadow-xs">
                  <span className="text-red-600 font-black text-sm">✖</span>
                  <span>Due</span>
                </div>
              )}
            </div>

            {/* Calendar Due Date input if payment status is due */}
            {draft.paidAmount < grandTotal && (
              <div className="space-y-2 p-4 bg-amber-50/50 rounded-xl border border-amber-200/50 text-left">
                <label htmlFor="checkout-due-date" className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  id="checkout-due-date"
                  value={draft.metadata.dueDate || ''}
                  min={draft.metadata.issueDate}
                  onChange={(e) => handleMetadataChange('dueDate', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 font-sans"
                />
                {draft.metadata.dueDate && draft.metadata.dueDate < draft.metadata.issueDate && (
                  <p className="text-[11px] text-red-600 font-bold mt-1">
                    Due date is before issue date
                  </p>
                )}
                <p className="text-[10px] text-amber-700">Select the date on which this partial remainder is expected.</p>
              </div>
            )}

            {/* Confirm Checkout Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentScreen(false);
                  onPreview();
                }}
                id="checkout-btn-finish"
                className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span>Finish & Go to Preview</span>
                <Check className="w-4.5 h-4.5 text-emerald-400 stroke-[2px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
            disabled={isInvoiceEmpty}
            id="editor-btn-preview"
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded transition-all shadow-sm min-h-[44px] ${
              isInvoiceEmpty
                ? 'bg-slate-250 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer'
            }`}
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
          
          {/* Card: Document Details */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Document Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  value={draft.metadata.dueDate || ''}
                  min={draft.metadata.issueDate}
                  onChange={(e) => handleMetadataChange('dueDate', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 transition-all"
                />
                {draft.metadata.dueDate && draft.metadata.dueDate < draft.metadata.issueDate && (
                  <p className="text-[11px] text-red-600 font-bold mt-1">
                    Due date is before issue date
                  </p>
                )}
              </div>
            </div>
          </div>
          
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
                    const rowTotal = lineTotal(item);
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
                            <AmountInput
                              value={item.unitPrice || 0}
                              onChange={(val) => handleItemChange(index, 'unitPrice', String(val))}
                              onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                              decimalPlaces={profile.currency.decimalPlaces}
                              locale={profile.currency.locale}
                              placeholder="0.00"
                              className="w-full bg-transparent py-1 px-1.5 text-right border border-transparent rounded hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none text-sm text-slate-800 font-mono transition-all"
                              dataRowIndex={index}
                              dataCellType="unitPrice"
                            />
                            {errors[`price-${index}`] && (
                              <span className="absolute right-0 top-7 text-[9px] text-red-500 whitespace-nowrap bg-white px-1 border border-red-100 rounded shadow-xs z-10">{errors[`price-${index}`]}</span>
                            )}
                          </div>
                        </td>

                        {/* Auto-calculated line total */}
                        <td className="py-2 pl-3 text-right text-sm font-semibold text-slate-700 font-mono">
                          {formatMoney(rowTotal, profile.currency)}
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

        </div>

        {/* Right Column: Invoice Metadata & Totals */}
        <div className="lg:col-span-1 space-y-5">

          {/* Card: Live Totals Panel */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Summary</h4>
            
            <div className="space-y-3 pb-4 border-b border-slate-100">
              {tax.taxEnabled && tax.taxInclusive && tax.taxRate > 0 ? (
                <>
                  {/* Subtotal (Excl. Tax) */}
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>Subtotal (Excl. Tax)</span>
                    <span className="font-mono">{formatMoney(netSubtotal, profile.currency)}</span>
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
                        <span className="font-mono">-{formatMoney(netDiscount, profile.currency)}</span>
                      </div>
                    )}
                  </div>

                  {/* Extracted Tax */}
                  <div className="flex justify-between text-xs text-slate-500 border-t border-slate-50/50 pt-2">
                    <span>{tax.taxName || 'Tax'} ({tax.taxRate}% Included)</span>
                    <span className="font-mono font-medium">{formatMoney(taxAmount, profile.currency)}</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Standard Exclusive or No Tax mode */}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium">{formatMoney(grossSubtotal, profile.currency)}</span>
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
                        <span className="font-mono">-{formatMoney(netDiscount, profile.currency)}</span>
                      </div>
                    )}
                  </div>

                  {/* Tax line */}
                  {tax.taxEnabled && tax.taxRate > 0 && (
                    <div className="flex justify-between text-xs text-slate-500 border-t border-slate-50/50 pt-2">
                      <span>{tax.taxName || 'Tax'} (Added {tax.taxRate}%)</span>
                      <span className="font-mono font-medium">{formatMoney(taxAmount, profile.currency)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Grand Total panel */}
            <div className="flex justify-between items-center pt-1 pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800">Total Due</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {formatMoney(grandTotal, profile.currency)}
              </span>
            </div>

            {/* Proceed to Payment Button */}
            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={handleProceedToPaymentClick}
                disabled={isInvoiceEmpty}
                className={`w-full font-bold py-3 px-4 rounded text-xs transition-all shadow-md flex items-center justify-center gap-2 min-h-[44px] ${
                  isInvoiceEmpty
                    ? 'bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer'
                }`}
              >
                <span>Proceed to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {isInvoiceEmpty && (
                <p className="text-[11px] text-amber-600 text-center font-bold bg-amber-50 border border-amber-200 rounded-lg p-2 leading-tight">
                  Add at least one line item first.
                </p>
              )}
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

      {/* Partial Payment Modal Dialog */}
      {showPartialModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans" id="partial-payment-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-150 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <Percent className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Configure Partial Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPartialModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Total Invoice Due Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Due Amount</span>
                  <span className="text-lg font-black text-slate-800 font-mono">
                    {formatMoney(grandTotal, profile.currency)}
                  </span>
                </div>
                <div className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider">
                  Partial Mode
                </div>
              </div>

              {/* Input: Specific Payment Amount */}
              <div className="space-y-1.5">
                <label htmlFor="modal-partial-amount-input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Payment Amount Received ({profile.currency.symbol})
                </label>
                <div className="relative">
                  <AmountInput
                    id="modal-partial-amount-input"
                    value={parseFloat(tempPartialAmount) || 0}
                    onChange={(val) => setTempPartialAmount(String(val))}
                    decimalPlaces={profile.currency.decimalPlaces}
                    locale={profile.currency.locale}
                    placeholder="0.00"
                    className="w-full pr-8 pl-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 font-mono font-bold text-sm">
                    {profile.currency.symbol}
                  </div>
                </div>
                {parseFloat(tempPartialAmount) >= grandTotal && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    Note: Amount is greater than or equal to total bill. This will fully pay the invoice.
                  </p>
                )}
              </div>

              {/* Live Remaining Balance and Status Breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Remaining Balance Due</span>
                  <span className="font-mono font-bold text-slate-800">
                    {(() => {
                      const amount = parseFloat(tempPartialAmount) || 0;
                      const remaining = Math.max(0, grandTotal - amount);
                      return formatMoney(remaining, profile.currency);
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-2 mt-1">
                  <span className="font-semibold text-slate-500">Calculated Invoice Status</span>
                  {(() => {
                    const amount = parseFloat(tempPartialAmount) || 0;
                    if (amount >= grandTotal) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                          Paid (Fully paid)
                        </span>
                      );
                    } else if (amount > 0) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          Due (Partially paid)
                        </span>
                      );
                    } else {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                          Unpaid
                        </span>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Payment Method Selector inside modal */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Cash', icon: Coins, color: 'text-emerald-500' },
                    { id: 'Bank Transfer', icon: Building2, color: 'text-blue-500' },
                    { id: 'EFT', icon: CreditCard, color: 'text-purple-500' },
                    { id: 'MFS (bKash)', icon: Smartphone, color: 'text-pink-500' },
                    { id: 'MFS (Nagad)', icon: Smartphone, color: 'text-orange-500' },
                    { id: 'MFS (Rocket)', icon: Smartphone, color: 'text-violet-500' }
                  ].map((m) => {
                    const IconComp = m.icon;
                    const isSel = modalSelectedMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModalSelectedMethod(m.id)}
                        className={`p-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                          isSel 
                            ? 'bg-blue-50 text-blue-700 border-blue-400 ring-1 ring-blue-300 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 ${m.color}`} />
                        <span>{m.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowPartialModal(false)}
                className="flex-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 px-3 rounded-lg text-xs transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const amount = parseFloat(tempPartialAmount) || 0;
                  handleApplyPartialModal(amount, modalSelectedMethod);
                }}
                disabled={!tempPartialAmount || parseFloat(tempPartialAmount) < 0}
                className={`flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition-all shadow-sm cursor-pointer text-center ${
                  (!tempPartialAmount || parseFloat(tempPartialAmount) < 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

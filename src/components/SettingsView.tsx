/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Receipt, 
  Coins, 
  Upload, 
  Trash2, 
  FileText, 
  Percent, 
  Info,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Wallet,
  Smartphone,
  Sun,
  Moon
} from 'lucide-react';
import { BusinessProfile, TaxConfig, Currency } from '../types';
import { POPULAR_CURRENCIES, formatMoney } from '../constants';
import { normalizeNumericInput, parseNumericInput } from '../utils/normalizeNumericInput';
import PhoneInputWithCountry from './PhoneInputWithCountry';

interface SettingsViewProps {
  profile: BusinessProfile;
  setProfile: (profile: BusinessProfile) => void;
  tax: TaxConfig;
  setTax: (tax: TaxConfig) => void;
  onSave?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const MFS_OPTIONS = ['Bkash', 'Celsin', 'Nagad', 'Rocket', 'Upay', 'M-Cash'];

const PAYMENT_METHOD_OPTIONS = [
  { id: 'Cash', name: 'Cash', desc: 'Direct physical currency' },
  { id: 'Card', name: 'Card', desc: 'Credit, debit, or smart card' },
  { id: 'Bank transfer', name: 'Bank transfer', desc: 'ACH, direct deposit, or wire' },
  { id: 'MFS Transfer', name: 'MFS Transfer', desc: 'Mobile personal number transfer' },
  { id: 'MFS merchant pay', name: 'MFS merchant pay', desc: 'Mobile merchant counter payment' }
];

const LOCALES_OPTIONS = [
  { value: 'en-US', label: 'US/Generic (1,234.56)' },
  { value: 'en-GB', label: 'UK (1,234.56)' },
  { value: 'de-DE', label: 'German/Euro (1.234,56)' },
  { value: 'fr-FR', label: 'French (1 234,56)' },
  { value: 'bn-BD', label: 'Bangladesh (1,234.56)' },
  { value: 'en-IN', label: 'India Lakh/Crore (12,345.67)' },
  { value: 'ja-JP', label: 'Japan (No decimals, 1,234)' },
  { value: 'es-ES', label: 'Spanish (1.234,56)' },
  { value: 'it-IT', label: 'Italian (1.234,56)' },
];

export default function SettingsView({ profile, setProfile, tax, setTax, onSave, isDark, onToggleTheme }: SettingsViewProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paymentSubTab, setPaymentSubTab] = useState<'methods' | 'mfs' | 'instructions'>('methods');

  const currentMethods = profile.paymentMethods || [];

  const handleTogglePaymentMethod = (methodId: string) => {
    let updated: string[];
    if (currentMethods.includes(methodId)) {
      updated = currentMethods.filter(m => m !== methodId);
    } else {
      updated = [...currentMethods, methodId];
    }
    handleProfileChange('paymentMethods', updated);
  };

  // Custom currency support state
  const [isCustomCurrency, setIsCustomCurrency] = useState(
    !POPULAR_CURRENCIES.some(c => c.code === profile.currency.code)
  );
  
  const [customCode, setCustomCode] = useState(profile.currency.code);
  const [customSymbol, setCustomSymbol] = useState(profile.currency.symbol);

  // Advanced currency support states
  const currentLocale = profile.currency.locale || 'en-US';
  const isCustomLocale = !LOCALES_OPTIONS.some(o => o.value === currentLocale);
  const [customLocaleInput, setCustomLocaleInput] = useState(isCustomLocale ? currentLocale : '');

  useEffect(() => {
    const isCustom = !LOCALES_OPTIONS.some(o => o.value === (profile.currency.locale || 'en-US'));
    if (isCustom) {
      setCustomLocaleInput(profile.currency.locale || 'en-US');
    }
  }, [profile.currency.locale]);

  const handleCurrencyFieldChange = (field: 'locale' | 'symbolPlacement' | 'decimalPlaces', val: any) => {
    const updatedCur: Currency = {
      ...profile.currency,
      [field]: val
    };
    handleProfileChange('currency', updatedCur);
  };

  const handleLocaleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      const defaultCustom = customLocaleInput || 'en-US';
      handleCurrencyFieldChange('locale', defaultCustom);
    } else {
      handleCurrencyFieldChange('locale', val);
    }
  };

  const handleCustomLocaleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setCustomLocaleInput(val);
    if (val) {
      handleCurrencyFieldChange('locale', val);
    }
  };

  // Handle text field changes for profile
  const handleProfileChange = (key: keyof BusinessProfile, value: any) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    triggerSuccessFeedback("Settings saved to local storage");
  };

  // Handle tax config changes
  const handleTaxChange = (key: keyof TaxConfig, value: any) => {
    const updated = { ...tax, [key]: value };
    setTax(updated);
    triggerSuccessFeedback("Tax configuration updated");
  };

  const triggerSuccessFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Logo file processing (Base64)
  const processLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    
    // Limit file size to ~1.5MB for comfortable localStorage usage
    if (file.size > 1.5 * 1024 * 1024) {
      alert('Logo image is too large. Please upload an image under 1.5MB for better app performance.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        handleProfileChange('logo', e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const removeLogo = () => {
    handleProfileChange('logo', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Currency selection handler
  const handleCurrencySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setIsCustomCurrency(true);
      const newCurrency: Currency = {
        code: customCode || 'CUSTOM',
        symbol: customSymbol || '¤',
        label: 'Custom Currency',
        locale: 'en-US',
        symbolPlacement: 'before',
        decimalPlaces: 2
      };
      handleProfileChange('currency', newCurrency);
    } else {
      setIsCustomCurrency(false);
      const selected = POPULAR_CURRENCIES.find(c => c.code === val);
      if (selected) {
        handleProfileChange('currency', selected);
      }
    }
  };

  const handleCustomCurrencyChange = (field: 'code' | 'symbol', val: string) => {
    if (field === 'code') {
      const codeUpper = val.toUpperCase().slice(0, 5);
      setCustomCode(codeUpper);
      const updatedCur: Currency = {
        code: codeUpper,
        symbol: customSymbol,
        label: 'Custom Currency',
        locale: profile.currency.locale || 'en-US',
        symbolPlacement: profile.currency.symbolPlacement || 'before',
        decimalPlaces: profile.currency.decimalPlaces !== undefined ? profile.currency.decimalPlaces : 2
      };
      handleProfileChange('currency', updatedCur);
    } else {
      setCustomSymbol(val);
      const updatedCur: Currency = {
        code: customCode,
        symbol: val,
        label: 'Custom Currency',
        locale: profile.currency.locale || 'en-US',
        symbolPlacement: profile.currency.symbolPlacement || 'before',
        decimalPlaces: profile.currency.decimalPlaces !== undefined ? profile.currency.decimalPlaces : 2
      };
      handleProfileChange('currency', updatedCur);
    }
  };
  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="settings-view-container">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">Settings</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure your business profile, invoice counter, currency, and tax regulations.</p>
        </div>
        
        {successMessage && (
          <div className="mt-2 md:mt-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-900/50 transition-all">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            {successMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Forms */}
        <div className="md:col-span-2 space-y-5">
          
          {/* Card 1: Business Details */}
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Business Profile</h3>
            </div>

            {/* Logo Upload Box */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business Logo</label>
              <div className="flex items-start gap-4">
                {profile.logo ? (
                  <div className="relative group w-24 h-24 border border-slate-200 dark:border-slate-700 rounded overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2 shadow-xs">
                    <img src={profile.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      id="remove-logo-btn"
                      className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    id="logo-drag-drop-zone"
                    className={`flex-1 max-w-md h-24 border border-dashed rounded flex flex-col items-center justify-center p-3 cursor-pointer text-center transition-colors ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50/30 dark:bg-slate-950/10'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Drag logo here, or <span className="text-blue-600 dark:text-blue-400 underline">browse</span></p>
                    <p className="text-[9px] text-slate-400 mt-0.5">PNG, JPG, SVG or WebP. Max 1.5MB.</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                  id="logo-file-input"
                />
              </div>
            </div>

            {/* Profile fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="company-name-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business / Company Name</label>
                <input
                  type="text"
                  id="company-name-input"
                  value={profile.companyName}
                  onChange={(e) => handleProfileChange('companyName', e.target.value)}
                  placeholder="e.g. Acme Studio Ltd"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="company-address-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business Address (Multi-line)</label>
                <textarea
                  id="company-address-input"
                  rows={2}
                  value={profile.address}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  placeholder="e.g. 100 Innovation Way&#10;Suite 4B&#10;Melbourne VIC 3000"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all resize-none bg-white dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="company-phone-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</label>
                <PhoneInputWithCountry
                  id="company-phone-input"
                  value={profile.phone}
                  onChange={(newVal) => handleProfileChange('phone', newVal)}
                  placeholder="e.g. 3 9000 0000"
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="company-email-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  id="company-email-input"
                  value={profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  placeholder="e.g. billing@acmestudio.com"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="company-website-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Website <span className="text-slate-400 text-[9px] font-normal lowercase">(Optional)</span></label>
                <input
                  type="url"
                  id="company-website-input"
                  value={profile.website}
                  onChange={(e) => handleProfileChange('website', e.target.value)}
                  placeholder="e.g. www.acmestudio.com"
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="space-y-1">
                  <label htmlFor="tax-reg-label-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reg. Type Label</label>
                  <input
                    type="text"
                    id="tax-reg-label-input"
                    value={profile.taxRegLabel}
                    onChange={(e) => handleProfileChange('taxRegLabel', e.target.value)}
                    placeholder="ABN, BIN, VAT"
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="tax-reg-num-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registration No.</label>
                  <input
                    type="text"
                    id="tax-reg-num-input"
                    value={profile.taxRegNumber}
                    onChange={(e) => handleProfileChange('taxRegNumber', e.target.value)}
                    placeholder="e.g. 12 345 678 910"
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Currency & Formatting */}
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Coins className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Currency & Formatting</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="currency-select" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice Currency</label>
                <select
                  id="currency-select"
                  value={isCustomCurrency ? 'CUSTOM' : profile.currency.code}
                  onChange={handleCurrencySelect}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                >
                  {POPULAR_CURRENCIES.map((cur) => (
                    <option key={cur.code} value={cur.code}>{cur.label}</option>
                  ))}
                  <option value="CUSTOM">Custom Option...</option>
                </select>
              </div>

              {isCustomCurrency && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="custom-code-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Currency Code</label>
                    <input
                      type="text"
                      id="custom-code-input"
                      value={customCode}
                      onChange={(e) => handleCustomCurrencyChange('code', e.target.value)}
                      placeholder="e.g. SGD"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="custom-symbol-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Symbol</label>
                    <input
                      type="text"
                      id="custom-symbol-input"
                      value={customSymbol}
                      onChange={(e) => handleCustomCurrencyChange('symbol', e.target.value)}
                      placeholder="e.g. S$"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
              )}

              {/* Advanced Currency Formatting Options */}
              <div className="sm:col-span-2 border-t border-slate-150 dark:border-slate-800 pt-4 mt-2 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Advanced formatting settings
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Locale Dropdown */}
                  <div className="space-y-1">
                    <label htmlFor="locale-select" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Locale / Number Format</label>
                    <select
                      id="locale-select"
                      value={isCustomLocale ? 'CUSTOM' : (profile.currency.locale || 'en-US')}
                      onChange={handleLocaleSelect}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                    >
                      {LOCALES_OPTIONS.map((loc) => (
                        <option key={loc.value} value={loc.value}>{loc.label}</option>
                      ))}
                      <option value="CUSTOM">Custom IETF Code...</option>
                    </select>
                  </div>

                  {/* Symbol Placement */}
                  <div className="space-y-1">
                    <label htmlFor="placement-select" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Symbol Placement</label>
                    <select
                      id="placement-select"
                      value={profile.currency.symbolPlacement || 'before'}
                      onChange={(e) => handleCurrencyFieldChange('symbolPlacement', e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                    >
                      <option value="before">Before ($100.00)</option>
                      <option value="before-space">Before with Space ($ 100.00)</option>
                      <option value="after">After (100.00$)</option>
                      <option value="after-space">After with Space (100.00 $)</option>
                    </select>
                  </div>

                  {/* Decimal Places */}
                  <div className="space-y-1">
                    <label htmlFor="decimal-select" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Decimal Places</label>
                    <select
                      id="decimal-select"
                      value={profile.currency.decimalPlaces !== undefined ? String(profile.currency.decimalPlaces) : '2'}
                      onChange={(e) => handleCurrencyFieldChange('decimalPlaces', parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                    >
                      <option value="0">0 (e.g., $100)</option>
                      <option value="1">1 (e.g., $100.0)</option>
                      <option value="2">2 (e.g., $100.00)</option>
                      <option value="3">3 (e.g., $100.000)</option>
                      <option value="4">4 (e.g., $100.0000)</option>
                    </select>
                  </div>
                </div>

                {/* Custom Locale Text Input */}
                {isCustomLocale && (
                  <div className="space-y-1 max-w-xs animate-fadeIn">
                    <label htmlFor="custom-locale-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custom IETF Locale Tag</label>
                    <input
                      type="text"
                      id="custom-locale-input"
                      value={customLocaleInput}
                      onChange={handleCustomLocaleInputChange}
                      placeholder="e.g. sv-SE, nl-NL"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                    />
                    <p className="text-[9px] text-slate-400 leading-tight">Must be a valid BCP 47 language tag (e.g., de-CH, en-IE) to support custom formatting.</p>
                  </div>
                )}

                {/* Preview / Sample format */}
                <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-3 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Live formatting preview</span>
                  <strong className="text-sm font-mono text-slate-900 dark:text-slate-100 font-black bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
                    {formatMoney(1234567.89, profile.currency)}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="space-y-1">
                  <label htmlFor="invoice-prefix-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice Prefix</label>
                  <input
                    type="text"
                    id="invoice-prefix-input"
                    value={profile.invoicePrefix}
                    onChange={(e) => handleProfileChange('invoicePrefix', e.target.value)}
                    placeholder="e.g. INV-"
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="next-invoice-num-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Next Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    id="next-invoice-num-input"
                    value={profile.nextInvoiceNumber}
                    onChange={(e) => {
                      const norm = normalizeNumericInput(e.target.value);
                      handleProfileChange('nextInvoiceNumber', Math.max(1, Math.floor(parseNumericInput(norm)) || 1));
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Document Design Template Selection */}
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-5" id="settings-template-card">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Document Templates</h3>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select PDF & Print Template</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="template-selector-grid">
                {[
                  { id: 'minimalist', name: 'Minimalist', desc: 'Restrained greyscale styling, maximum workspace, clean elegant lines.' },
                  { id: 'modern-blue', name: 'Modern Blue', desc: 'Indigo highlights, shaded table rows, elegant professional header.' },
                  { id: 'editorial-serif', name: 'Editorial Serif', desc: 'Luxurious literary serif typography with classic double borders.' },
                  { id: 'compact-slate', name: 'Compact Slate', desc: 'High-density slate left-accented boxes, very space-efficient.' },
                  { id: 'bold-accent', name: 'Bold Accent', desc: 'High impact dark banner block header, authoritative look.' }
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleProfileChange('template', tpl.id as any)}
                    className={`text-left p-3 rounded border text-xs flex flex-col gap-1 transition-all cursor-pointer ${
                      (profile.template || 'minimalist') === tpl.id 
                        ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-950/20 ring-1 ring-blue-500 font-semibold' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{tpl.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-normal">{tpl.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 5: Payment Settings & Procedure Selection */}
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4" id="settings-payment-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Payment Methods & Settings</h3>
              </div>
              
              {/* Tab Switcher */}
              <div className="flex border border-slate-200 dark:border-slate-800 rounded p-0.5 bg-slate-50 dark:bg-slate-950 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setPaymentSubTab('methods')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    paymentSubTab === 'methods'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Accepted Methods
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSubTab('mfs')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    paymentSubTab === 'mfs'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  MFS Setup
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSubTab('instructions')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    paymentSubTab === 'instructions'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Instructions & Gateway
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {paymentSubTab === 'methods' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select Accepted Payment Methods</label>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal mb-2">Click each box to toggle whether this payment method is listed as accepted on your invoices.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" id="payment-selector-grid">
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleTogglePaymentMethod(opt.id)}
                        className={`text-left p-3 rounded border text-xs flex flex-col gap-1 transition-all cursor-pointer ${
                          currentMethods.includes(opt.id)
                            ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-950/20 ring-1 ring-blue-500 font-semibold' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{opt.name}</span>
                          <input
                            type="checkbox"
                            checked={currentMethods.includes(opt.id)}
                            onChange={() => {}} // Read-only checkbox, event handled by button onClick
                            className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 pointer-events-none shrink-0"
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentSubTab === 'mfs' && (
                <div className="space-y-4 bg-purple-50/10 dark:bg-purple-950/10 p-3 rounded-lg border border-purple-100 dark:border-purple-900/30">
                  <div className="flex items-start gap-2">
                    <Smartphone className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-purple-950 dark:text-purple-300 uppercase tracking-wider">Mobile Financial Service (MFS) Configuration</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">Configure your primary mobile wallet information so clients can send payments directly to your wallet account.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="settings-mfs-provider" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">MFS Provider</label>
                      <select
                        id="settings-mfs-provider"
                        value={profile.mfsProvider || ''}
                        onChange={(e) => handleProfileChange('mfsProvider', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 cursor-pointer"
                      >
                        <option value="">-- Select Provider --</option>
                        {MFS_OPTIONS.map((mfs) => (
                          <option key={mfs} value={mfs}>{mfs}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="settings-mfs-account" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account / Wallet Number</label>
                      <input
                        type="text"
                        id="settings-mfs-account"
                        value={profile.mfsAccountNo || ''}
                        onChange={(e) => handleProfileChange('mfsAccountNo', e.target.value)}
                        placeholder="e.g. 017XXXXXXXX"
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all font-mono bg-white dark:bg-slate-950"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account Type</label>
                      <div className="flex gap-2 text-xs">
                        {['Personal', 'Merchant'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleProfileChange('mfsAccountType', type)}
                            className={`flex-1 py-1.5 px-3 rounded border font-semibold text-center transition-all cursor-pointer ${
                              (profile.mfsAccountType || 'Personal') === type
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {profile.mfsProvider && profile.mfsAccountNo && (
                    <div className="bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded border border-purple-200/50 dark:border-purple-900/30 text-[11px] text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
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
                          handleProfileChange('paymentProcedure', nextProcedure);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 rounded transition-all shadow-2xs shrink-0 cursor-pointer text-center"
                      >
                        Append to Instructions
                      </button>
                    </div>
                  )}
                </div>
              )}

              {paymentSubTab === 'instructions' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="payment-gateway-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Default Payment Gateway Link / URL</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="payment-gateway-input"
                        value={profile.paymentGatewayInfo || ''}
                        onChange={(e) => handleProfileChange('paymentGatewayInfo', e.target.value)}
                        placeholder="e.g. https://buy.stripe.com/abc123xyz"
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 transition-all font-sans bg-white dark:bg-slate-950"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                      Provide an optional online checkout URL (e.g. Stripe Payment Link). If present, a clickable <strong>"Pay Online"</strong> button will be rendered on the invoice.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="payment-procedure-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Procedure & Instructions</label>
                    <textarea
                      id="payment-procedure-input"
                      rows={4}
                      value={profile.paymentProcedure || ''}
                      onChange={(e) => handleProfileChange('paymentProcedure', e.target.value)}
                      placeholder="Specify exact procedure details, e.g.:&#10;Bank Transfer:&#10;Bank Name: ACME Bank&#10;A/C Number: 1234-5678-90&#10;Routing Number: 987654321&#10;&#10;MFS Merchant Pay:&#10;bKash Merchant: 017XXXXXXXX (Merchant payment)&#10;Nagad Merchant: 018XXXXXXXX"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950 font-sans whitespace-pre-line"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                      Provide payment details corresponding to your selected active payment methods. These instructions will be displayed at the bottom of the invoice.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Tax Mode Configuration */}
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Tax Regulations</h3>
              </div>
              
              {/* Enable / Disable Tax Toggle */}
              <label className="relative inline-flex items-center cursor-pointer" id="tax-toggle-label">
                <input
                  type="checkbox"
                  checked={tax.taxEnabled}
                  onChange={(e) => handleTaxChange('taxEnabled', e.target.checked)}
                  className="sr-only peer"
                  id="tax-enabled-checkbox"
                />
                <div className="w-10 h-5.5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400 select-none">Tax lines active</span>
              </label>
            </div>

            {tax.taxEnabled ? (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="tax-rate-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tax Rate (%)</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        id="tax-rate-input"
                        value={tax.taxRate}
                        onChange={(e) => {
                          const norm = normalizeNumericInput(e.target.value);
                          handleTaxChange('taxRate', Math.max(0, parseNumericInput(norm)));
                        }}
                        className="w-full pl-3 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <Percent className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500">Decimal values allowed</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tax Calculation Method</label>
                    <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 border border-transparent dark:border-slate-800 rounded" id="tax-calculation-methods">
                      <button
                        type="button"
                        onClick={() => handleTaxChange('taxInclusive', true)}
                        className={`flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          tax.taxInclusive 
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Mode A (Inclusive)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTaxChange('taxInclusive', false)}
                        className={`flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          !tax.taxInclusive 
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Mode B (Exclusive)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="tax-name-input" className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tax Name (e.g. GST, VAT)</label>
                    <input
                      type="text"
                      id="tax-name-input"
                      value={tax.taxName || ''}
                      onChange={(e) => handleTaxChange('taxName', e.target.value)}
                      placeholder="Tax"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 animate-fade-in"
                    />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500">Label shown on totals panel</p>
                  </div>
                </div>

                {/* Explanatory Callouts */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                      {tax.taxInclusive ? (
                        <>
                          <p className="font-bold text-slate-800 dark:text-slate-100">Mode A — Prices INCLUDE tax (e.g. GST / VAT style)</p>
                          <p className="text-[11px] leading-relaxed">The unit prices entered in the editor represent gross amounts. The app automatically calculates and isolates the tax component without changing the net total paid by the customer.</p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                            <li><code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-850 px-1 rounded font-mono text-[10px]">Tax Amount = Gross Total × {tax.taxRate} / {(100 + tax.taxRate)}</code></li>
                            <li><code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-850 px-1 rounded font-mono text-[10px]">Net Subtotal = Gross Total − Tax Amount</code></li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-slate-800 dark:text-slate-100">Mode B — Prices EXCLUDE tax (e.g. US Sales Tax style)</p>
                          <p className="text-[11px] leading-relaxed">Tax is added on top of the subtotal of the entered unit prices. The total amount matches subtotal, less discounts, plus tax rate percentage.</p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                            <li><code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-850 px-1 rounded font-mono text-[10px]">Tax Amount = (Subtotal − Discount) × {tax.taxRate}%</code></li>
                            <li><code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-850 px-1 rounded font-mono text-[10px]">Grand Total = Subtotal − Discount + Tax Amount</code></li>
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 text-xs rounded border border-dashed border-slate-300 dark:border-slate-800 text-center leading-normal">
                Tax lines are hidden. Tax rate is considered 0%, and no tax calculations will be added to subtotals.
              </div>
            )}
          </div>

          {/* Card 4: Appearance Settings */}
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4" id="settings-theme-card">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">App Appearance</h3>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Theme Preference</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Switch between light and dark modes to suit your working environment.
                </p>
              </div>

              {/* Elegant Button Style Theme Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-150 dark:border-slate-750 w-full sm:w-auto" id="theme-selector-options">
                <button
                  type="button"
                  onClick={() => {
                    if (isDark && onToggleTheme) onToggleTheme();
                  }}
                  id="theme-select-light"
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-4 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    !isDark
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Light Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDark && onToggleTheme) onToggleTheme();
                  }}
                  id="theme-select-dark"
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-4 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark Mode
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Header Preview Card */}
        <div className="md:col-span-1">
          <div className="sticky top-20 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Document Header Preview</h4>
            <div className="bg-white border border-slate-200 shadow-sm rounded p-4 space-y-4" id="live-header-preview">
              <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
                <div className="w-16 h-16 rounded border border-slate-200 flex items-center justify-center p-1 overflow-hidden bg-slate-50 shrink-0">
                  {profile.logo ? (
                    <img src={profile.logo} alt="Mini Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <Building2 className="w-7 h-7 text-slate-300" />
                  )}
                </div>
                <div className="text-right space-y-0.5 overflow-hidden">
                  <h5 className="font-bold text-xs text-slate-800 truncate" title={profile.companyName}>{profile.companyName || 'Your Business Name'}</h5>
                  <p className="text-[10px] text-slate-500 whitespace-pre-line leading-normal truncate">
                    {profile.address || 'Address goes here...'}
                  </p>
                  {profile.phone && <p className="text-[9px] text-slate-400 flex items-center justify-end gap-1"><Phone className="w-2.5 h-2.5 text-slate-300" /> {profile.phone}</p>}
                  {profile.email && <p className="text-[9px] text-slate-400 flex items-center justify-end gap-1"><Mail className="w-2.5 h-2.5 text-slate-300" /> {profile.email}</p>}
                  {profile.website && <p className="text-[9px] text-slate-400 flex items-center justify-end gap-1"><Globe className="w-2.5 h-2.5 text-slate-300" /> {profile.website}</p>}
                  {profile.taxRegNumber && (
                    <p className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1 font-semibold font-mono">
                      {profile.taxRegLabel}: {profile.taxRegNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Currency</span>
                  <span className="font-semibold text-slate-800 font-mono">{profile.currency.symbol} {profile.currency.code}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Invoice Style</span>
                  <span className="font-semibold text-slate-800 font-mono">{profile.invoicePrefix}XXXX</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Tax Mode</span>
                  <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${tax.taxEnabled ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {tax.taxEnabled ? (tax.taxInclusive ? 'Inclusive (Mode A)' : 'Exclusive (Mode B)') : 'Disabled'}
                  </span>
                </div>
              </div>

              {!profile.companyName && (
                <div className="p-3 bg-amber-50 text-amber-800 text-[10px] rounded border border-amber-100 leading-normal">
                  <strong>Tip:</strong> Provide your Business Name and Address to complete the printed document's header.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

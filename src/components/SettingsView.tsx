/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
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
  Moon,
  ShieldCheck,
  Database,
  Download,
  UploadCloud,
  FileJson,
  RefreshCw,
  AlertCircle,
  FolderArchive,
  HardDrive,
  Check,
  X,
  Code2,
  Sparkles,
  User,
  Heart,
  QrCode,
  Landmark,
  Link,
  ExternalLink,
  Copy,
  Plus,
  Search,
  Sliders,
  Palette,
  Eye,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { FASTINVO_ICON_MARK, FASTINVO_OFFICIAL_LOGO } from '../assets/logo';
import { 
  BusinessProfile, 
  TaxConfig, 
  Currency, 
  AuthUser, 
  TwoFactorConfig, 
  SavedInvoice, 
  Client, 
  SavedItem, 
  InvoiceDraft,
  InvoiceTemplateId 
} from '../types';
import { POPULAR_CURRENCIES, formatMoney } from '../constants';
import { normalizeNumericInput, parseNumericInput } from '../utils/normalizeNumericInput';
import { 
  exportDatabaseBackup, 
  downloadDatabaseJsonFile, 
  parseAndValidateBackupJson, 
  FastInvoDatabaseBackup 
} from '../lib/db';
import PhoneInputWithCountry from './PhoneInputWithCountry';
import SecuritySettings from './SecuritySettings';
import TeamManagementSection from './TeamManagementSection';
import { TeamMember, WorkspaceConfig } from '../types';
import { Users } from 'lucide-react';

export type SettingsTabId = 
  | 'all' 
  | 'team'
  | 'payments' 
  | 'branding' 
  | 'currency' 
  | 'tax' 
  | 'templates' 
  | 'appearance' 
  | 'backup' 
  | 'security' 
  | 'about';

interface SettingsViewProps {
  profile: BusinessProfile;
  setProfile: (profile: BusinessProfile) => void;
  tax: TaxConfig;
  setTax: (tax: TaxConfig) => void;
  onSave?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  themeMode?: 'light' | 'dark' | 'system';
  onThemeModeChange?: (mode: 'light' | 'dark' | 'system') => void;
  currentUser?: AuthUser | null;
  setCurrentUser?: (user: AuthUser | null) => void;
  twoFactorConfig?: TwoFactorConfig;
  setTwoFactorConfig?: React.Dispatch<React.SetStateAction<TwoFactorConfig>>;
  savedInvoices?: SavedInvoice[];
  clients?: Client[];
  savedItems?: SavedItem[];
  draft?: InvoiceDraft;
  workspaceConfig?: WorkspaceConfig;
  setWorkspaceConfig?: React.Dispatch<React.SetStateAction<WorkspaceConfig>>;
  teamMembers?: TeamMember[];
  setTeamMembers?: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  onSwitchToStaff?: (member: TeamMember) => void;
  onOpenPinModal?: () => void;
  onRestoreDatabase?: (backupData: FastInvoDatabaseBackup['data'], mode: 'replace' | 'merge') => Promise<void> | void;
  onGoToProfile?: () => void;
  onBack?: () => void;
  initialSection?: SettingsTabId;
}

const MFS_OPTIONS = ['bKash', 'Nagad', 'Rocket', 'Upay', 'Cellfin', 'SureCash', 'Easypaisa', 'JazzCash', 'MPesa', 'Custom'];

const PAYMENT_METHOD_OPTIONS = [
  { id: 'Cash', name: 'Cash', desc: 'Direct physical cash payment on-site / over counter' },
  { id: 'Card', name: 'Card POS', desc: 'Credit, debit, or smart card POS terminal payment' },
  { id: 'Tap-to-Pay', name: 'Tap-to-Pay', desc: 'NFC contactless mobile tap (Apple Pay / Google Pay)' },
  { id: 'Bank transfer', name: 'Bank Transfer', desc: 'Direct bank deposit, wire, ACH, or SEPA transfer' },
  { id: 'MFS merchant pay', name: 'MFS Merchant Pay', desc: 'Mobile financial counter payment (bKash / Nagad merchant)' },
  { id: 'MFS Transfer', name: 'MFS P2P Transfer', desc: 'Personal digital wallet send money / personal transfer' },
  { id: 'Online Payment Link', name: 'Online Checkout Link', desc: 'Clickable Stripe, PayPal, or payment gateway checkout URL' },
  { id: 'Cheque', name: 'Cheque / Bank Draft', desc: 'Physical bank cheque or financial promissory document' },
  { id: 'Cryptocurrency', name: 'Cryptocurrency / USDT', desc: 'Direct crypto wallet settlement (USDT / BTC / ETH)' }
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

export default function SettingsView({ 
  profile, 
  setProfile, 
  tax, 
  setTax, 
  onSave, 
  isDark, 
  onToggleTheme,
  themeMode,
  onThemeModeChange,
  currentUser = null,
  setCurrentUser = () => {},
  twoFactorConfig = { isEnabled: false, secret: '', recoveryCodes: [] },
  setTwoFactorConfig = () => {},
  savedInvoices = [],
  clients = [],
  savedItems = [],
  draft,
  workspaceConfig = { id: 'ws-default', name: 'FastInvo Workspace', ownerEmail: 'linkonashrafulislam@gmail.com', teamMembers: [], isMultiUserEnabled: false },
  setWorkspaceConfig = () => {},
  teamMembers = [],
  setTeamMembers = () => {},
  onSwitchToStaff = () => {},
  onOpenPinModal = () => {},
  onRestoreDatabase,
  onGoToProfile,
  onBack,
  initialSection = 'payments'
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialSection || 'payments');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState<boolean>(false);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Payment sub-tabs: methods, mfs, bank, gateway, qr, instructions
  const [paymentSubTab, setPaymentSubTab] = useState<'methods' | 'mfs' | 'bank' | 'gateway' | 'qr' | 'instructions'>('methods');
  
  // Live QR Code preview state
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Database Export & Import state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importValidationResult, setImportValidationResult] = useState<ReturnType<typeof parseAndValidateBackupJson> | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');

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

  // Keep initialSection in sync if parent changes it
  useEffect(() => {
    if (initialSection) {
      setActiveTab(initialSection);
    }
  }, [initialSection]);

  useEffect(() => {
    const isCustom = !LOCALES_OPTIONS.some(o => o.value === (profile.currency.locale || 'en-US'));
    if (isCustom) {
      setCustomLocaleInput(profile.currency.locale || 'en-US');
    }
  }, [profile.currency.locale]);

  // Generate Live QR Preview whenever payment QR fields change
  useEffect(() => {
    const account = (profile.paymentQrAccount || profile.mfsAccountNo || '').trim();
    const type = (profile.paymentQrType || profile.mfsProvider || 'bKash').trim();
    const accountName = (profile.paymentQrAccountName || '').trim();
    const bankName = (profile.paymentQrBankName || '').trim();
    const routing = (profile.paymentQrRouting || '').trim();
    const instructions = (profile.paymentQrInstructions || '').trim();

    if (!account && !profile.paymentGatewayInfo) {
      setLiveQrDataUrl('');
      return;
    }

    let payload = '';
    const typeLower = type.toLowerCase();
    if (typeLower === 'bank') {
      payload = `Bank: ${bankName || 'Bank Transfer'}\nA/C: ${account}${accountName ? `\nHolder: ${accountName}` : ''}${routing ? `\nRouting: ${routing}` : ''}`;
      if (instructions) payload += `\nNote: ${instructions}`;
    } else if (['bkash', 'nagad', 'rocket', 'upay', 'cellfin'].includes(typeLower)) {
      payload = `${type}: ${account}${accountName ? ` (${accountName})` : ''}`;
      if (instructions) payload += `\n${instructions}`;
    } else if (profile.paymentGatewayInfo && !account) {
      payload = profile.paymentGatewayInfo;
    } else {
      payload = `${type}: ${account}${accountName ? ` (${accountName})` : ''}`;
      if (instructions) payload += `\n${instructions}`;
    }

    if (payload) {
      QRCode.toDataURL(payload, {
        width: 256,
        margin: 1,
        color: {
          dark: '#0F3D2E',
          light: '#FFFFFF',
        },
      })
        .then((url) => setLiveQrDataUrl(url))
        .catch(() => setLiveQrDataUrl(''));
    } else {
      setLiveQrDataUrl('');
    }
  }, [
    profile.paymentQrAccount,
    profile.mfsAccountNo,
    profile.paymentQrType,
    profile.mfsProvider,
    profile.paymentQrAccountName,
    profile.paymentQrBankName,
    profile.paymentQrRouting,
    profile.paymentQrInstructions,
    profile.paymentGatewayInfo
  ]);

  const triggerSuccessFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotice(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedNotice(null), 2500);
  };

  // Handle text field changes for profile
  const handleProfileChange = (key: keyof BusinessProfile, value: any) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    triggerSuccessFeedback("Settings updated");
  };

  // Handle tax config changes
  const handleTaxChange = (key: keyof TaxConfig, value: any) => {
    const updated = { ...tax, [key]: value };
    setTax(updated);
    triggerSuccessFeedback("Tax configuration updated");
  };

  const currentMethods = profile.paymentMethods || [];

  const isMethodActive = (optId: string) => {
    if (optId === 'Tap-to-Pay' || optId === 'Tap') {
      return currentMethods.includes('Tap-to-Pay') || currentMethods.includes('Tap');
    }
    return currentMethods.includes(optId);
  };

  const handleTogglePaymentMethod = (methodId: string) => {
    let updated: string[];
    if (isMethodActive(methodId)) {
      updated = currentMethods.filter(m => m !== methodId && m !== 'Tap-to-Pay' && m !== 'Tap');
    } else {
      updated = [...currentMethods, methodId];
    }
    handleProfileChange('paymentMethods', updated);
  };

  // Backup Export & Import Handlers
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const backup = await exportDatabaseBackup({
        invoices: savedInvoices,
        clients,
        savedItems,
        profile,
        tax,
        draft,
        themeMode,
        twoFactorConfig,
        currentUser
      });
      downloadDatabaseJsonFile(backup);
      triggerSuccessFeedback(`✓ Exported ${backup.summary.invoicesCount} invoices & ${backup.summary.clientsCount} clients to JSON`);
    } catch (err: any) {
      alert(`Export failed: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTriggerImportClick = () => {
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
      importFileInputRef.current.click();
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const parsed = JSON.parse(rawText);
        const validation = parseAndValidateBackupJson(parsed);

        if (!validation.isValid || !validation.backupData) {
          setImportError(validation.error || 'Invalid backup file format.');
          return;
        }

        setImportError(null);
        setImportValidationResult(validation);
        setShowRestoreModal(true);
      } catch (err: any) {
        setImportError('Failed to parse JSON file: ' + (err.message || 'Corrupted file'));
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!importValidationResult?.backupData) return;
    setIsImporting(true);
    try {
      if (onRestoreDatabase) {
        await onRestoreDatabase(importValidationResult.backupData, restoreMode);
      }
      setShowRestoreModal(false);
      setImportValidationResult(null);
      triggerSuccessFeedback(
        restoreMode === 'replace'
          ? `✓ Restored entire database (${importValidationResult.summary?.invoicesCount || 0} invoices, ${importValidationResult.summary?.clientsCount || 0} clients)!`
          : `✓ Merged backup data into local workspace!`
      );
    } catch (err: any) {
      alert('Restore failed: ' + (err.message || err));
    } finally {
      setIsImporting(false);
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

  // Logo file processing
  const processLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo image is too large. Please upload an image under 2MB.');
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

  const shouldShowSection = (sectionKey: SettingsTabId) => {
    if (activeTab === 'all') {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      if (sectionKey === 'team' && ('team staff pin member invite counter user permissions role google'.includes(q))) return true;
      if (sectionKey === 'payments' && ('payment pay mfs bkash nagad bank card tap cash stripe qr gateway transfer method'.includes(q))) return true;
      if (sectionKey === 'branding' && ('branding logo company address email website header business name'.includes(q))) return true;
      if (sectionKey === 'currency' && ('currency format dollar euro taka symbol decimal locale money'.includes(q))) return true;
      if (sectionKey === 'tax' && ('tax vat gst ein bin inclusive exclusive rate calculation'.includes(q))) return true;
      if (sectionKey === 'templates' && ('template design style theme layout minimalist modern editorial compact'.includes(q))) return true;
      if (sectionKey === 'appearance' && ('theme dark light appearance mode color display'.includes(q))) return true;
      if (sectionKey === 'backup' && ('backup export import json restore database download sync'.includes(q))) return true;
      if (sectionKey === 'security' && ('security 2fa auth totp password google account protect'.includes(q))) return true;
      if (sectionKey === 'about' && ('about ashraful islam developer credit info version'.includes(q))) return true;
      return false;
    }
    return activeTab === sectionKey;
  };

  const navCategories: Array<{ id: SettingsTabId; label: string; description: string; icon: any; badge?: string | number; color?: string }> = [
    { id: 'team', label: 'Team & Staff (PIN)', description: 'Owner Google account + Staff 4-6 digit PIN or Google logins for shared counter devices', icon: Users, badge: `${teamMembers.length} Staff`, color: 'text-indigo-600 dark:text-indigo-400' },
    { id: 'payments', label: 'Payment Systems', description: 'Accepted payment methods, MFS wallets (bKash/Nagad/Rocket), bank info & QR codes', icon: CreditCard, badge: `${currentMethods.length} active`, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'currency', label: 'Currency & Format', description: 'Currency symbols, code, decimal places & regional number formatting', icon: Coins, color: 'text-amber-600 dark:text-amber-400' },
    { id: 'tax', label: 'Tax & VAT', description: 'Tax calculation formulas, default rates & inclusive vs exclusive VAT toggle', icon: Percent, badge: tax.taxEnabled ? `${tax.taxRate}%` : 'Off', color: 'text-purple-600 dark:text-purple-400' },
    { id: 'templates', label: 'Document Design', description: 'Invoice layout presets (Minimalist, Classic, Modern, Compact) & themes', icon: FileText, color: 'text-indigo-600 dark:text-indigo-400' },
    { id: 'appearance', label: 'Appearance', description: 'Light, Dark, and System default display theme preferences', icon: Sun, color: 'text-amber-500' },
    { id: 'backup', label: 'Backup & Restore', description: 'Full offline JSON export, backup file import & database merging', icon: Database, color: 'text-emerald-600' },
    { id: 'security', label: 'Security & 2FA', description: 'Two-Factor Authentication (2FA) and account security keys', icon: ShieldCheck, badge: twoFactorConfig.isEnabled ? 'Active' : undefined, color: 'text-rose-600' },
    { id: 'about', label: 'About FastInvo', description: 'Application version, licensing, developer credit & ecosystem details', icon: Code2, color: 'text-slate-600' },
    { id: 'all', label: 'View All Settings', description: 'Display all settings panels and sections together on one screen', icon: Sliders, color: 'text-slate-500' }
  ];

  const currentCategory = navCategories.find(c => c.id === activeTab) || navCategories[0];
  const CurrentCategoryIcon = currentCategory.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12" id="settings-view-container">
      {/* Top Navigation Row with Back Button */}
      {onBack && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0F3D2E] text-white flex items-center justify-center font-bold shadow-md shadow-[#0F3D2E]/20 shrink-0">
              <CreditCard className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Settings & Configurations
                </h1>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  FastInvo Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure payment gateways, accepted methods, bank details, currency, tax regulations, and offline backups.
              </p>
            </div>
          </div>

          {/* Search Input for instant setting discovery */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim() && activeTab !== 'all') {
                  setActiveTab('all');
                }
              }}
              placeholder="Search settings (e.g. payment, tax, bkash)..."
              className="w-full pl-8.5 pr-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Dropdown List Navigation */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Select Settings Category
              </label>

              {/* Custom Dropdown Trigger Button */}
              <button
                type="button"
                id="settings-category-dropdown-btn"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isDropdownOpen
                    ? 'bg-slate-50 dark:bg-slate-800/90 border-[#0F3D2E] dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
                    <CurrentCategoryIcon className={`w-4 h-4 ${currentCategory.color || 'text-emerald-500'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {currentCategory.label}
                      </span>
                      {currentCategory.badge && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                          {currentCategory.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {currentCategory.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    Change section
                  </span>
                  <div className={`p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : ''
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Dropdown Menu Popover */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-fadeIn p-2 space-y-1">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Available Settings Sections ({navCategories.length})
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-1 p-1 scrollbar-thin">
                {navCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = activeTab === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(cat.id);
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-[#0F3D2E] text-white shadow-sm'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-white/15 text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-600'
                        }`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-300' : cat.color || ''}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs tracking-tight">
                              {cat.label}
                            </span>
                            {cat.badge && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-emerald-500/30 text-emerald-200'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}>
                                {cat.badge}
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-emerald-200/90' : 'text-slate-400 dark:text-slate-400'
                          }`}>
                            {cat.description}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Global Success / Notice Feedback */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {copiedNotice && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl text-blue-800 dark:text-blue-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{copiedNotice}</span>
          </div>
        )}
      </div>

      {/* Main Settings Body */}
      {activeTab === 'security' ? (
        <SecuritySettings
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          twoFactorConfig={twoFactorConfig}
          setTwoFactorConfig={setTwoFactorConfig}
        />
      ) : (
        <div className="space-y-6">

          {/* ========================================================================= */}
          {/* SECTION: WORKSPACE TEAM & STAFF ACCESS (OWNER GOOGLE + STAFF PIN) */}
          {/* ========================================================================= */}
          {shouldShowSection('team') && (
            <TeamManagementSection
              workspaceConfig={workspaceConfig}
              setWorkspaceConfig={setWorkspaceConfig}
              teamMembers={teamMembers}
              setTeamMembers={setTeamMembers}
              currentUser={currentUser}
              onSwitchToStaff={onSwitchToStaff}
              onOpenPinModal={onOpenPinModal}
            />
          )}

          {/* ========================================================================= */}
          {/* SECTION: PAYMENT SYSTEMS & GATEWAYS (FEATURE HIGHLIGHT) */}
          {/* ========================================================================= */}
          {shouldShowSection('payments') && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-blue-500/40 dark:border-blue-500/30 shadow-md p-5 sm:p-6 space-y-6" id="settings-payment-card">
              
              {/* Payment Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800 shrink-0">
                    <CreditCard className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Payment Systems & Gateways</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {currentMethods.length} Methods Configured
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure accepted payment methods, Mobile Financial Services (bKash/Nagad), bank wire details, online payment link, and live QR code.
                    </p>
                  </div>
                </div>

                {/* Sub-tab Dropdown Selector */}
                <div className="relative w-full sm:w-auto" ref={paymentDropdownRef}>
                  {(() => {
                    const paymentSubOptions = [
                      { id: 'methods', label: 'Accepted Methods', desc: 'Toggle active payment methods & options', icon: CheckSquare },
                      { id: 'mfs', label: 'MFS Wallets', desc: 'bKash, Nagad, Rocket, Upay & Cellfin', icon: Smartphone },
                      { id: 'bank', label: 'Bank Direct Deposit', desc: 'Bank name, A/C number, IBAN & SWIFT', icon: Landmark },
                      { id: 'gateway', label: 'Online Link', desc: 'Stripe, PayPal, or custom checkout URL', icon: Link },
                      { id: 'qr', label: 'Scan-to-Pay QR', desc: 'Dynamic QR generator for mobile checkout', icon: QrCode },
                      { id: 'instructions', label: 'Terms & Instructions', desc: 'Multi-line invoice settlement notes', icon: FileText }
                    ];
                    const curSub = paymentSubOptions.find(s => s.id === paymentSubTab) || paymentSubOptions[0];
                    const CurSubIcon = curSub.icon;

                    return (
                      <>
                        <button
                          type="button"
                          id="settings-payment-subtab-dropdown-btn"
                          onClick={() => setIsPaymentDropdownOpen(prev => !prev)}
                          className={`w-full sm:w-64 flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl border text-left transition-all cursor-pointer ${
                            isPaymentDropdownOpen
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                              : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shrink-0 shadow-2xs">
                              <CurSubIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100 block truncate">
                                {curSub.label}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                {curSub.desc}
                              </span>
                            </div>
                          </div>

                          <div className={`p-1 rounded-lg text-slate-500 transition-transform duration-200 shrink-0 ${
                            isPaymentDropdownOpen ? 'rotate-180 text-blue-600' : ''
                          }`}>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </button>

                        {/* Payment Sub-options Popover Dropdown */}
                        {isPaymentDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-full sm:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn p-1.5 space-y-1">
                            <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                              Payment Sub-Sections ({paymentSubOptions.length})
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-1 scrollbar-thin">
                              {paymentSubOptions.map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubSelected = paymentSubTab === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => {
                                      setPaymentSubTab(sub.id as any);
                                      setIsPaymentDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                                      isSubSelected
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <SubIcon className={`w-4 h-4 shrink-0 ${isSubSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                                      <div className="min-w-0">
                                        <span className="font-extrabold text-xs block truncate">{sub.label}</span>
                                        <span className={`text-[10px] block truncate ${isSubSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                          {sub.desc}
                                        </span>
                                      </div>
                                    </div>
                                    {isSubSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[2.5]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Sub-Panel 1: Accepted Payment Methods Grid */}
              {paymentSubTab === 'methods' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Select Accepted Payment Methods
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Toggle the payment methods your business accepts. Active methods are displayed in invoice footers and the checkout wizard.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" id="payment-selector-grid">
                    {PAYMENT_METHOD_OPTIONS.map((opt) => {
                      const active = isMethodActive(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleTogglePaymentMethod(opt.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                            active
                              ? 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                              : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-black text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {opt.id === 'Cash' && <Coins className="w-3.5 h-3.5 text-amber-500" />}
                              {opt.id === 'Card' && <CreditCard className="w-3.5 h-3.5 text-indigo-500" />}
                              {opt.id === 'Tap-to-Pay' && <Smartphone className="w-3.5 h-3.5 text-purple-500" />}
                              {opt.id === 'Bank transfer' && <Landmark className="w-3.5 h-3.5 text-emerald-600" />}
                              {opt.id === 'MFS merchant pay' && <Wallet className="w-3.5 h-3.5 text-pink-500" />}
                              {opt.id === 'MFS Transfer' && <Smartphone className="w-3.5 h-3.5 text-pink-400" />}
                              {opt.id === 'Online Payment Link' && <Link className="w-3.5 h-3.5 text-blue-500" />}
                              {opt.id === 'Cheque' && <FileText className="w-3.5 h-3.5 text-slate-500" />}
                              {opt.id === 'Cryptocurrency' && <Coins className="w-3.5 h-3.5 text-amber-600" />}
                              <span>{opt.name}</span>
                            </span>

                            <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors ${
                              active
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                            }`}>
                              {active && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active summary banner */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300">Active on Invoices:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentMethods.length === 0 ? (
                          <span className="text-rose-500 font-bold">None selected (Click boxes above to enable)</span>
                        ) : (
                          currentMethods.map(m => (
                            <span key={m} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold text-[10px] rounded-lg">
                              {m}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaymentSubTab('instructions')}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Edit Custom Payment Instructions</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Panel 2: Mobile Financial Services (MFS Wallets) */}
              {paymentSubTab === 'mfs' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                        Mobile Financial Services (MFS) Wallet Setup
                      </h4>
                      <p className="text-xs text-purple-800 dark:text-purple-300/80 leading-relaxed mt-0.5">
                        Configure bKash, Nagad, Rocket, Upay, or Cellfin so customers can pay directly to your digital merchant or personal wallet.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        MFS Provider
                      </label>
                      <select
                        value={profile.mfsProvider || 'bKash'}
                        onChange={(e) => handleProfileChange('mfsProvider', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 cursor-pointer"
                      >
                        {MFS_OPTIONS.map((mfs) => (
                          <option key={mfs} value={mfs}>{mfs}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        Wallet / Account Number
                      </label>
                      <input
                        type="text"
                        value={profile.mfsAccountNo || ''}
                        onChange={(e) => handleProfileChange('mfsAccountNo', e.target.value)}
                        placeholder="e.g. 017XXXXXXXX"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        Account Type
                      </label>
                      <div className="flex gap-2">
                        {['Personal', 'Merchant', 'Agent'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleProfileChange('mfsAccountType', type)}
                            className={`flex-1 py-2 px-2.5 rounded-2xl border text-xs font-extrabold text-center transition-all cursor-pointer ${
                              (profile.mfsAccountType || 'Personal') === type
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* One-click Action helper */}
                  {profile.mfsAccountNo && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {profile.mfsProvider || 'bKash'} ({profile.mfsAccountType || 'Personal'}):
                        </span>{' '}
                        <span className="font-mono text-purple-700 dark:text-purple-400 font-bold">
                          {profile.mfsAccountNo}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const prov = profile.mfsProvider || 'bKash';
                          const acc = profile.mfsAccountNo || '';
                          const type = profile.mfsAccountType || 'Personal';
                          const instr = `Send MFS payment via ${prov} (${type}) to wallet number: ${acc}`;
                          const cur = profile.paymentProcedure || '';
                          const next = cur ? `${cur}\n\n${instr}` : instr;
                          handleProfileChange('paymentProcedure', next);
                          triggerSuccessFeedback("Appended MFS details to invoice instructions!");
                        }}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Append to Invoice Instructions</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Panel 3: Bank Account & Direct Wire Deposit */}
              {paymentSubTab === 'bank' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 flex items-start gap-3">
                    <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                        Direct Bank Deposit & Wire Transfer
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300/80 leading-relaxed mt-0.5">
                        Provide official bank wire, IBAN, ACH, and SWIFT instructions for corporate clients and international wire settlements.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={profile.paymentQrBankName || ''}
                        onChange={(e) => handleProfileChange('paymentQrBankName', e.target.value)}
                        placeholder="e.g. JPMorgan Chase / Standard Chartered Bank"
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        Account / Beneficiary Name
                      </label>
                      <input
                        type="text"
                        value={profile.paymentQrAccountName || profile.companyName || ''}
                        onChange={(e) => handleProfileChange('paymentQrAccountName', e.target.value)}
                        placeholder="e.g. Acme Corporation LLC"
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        Account Number / IBAN
                      </label>
                      <input
                        type="text"
                        value={profile.paymentQrAccount || ''}
                        onChange={(e) => handleProfileChange('paymentQrAccount', e.target.value)}
                        placeholder="e.g. 1234-5678-9012 or GB82WEST123456"
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        Branch Name / Routing / SWIFT Code
                      </label>
                      <input
                        type="text"
                        value={profile.paymentQrRouting || ''}
                        onChange={(e) => handleProfileChange('paymentQrRouting', e.target.value)}
                        placeholder="e.g. Routing: 121000358 / SWIFT: CHASUS33"
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* One-click Action helper */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      💡 Click to quickly sync bank account details into your printed invoice footer notes.
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const bank = profile.paymentQrBankName || 'Bank Name';
                        const holder = profile.paymentQrAccountName || profile.companyName || 'Company Name';
                        const acc = profile.paymentQrAccount || '1234-5678-90';
                        const routing = profile.paymentQrRouting ? `\nRouting / SWIFT: ${profile.paymentQrRouting}` : '';
                        const instr = `Bank Transfer Details:\nBank: ${bank}\nAccount Name: ${holder}\nA/C Number: ${acc}${routing}`;
                        const cur = profile.paymentProcedure || '';
                        const next = cur ? `${cur}\n\n${instr}` : instr;
                        handleProfileChange('paymentProcedure', next);
                        triggerSuccessFeedback("Appended Bank details to invoice instructions!");
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Append to Invoice Instructions</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Panel 4: Online Gateway Link */}
              {paymentSubTab === 'gateway' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-3">
                    <Link className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                        Online Checkout Link / Payment Gateway URL
                      </h4>
                      <p className="text-xs text-blue-800 dark:text-blue-300/80 leading-relaxed mt-0.5">
                        Provide a Stripe Payment Link, PayPal checkout URL, or custom merchant gateway page. A clickable <strong>"Pay Online Now"</strong> button will be rendered directly on digital invoice PDFs.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                      Online Gateway / Checkout URL
                    </label>
                    <div className="relative">
                      <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="url"
                        value={profile.paymentGatewayInfo || ''}
                        onChange={(e) => handleProfileChange('paymentGatewayInfo', e.target.value)}
                        placeholder="https://buy.stripe.com/abc123xyz or https://paypal.me/yourbusiness"
                        className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Live Button Test Preview */}
                  {profile.paymentGatewayInfo && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Live Button Preview (Rendered on Digital Invoice)
                      </span>

                      <div className="flex items-center gap-3">
                        <a
                          href={profile.paymentGatewayInfo}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Online Now</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyText(profile.paymentGatewayInfo || '', 'Gateway URL')}
                          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Panel 5: Payment QR Code (Scan-to-Pay) */}
              {paymentSubTab === 'qr' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 flex items-start gap-3">
                    <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                        Scan-to-Pay QR Code Configuration
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300/80 leading-relaxed mt-0.5">
                        FastInvo generates an instant dynamic QR code on all invoices so clients can point their phone camera or banking app and pay immediately.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Left 2 Cols: QR Setup Fields */}
                    <div className="sm:col-span-2 space-y-3">
                      <div>
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                          QR Code Target Type
                        </label>
                        <select
                          value={profile.paymentQrType || profile.mfsProvider || 'bKash'}
                          onChange={(e) => handleProfileChange('paymentQrType', e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 cursor-pointer"
                        >
                          <option value="bKash">bKash QR</option>
                          <option value="Nagad">Nagad QR</option>
                          <option value="Rocket">Rocket QR</option>
                          <option value="Upay">Upay QR</option>
                          <option value="Bank">Bank Deposit QR</option>
                          <option value="Online Link">Online Checkout URL</option>
                          <option value="Other">Custom UPI / QR</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                          QR Account Number / Link Payload
                        </label>
                        <input
                          type="text"
                          value={profile.paymentQrAccount || profile.mfsAccountNo || ''}
                          onChange={(e) => handleProfileChange('paymentQrAccount', e.target.value)}
                          placeholder="e.g. 017XXXXXXXX or Account / UPI ID"
                          className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                          Scanning Instructions / Custom Note
                        </label>
                        <input
                          type="text"
                          value={profile.paymentQrInstructions || ''}
                          onChange={(e) => handleProfileChange('paymentQrInstructions', e.target.value)}
                          placeholder="e.g. Scan with your mobile banking app to settle balance"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Right Col: Live Generated QR Preview */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Live Rendered Invoice QR
                      </span>

                      {liveQrDataUrl ? (
                        <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                          <img
                            src={liveQrDataUrl}
                            alt="Payment QR"
                            className="w-32 h-32 object-contain rounded-md"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-xl bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 text-xs p-2 text-center">
                          <QrCode className="w-8 h-8 text-slate-300 mb-1" />
                          <span>Enter Account/URL to preview QR</span>
                        </div>
                      )}

                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {profile.paymentQrType || 'bKash'} Scan-to-Pay
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Panel 6: Payment Instructions & Terms Editor */}
              {paymentSubTab === 'instructions' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Payment Procedure & Customer Instructions
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      These instructions are printed at the bottom of all invoices and receipts. Use the quick presets below to insert formatted payment details.
                    </p>
                  </div>

                  {/* Preset 1-click Insert Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const bankText = `Bank Wire Transfer:\nBank Name: Standard Chartered Bank\nAccount Name: ${profile.companyName || 'Business Name'}\nAccount Number: 1234-5678-9012\nRouting: 121000358`;
                        const cur = profile.paymentProcedure || '';
                        handleProfileChange('paymentProcedure', cur ? `${cur}\n\n${bankText}` : bankText);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      + Bank Wire Preset
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const mfsText = `MFS Mobile Payments:\nbKash Merchant: 017XXXXXXXX (Make Payment)\nNagad Merchant: 018XXXXXXXX (Payment)`;
                        const cur = profile.paymentProcedure || '';
                        handleProfileChange('paymentProcedure', cur ? `${cur}\n\n${mfsText}` : mfsText);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      + MFS Wallets Preset
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const termsText = `Terms & Conditions:\n• Payment is due within 14 days of invoice date.\n• Please reference invoice number on wire memo.\n• Late payments subject to 1.5% monthly interest.`;
                        const cur = profile.paymentProcedure || '';
                        handleProfileChange('paymentProcedure', cur ? `${cur}\n\n${termsText}` : termsText);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      + Net 14 Terms Preset
                    </button>

                    <button
                      type="button"
                      onClick={() => handleProfileChange('paymentProcedure', '')}
                      className="px-2.5 py-1 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all cursor-pointer ml-auto"
                    >
                      Clear Text
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={profile.paymentProcedure || ''}
                    onChange={(e) => handleProfileChange('paymentProcedure', e.target.value)}
                    placeholder="Enter multi-line payment procedure instructions, account numbers, and settlement terms..."
                    className="w-full px-3.5 py-2.5 text-xs font-sans bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 transition-all leading-relaxed whitespace-pre-line"
                  />
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: COMPANY & BRANDING (Points to dedicated Profile Tab) */}
          {/* ========================================================================= */}
          {(shouldShowSection('branding') || (activeTab === 'all' && searchQuery && 'branding logo company address email website header business name profile phone tax'.includes(searchQuery.toLowerCase()))) && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4" id="settings-branding-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800 shrink-0 overflow-hidden">
                    {profile.logo ? (
                      <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                    ) : (
                      <Building2 className="w-6 h-6 stroke-[2.2]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {profile.companyName || 'Business Profile & Branding'}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Dedicated Profile Tab
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Company name, official logo, email, phone with country code, physical address & tax registration are configured in the dedicated <strong>Profile</strong> tab.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onGoToProfile ? onGoToProfile() : setActiveTab('payments')}
                  className="px-4 py-2.5 bg-[#0F3D2E] hover:bg-[#164E3B] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <User className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Open Profile Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: CURRENCY & FORMATTING */}
          {/* ========================================================================= */}
          {shouldShowSection('currency') && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4" id="settings-currency-card">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800 shrink-0">
                  <Coins className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Currency & Number Formatting
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose your primary currency symbol, ISO code, locale format, and decimal places.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                    Invoice Currency
                  </label>
                  <select
                    value={isCustomCurrency ? 'CUSTOM' : profile.currency.code}
                    onChange={handleCurrencySelect}
                    className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 cursor-pointer"
                  >
                    {POPULAR_CURRENCIES.map((cur) => (
                      <option key={cur.code} value={cur.code}>{cur.label}</option>
                    ))}
                    <option value="CUSTOM">Custom Currency Option...</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                    Decimal Places
                  </label>
                  <select
                    value={profile.currency.decimalPlaces !== undefined ? String(profile.currency.decimalPlaces) : '2'}
                    onChange={(e) => handleCurrencyFieldChange('decimalPlaces', parseInt(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100 cursor-pointer"
                  >
                    <option value="0">0 (e.g. $1,000)</option>
                    <option value="1">1 (e.g. $1,000.0)</option>
                    <option value="2">2 (e.g. $1,000.00)</option>
                    <option value="3">3 (e.g. $1,000.000)</option>
                    <option value="4">4 (e.g. $1,000.0000)</option>
                  </select>
                </div>

                {/* Live Money Preview */}
                <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Live Formatting Sample:
                  </span>
                  <span className="text-sm font-mono font-black text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                    {formatMoney(1234567.89, profile.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: TAX & VAT */}
          {/* ========================================================================= */}
          {shouldShowSection('tax') && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4" id="settings-tax-card">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800 shrink-0">
                    <Percent className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      Tax & VAT Regulations
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Toggle tax application, calculation modes (Inclusive vs Exclusive), and tax rates.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tax.taxEnabled}
                    onChange={(e) => handleTaxChange('taxEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {tax.taxEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tax.taxRate}
                      onChange={(e) => {
                        const norm = normalizeNumericInput(e.target.value);
                        handleTaxChange('taxRate', Math.max(0, parseNumericInput(norm)));
                      }}
                      className="w-full px-3.5 py-2 text-xs font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-600 focus:outline-none dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                      Calculation Method
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleTaxChange('taxInclusive', true)}
                        className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                          tax.taxInclusive 
                            ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        Mode A (Inclusive)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTaxChange('taxInclusive', false)}
                        className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                          !tax.taxInclusive 
                            ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        Mode B (Exclusive)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: DOCUMENT DESIGN TEMPLATES */}
          {/* ========================================================================= */}
          {shouldShowSection('templates') && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4" id="settings-template-card">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800 shrink-0">
                  <FileText className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    PDF & Document Design Template
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select your default layout styling used when generating PDF invoices, quotes, and receipts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: 'minimalist', name: 'Minimalist', desc: 'Restrained greyscale styling, maximum workspace, clean lines.' },
                  { id: 'modern-blue', name: 'Modern Blue', desc: 'Indigo highlights, shaded table rows, elegant header.' },
                  { id: 'editorial-serif', name: 'Editorial Serif', desc: 'Literary serif typography with classic double borders.' },
                  { id: 'compact-slate', name: 'Compact Slate', desc: 'High-density slate left-accented boxes, space-efficient.' },
                  { id: 'bold-accent', name: 'Bold Accent', desc: 'High impact dark banner block header, authoritative look.' }
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleProfileChange('template', tpl.id as any)}
                    className={`text-left p-3.5 rounded-2xl border text-xs flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                      (profile.template || 'minimalist') === tpl.id 
                        ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 font-bold shadow-xs' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black text-slate-900 dark:text-slate-100 text-xs">{tpl.name}</span>
                      {(profile.template || 'minimalist') === tpl.id && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight">{tpl.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: APP APPEARANCE */}
          {/* ========================================================================= */}
          {shouldShowSection('appearance') && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4" id="settings-appearance-card">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-500 flex items-center justify-center border border-amber-200/60 dark:border-amber-800 shrink-0">
                  <Sun className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    App Appearance & Theme
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose between Light mode, Dark mode, or follow your System Default preference.
                  </p>
                </div>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 w-full sm:w-fit">
                <button
                  type="button"
                  onClick={() => onThemeModeChange ? onThemeModeChange('light') : onToggleTheme?.()}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    (themeMode ? themeMode === 'light' : !isDark)
                      ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => onThemeModeChange ? onThemeModeChange('dark') : onToggleTheme?.()}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    (themeMode ? themeMode === 'dark' : isDark)
                      ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dark Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => onThemeModeChange ? onThemeModeChange('system') : null}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    themeMode === 'system'
                      ? 'bg-white text-indigo-600 dark:bg-slate-900 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>System Default</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: DATABASE BACKUP & RESTORE */}
          {/* ========================================================================= */}
          {shouldShowSection('backup') && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4" id="settings-database-card">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                    <Database className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      Database Backup & Portability
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Export your entire offline database as a JSON backup file or restore records.
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                  IndexedDB Active
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoices</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">{savedInvoices.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clients</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">{clients.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catalog Items</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">{savedItems.length}</span>
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{importError}</span>
                  </div>
                  <button type="button" onClick={() => setImportError(null)} className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>{isExporting ? 'Exporting...' : 'Export Full JSON Backup'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerImportClick}
                  disabled={isImporting}
                  className="py-2.5 px-4 rounded-2xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                  <span>{isImporting ? 'Processing...' : 'Import / Restore JSON'}</span>
                </button>

                <input
                  type="file"
                  ref={importFileInputRef}
                  onChange={handleImportFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: ABOUT FASTINVO & DEVELOPER CREDITS */}
          {/* ========================================================================= */}
          {shouldShowSection('about') && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4" id="about-fastinvo-section">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black p-0.5 border border-slate-700/50 shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                  <img 
                    src={FASTINVO_ICON_MARK} 
                    alt="FastInvo Emblem" 
                    className="w-full h-full object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>About FastInvo</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                      v2.4 Pro
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Application Architecture & Developer Information
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-200/50 dark:border-indigo-800 shrink-0">
                      <Code2 className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Developer</span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Ashraful Islam</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="mailto:fastinvoicd@gmail.com"
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/70 dark:border-emerald-800 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>fastinvoicd@gmail.com</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Framework</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">React 18 + Vite SPA</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Engine</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">Offline-First IndexedDB</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Security</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">TOTP 2FA + Zero-Leak</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                  FastInvo is an enterprise-grade invoicing, POS receipt, and financial analytics suite designed for small businesses and independent contractors. Created with precision by <strong>Ashraful Islam</strong>.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Restore Database Confirmation Modal */}
      {showRestoreModal && importValidationResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 max-w-lg w-full space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800">
                  <Database className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Restore Database Backup
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Validate and restore records from JSON
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setImportValidationResult(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Backup File Contents
              </span>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Invoices</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                    {importValidationResult.summary?.invoicesCount || 0}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Clients</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                    {importValidationResult.summary?.clientsCount || 0}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Catalog Items</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                    {importValidationResult.summary?.savedItemsCount || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 block">
                Select Restore Strategy:
              </label>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setRestoreMode('replace')}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    restoreMode === 'replace'
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                    restoreMode === 'replace'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {restoreMode === 'replace' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                      Full Database Replacement (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal block mt-0.5">
                      Clears current local workspace and restores all invoices, clients, catalog items, and business profile directly from the backup.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRestoreMode('merge')}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    restoreMode === 'merge'
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                    restoreMode === 'merge'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {restoreMode === 'merge' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                      Merge & Append Records
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal block mt-0.5">
                      Combines new invoices, clients, and catalog items with your existing data without deleting any existing records.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setImportValidationResult(null);
                }}
                disabled={isImporting}
                className="w-1/2 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 font-extrabold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isImporting}
                className="w-1/2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
                <span>{isImporting ? 'Restoring...' : 'Confirm & Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

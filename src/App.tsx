/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Eye, 
  Settings as SettingsIcon, 
  Receipt,
  Sun,
  Moon,
  History,
  LayoutDashboard,
  Users,
  BarChart3,
  Bookmark,
  ShieldCheck,
  UserCheck,
  User,
  Monitor,
  KeyRound,
  LogOut
} from 'lucide-react';
import { 
  BusinessProfile, 
  TaxConfig, 
  InvoiceDraft, 
  Client, 
  SavedInvoice, 
  SavedItem, 
  AuthUser, 
  TwoFactorConfig,
  TeamMember,
  WorkspaceConfig
} from './types';
import { calculateInvoiceTotals, filterRealItems } from './utils/calculations';
import { 
  DEFAULT_PROFILE, 
  DEFAULT_TAX_CONFIG, 
  DEFAULT_INVOICE_DRAFT 
} from './constants';
import { FASTINVO_ICON_MARK } from './assets/logo';
import {
  initAndMigrateIndexedDB,
  saveInvoicesToDB,
  saveClientsToDB,
  saveSavedItemsToDB,
  saveSettingToDB,
  FastInvoDatabaseBackup
} from './lib/db';
import SettingsView, { SettingsTabId } from './components/SettingsView';
import ProfileView from './components/ProfileView';
import LoginPage from './components/LoginPage';
import InvoiceEditorView from './components/InvoiceEditorView';
import InvoicePreviewView from './components/InvoicePreviewView';
import HistoryView from './components/HistoryView';
import DashboardView from './components/DashboardView';
import ClientsView from './components/ClientsView';
import ReportsView from './components/ReportsView';
import SavedItemsView from './components/SavedItemsView';
import AuthModal from './components/AuthModal';
import TwoFactorModal from './components/TwoFactorModal';
import PaymentCompleteModal from './components/PaymentCompleteModal';
import StaffPinLoginModal from './components/StaffPinLoginModal';
import ReceiptView from './components/ReceiptView';
import BottomNavigation, { NavTab } from './components/BottomNavigation';
import HeaderNavigation from './components/HeaderNavigation';

export type ThemeMode = 'light' | 'dark' | 'system';

const tabTransitionVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 30 : direction < 0 ? -30 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -30 : direction < 0 ? 30 : 0,
    opacity: 0,
  }),
};

export default function App() {
  // 1. Tab State Management
  const tabOrder: NavTab[] = ['dashboard', 'editor', 'preview', 'history', 'reports', 'clients', 'saved_items' as NavTab, 'settings', 'receipt'];
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [direction, setDirection] = useState<number>(0);

  // Init IndexedDB migration on mount
  useEffect(() => {
    initAndMigrateIndexedDB();
  }, []);

  // Saved Items State
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_saved_items');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse fastinvo_saved_items:', e);
    }
    return [
      { id: '1', name: 'Web Development / Design', defaultPrice: 1200, defaultTaxRate: 10 },
      { id: '2', name: 'UI/UX Mobile Design Sprints', defaultPrice: 850, defaultTaxRate: 10 },
      { id: '3', name: 'Monthly Maintenance & Support', defaultPrice: 350, defaultTaxRate: 0 }
    ];
  });

  useEffect(() => {
    saveSavedItemsToDB(savedItems);
  }, [savedItems]);

  // Auth & 2FA Modal States
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_auth_user');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse fastinvo_auth_user:', e);
    }
    return null;
  });

  useEffect(() => {
    saveSettingToDB('fastinvo_auth_user', currentUser);
  }, [currentUser]);

  // Team & Workspace Multi-user State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_team_members');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse fastinvo_team_members:', e);
    }
    return [
      {
        id: 'staff-1',
        name: 'Store Cashier',
        role: 'staff',
        pin: '1234',
        status: 'active',
        addedAt: new Date().toISOString(),
        avatarBg: 'bg-emerald-600'
      }
    ];
  });

  useEffect(() => {
    saveSettingToDB('fastinvo_team_members', teamMembers);
  }, [teamMembers]);

  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_workspace_config');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse fastinvo_workspace_config:', e);
    }
    return {
      id: 'ws-default',
      name: 'FastInvo Store & Invoicing',
      ownerEmail: 'linkonashrafulislam@gmail.com',
      teamMembers: [],
      isMultiUserEnabled: true
    };
  });

  useEffect(() => {
    saveSettingToDB('fastinvo_workspace_config', workspaceConfig);
  }, [workspaceConfig]);

  const [isStaffPinModalOpen, setIsStaffPinModalOpen] = useState(false);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<TeamMember | null>(null);

  const handleSwitchToStaff = (member?: TeamMember) => {
    setSelectedStaffForPin(member || null);
    setIsStaffPinModalOpen(true);
  };

  const handleStaffPinSuccess = (member: TeamMember) => {
    const staffUser: AuthUser = {
      id: member.id,
      email: `${member.name.toLowerCase().replace(/\s+/g, '')}@workspace.fastinvo.local`,
      displayName: member.name,
      photoURL: null,
      role: 'staff',
      loginMethod: 'pin',
      staffMemberId: member.id
    };
    setCurrentUser(staffUser);
    setIsStaffPinModalOpen(false);
    setSelectedStaffForPin(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const [twoFactorConfig, setTwoFactorConfig] = useState<TwoFactorConfig>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_2fa_config');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse fastinvo_2fa_config:', e);
    }
    return { isEnabled: false, secret: 'JBSWY3DPEHPK3PXP', recoveryCodes: [] };
  });

  useEffect(() => {
    saveSettingToDB('fastinvo_2fa_config', twoFactorConfig);
  }, [twoFactorConfig]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTxnId, setPaymentTxnId] = useState('');
  const [paymentMethodName, setPaymentMethodName] = useState('Cash');

  // Settings initial tab focus state
  const [settingsInitialSection, setSettingsInitialSection] = useState<SettingsTabId>('payments');

  // Navigation History Stack
  const [tabHistory, setTabHistory] = useState<NavTab[]>(['dashboard']);

  const handleGoToSettings = (section: any = 'payments') => {
    setSettingsInitialSection(section || 'payments');
    changeTab('settings');
  };

  const changeTab = (tab: NavTab) => {
    if (tab === activeTab) return;
    const prevIndex = tabOrder.indexOf(activeTab);
    const nextIndex = tabOrder.indexOf(tab);
    setDirection(nextIndex > prevIndex ? 1 : -1);

    // If leaving editor tab, silently filter out untouched placeholder rows from draft
    if (activeTab === 'editor' && tab !== 'editor') {
      const cleanedItems = filterRealItems(draft.items);
      if (cleanedItems.length !== draft.items.length) {
        setDraft(prev => ({
          ...prev,
          items: cleanedItems
        }));
      }
    }

    setTabHistory(prev => [...prev, tab]);
    setActiveTab(tab);
  };

  const handleBack = () => {
    if (tabHistory.length > 1) {
      const nextHistory = [...tabHistory];
      nextHistory.pop(); // remove current active tab
      const prevTab = nextHistory[nextHistory.length - 1];
      setTabHistory(nextHistory);
      const prevIndex = tabOrder.indexOf(activeTab);
      const nextIndex = tabOrder.indexOf(prevTab);
      setDirection(nextIndex > prevIndex ? 1 : -1);
      setActiveTab(prevTab);
    } else {
      changeTab('dashboard');
    }
  };

  // Theme State Management ('light' | 'dark' | 'system')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('fastinvo_theme_mode') as ThemeMode;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const computeIsDark = () => {
      if (themeMode === 'dark') return true;
      if (themeMode === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    const dark = computeIsDark();
    setIsDark(dark);

    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('fastinvo_theme_mode', themeMode);

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', dark ? '#020617' : '#f8fafc');

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const matches = e.matches;
        setIsDark(matches);
        if (matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    if (themeMode === 'light') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('system');
    else setThemeMode('light');
  };

  // 2. Profile State Management (Loads from localStorage or defaults)
  const [profile, setProfile] = useState<BusinessProfile>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_profile');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          let paymentMethods = parsed.paymentMethods;
          if (!paymentMethods || (Array.isArray(paymentMethods) && paymentMethods.length === 1 && paymentMethods[0] === 'Cash')) {
            paymentMethods = ['Cash', 'Card', 'Tap-to-Pay', 'Bank transfer'];
          }
          return {
            ...DEFAULT_PROFILE,
            ...parsed,
            currency: parsed.currency || DEFAULT_PROFILE.currency,
            paymentMethods,
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse saved profile, resetting to default', e);
    }
    return DEFAULT_PROFILE;
  });

  // 3. Tax Config State Management (Loads from localStorage or defaults)
  const [tax, setTax] = useState<TaxConfig>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_tax');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_TAX_CONFIG,
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse saved tax config, resetting to default', e);
    }
    return DEFAULT_TAX_CONFIG;
  });

  // 4. Draft State Management (Loads from localStorage or creates empty)
  const [draft, setDraft] = useState<InvoiceDraft>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_draft');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.metadata) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved draft invoice, resetting to default', e);
    }
    
    // Safe fallback to fresh draft
    let prefix = DEFAULT_PROFILE.invoicePrefix || 'INV-';
    let nextNum = DEFAULT_PROFILE.nextInvoiceNumber || '001';
    try {
      const profileRaw = localStorage.getItem('fastinvo_profile');
      if (profileRaw && profileRaw !== 'undefined') {
        const parsedP = JSON.parse(profileRaw);
        if (parsedP?.invoicePrefix) prefix = parsedP.invoicePrefix;
        if (parsedP?.nextInvoiceNumber) nextNum = parsedP.nextInvoiceNumber;
      }
    } catch {}

    return DEFAULT_INVOICE_DRAFT(`${prefix}${nextNum}`);
  });

  // 5. Client State Management (Loads from localStorage or defaults)
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_clients');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved clients, resetting to default', e);
    }
    return [
      {
        id: 'c1',
        name: 'Acme Corp',
        address: '123 Enterprise Way\nSilicon Valley, CA 94025',
        phone: '+1 (555) 019-2834',
        email: 'billing@acme.com'
      },
      {
        id: 'c2',
        name: 'Globex Corporation',
        address: '100 Shell Road\nSuite 4B\nBoston, MA 02110',
        phone: '+1 (617) 555-0150',
        email: 'finance@globex.com'
      }
    ];
  });

  // 6. Undo / Redo History States
  const [past, setPast] = useState<InvoiceDraft[]>([]);
  const [future, setFuture] = useState<InvoiceDraft[]>([]);

  // 7. Sync to Local Storage and IndexedDB on State Change
  useEffect(() => {
    saveSettingToDB('fastinvo_profile', profile);
  }, [profile]);

  useEffect(() => {
    saveSettingToDB('fastinvo_tax', tax);
  }, [tax]);

  useEffect(() => {
    const cleanedDraft = {
      ...draft,
      items: filterRealItems(draft.items)
    };
    saveSettingToDB('fastinvo_draft', cleanedDraft);
  }, [draft]);

  useEffect(() => {
    saveClientsToDB(clients);
  }, [clients]);

  // Saved Invoices History (Loads from IndexedDB / localStorage)
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('fastinvo_history');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved invoices history', e);
    }
    return [];
  });

  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    saveInvoicesToDB(savedInvoices);
  }, [savedInvoices]);

  // Auto-save active draft into history
  useEffect(() => {
    const invNum = (draft.metadata.invoiceNumber || '').trim();
    const custName = (draft.customer.name || '').trim();
    const realItems = filterRealItems(draft.items);

    if (invNum && (custName || realItems.length > 0)) {
      const cleanedDraft = {
        ...draft,
        items: realItems
      };

      setSavedInvoices(prev => {
        let existingIndex = -1;
        if (activeInvoiceId) {
          existingIndex = prev.findIndex(item => item.id === activeInvoiceId);
        }
        if (existingIndex < 0 && invNum) {
          existingIndex = prev.findIndex(item => item.draft.metadata.invoiceNumber === invNum);
        }

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          if (
            JSON.stringify(existing.draft) === JSON.stringify(cleanedDraft) &&
            JSON.stringify(existing.profile) === JSON.stringify(profile) &&
            JSON.stringify(existing.tax) === JSON.stringify(tax)
          ) {
            return prev;
          }
          const updated = [...prev];
          updated[existingIndex] = {
            ...existing,
            draft: cleanedDraft,
            profile,
            tax,
          };
          return updated;
        } else {
          const targetId = activeInvoiceId || `inv-${Date.now()}`;
          if (!activeInvoiceId) {
            setActiveInvoiceId(targetId);
          }
          const newInvoice: SavedInvoice = {
            id: targetId,
            draft: cleanedDraft,
            profile,
            tax,
            createdAt: new Date().toISOString()
          };
          return [newInvoice, ...prev];
        }
      });
    }
  }, [draft, profile, tax, activeInvoiceId]);

  const handleSaveInvoice = (invoiceDraft: InvoiceDraft, customProfile?: BusinessProfile, customTax?: TaxConfig) => {
    const cleanedDraft = {
      ...invoiceDraft,
      items: filterRealItems(invoiceDraft.items)
    };
    const invoiceNum = cleanedDraft.metadata.invoiceNumber || 'DRAFT';
    const profileToUse = customProfile || profile;
    const taxToUse = customTax || tax;

    setSavedInvoices(prev => {
      let existingIndex = -1;
      if (activeInvoiceId) {
        existingIndex = prev.findIndex(item => item.id === activeInvoiceId);
      }
      if (existingIndex < 0 && invoiceNum) {
        existingIndex = prev.findIndex(item => item.draft.metadata.invoiceNumber === invoiceNum);
      }

      const targetId = existingIndex >= 0 ? prev[existingIndex].id : (activeInvoiceId || `inv-${Date.now()}`);
      if (!activeInvoiceId) {
        setActiveInvoiceId(targetId);
      }

      const newInvoice: SavedInvoice = {
        id: targetId,
        draft: cleanedDraft,
        profile: profileToUse,
        tax: taxToUse,
        createdAt: existingIndex >= 0 ? prev[existingIndex].createdAt : new Date().toISOString()
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newInvoice;
        return updated;
      } else {
        return [newInvoice, ...prev];
      }
    });
  };

  const handleDeleteInvoice = (id: string) => {
    if (activeInvoiceId === id) {
      setActiveInvoiceId(null);
    }
    setSavedInvoices(prev => prev.filter(item => item.id !== id));
  };

  const handleRestoreInvoice = (invoice: SavedInvoice) => {
    setDraft(invoice.draft);
    setProfile(invoice.profile);
    setTax(invoice.tax);
    setActiveInvoiceId(invoice.id);
    setPast([]);
    setFuture([]);
    changeTab('editor');
  };

  // 8. Custom state setter for draft that registers changes to history
  const setDraftWithHistory = (newDraftOrFn: InvoiceDraft | ((prev: InvoiceDraft) => InvoiceDraft)) => {
    setDraft(prev => {
      const next = typeof newDraftOrFn === 'function' ? newDraftOrFn(prev) : newDraftOrFn;
      // Compare to check for real changes
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        setPast(p => [...p.slice(-49), prev]); // Limit history length to 50
        setFuture([]); // Clear redo stack on action
      }
      return next;
    });
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture(f => [draft, ...f]);
    setDraft(previous);
    setPast(newPast);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast(p => [...p, draft]);
    setDraft(next);
    setFuture(newFuture);
  };

  // Keyboard listener for Undo/Redo (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'editor') return;

      const isZ = e.key?.toLowerCase() === 'z';
      const isY = e.key?.toLowerCase() === 'y';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      if (isCmdOrCtrl && isZ) {
        e.preventDefault();
        if (isShift) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCmdOrCtrl && isY) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, past, future, draft]);

  // 9. Start New Invoice (Auto-increment and clear fields)
  const handleNewInvoice = () => {
    const nextNum = profile.nextInvoiceNumber + 1;
    
    // Save next counter to profile state
    setProfile({
      ...profile,
      nextInvoiceNumber: nextNum
    });

    // Reset draft fields using new counter
    const nextDraftNum = `${profile.invoicePrefix}${nextNum}`;
    setDraft(DEFAULT_INVOICE_DRAFT(nextDraftNum));
    setActiveInvoiceId(null);
    setPast([]);
    setFuture([]);
    
    changeTab('editor');
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'preview') {
      const name = draft.customer.name.trim();
      const phone = draft.customer.phone.trim();
      const address = draft.customer.address.trim();
      
      if (!name || !phone || !address) {
        alert("Customer Name, Phone number, and Billing Address are mandatory. Please fill them in before previewing.");
        changeTab('editor');
        
        // Stagger focus slightly so React tab-switch completes
        setTimeout(() => {
          let targetId = '';
          if (!name) targetId = 'customer-name-input';
          else if (!address) targetId = 'customer-address-input';
          else if (!phone) targetId = 'customer-phone-input';
          
          if (targetId) {
            const el = document.getElementById(targetId);
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 100);
        return;
      }
    }
    changeTab(tab);
  };

  const handleSelectInvoiceFromDashboard = (invoice: SavedInvoice) => {
    setDraft(invoice.draft);
    setProfile(invoice.profile);
    setTax(invoice.tax);
    setActiveInvoiceId(invoice.id);
    changeTab('preview');
  };

  const handleEditInvoice = (invoice: SavedInvoice) => {
    setDraft(invoice.draft);
    setProfile(invoice.profile);
    setTax(invoice.tax);
    setActiveInvoiceId(invoice.id);
    setPast([]);
    setFuture([]);
    changeTab('editor');
  };

  const handleDuplicateInvoice = (invoice: SavedInvoice) => {
    const nextNum = profile.nextInvoiceNumber + 1;
    setProfile({
      ...profile,
      nextInvoiceNumber: nextNum
    });
    const newInvoiceNumber = `${profile.invoicePrefix}${nextNum}`;
    const duplicatedDraft: InvoiceDraft = {
      ...invoice.draft,
      metadata: {
        ...invoice.draft.metadata,
        invoiceNumber: newInvoiceNumber,
        issueDate: new Date().toISOString().split('T')[0],
      },
      status: 'Due',
      paidAmount: 0
    };
    setDraft(duplicatedDraft);
    setActiveInvoiceId(null);
    setPast([]);
    setFuture([]);
    changeTab('editor');
  };

  const handleCreateInvoiceForClient = (client: Client) => {
    handleNewInvoice();
    setDraft(prev => ({
      ...prev,
      customer: {
        name: client.name,
        address: client.address || '',
        phone: client.phone || '',
        email: client.email || '',
      }
    }));
    changeTab('editor');
  };

  const handleRestoreDatabase = async (
    backupData: FastInvoDatabaseBackup['data'],
    mode: 'replace' | 'merge' = 'replace'
  ) => {
    try {
      if (mode === 'replace') {
        if (backupData.invoices) {
          setSavedInvoices(backupData.invoices);
          await saveInvoicesToDB(backupData.invoices);
        }
        if (backupData.clients) {
          setClients(backupData.clients);
          await saveClientsToDB(backupData.clients);
        }
        if (backupData.savedItems) {
          setSavedItems(backupData.savedItems);
          await saveSavedItemsToDB(backupData.savedItems);
        }
        if (backupData.profile && Object.keys(backupData.profile).length > 0) {
          setProfile(backupData.profile);
          await saveSettingToDB('fastinvo_profile', backupData.profile);
        }
        if (backupData.tax && Object.keys(backupData.tax).length > 0) {
          setTax(backupData.tax);
          await saveSettingToDB('fastinvo_tax', backupData.tax);
        }
        if (backupData.draft) {
          setDraft(backupData.draft);
          await saveSettingToDB('fastinvo_draft', backupData.draft);
        }
        if (backupData.themeMode) {
          setThemeMode(backupData.themeMode);
          await saveSettingToDB('fastinvo_theme_mode', backupData.themeMode);
        }
        if (backupData.twoFactorConfig) {
          setTwoFactorConfig(backupData.twoFactorConfig);
          await saveSettingToDB('fastinvo_2fa_config', backupData.twoFactorConfig);
        }
        if (backupData.teamMembers) {
          setTeamMembers(backupData.teamMembers);
          await saveSettingToDB('fastinvo_team_members', backupData.teamMembers);
        }
        if (backupData.workspaceConfig) {
          setWorkspaceConfig(backupData.workspaceConfig);
          await saveSettingToDB('fastinvo_workspace_config', backupData.workspaceConfig);
        }
      } else {
        // Merge mode: append non-existing items
        if (backupData.invoices && backupData.invoices.length > 0) {
          const existingIds = new Set(savedInvoices.map(i => i.id));
          const newItems = backupData.invoices.filter(i => !existingIds.has(i.id));
          const merged = [...newItems, ...savedInvoices];
          setSavedInvoices(merged);
          await saveInvoicesToDB(merged);
        }
        if (backupData.clients && backupData.clients.length > 0) {
          const existingIds = new Set(clients.map(c => c.id));
          const newItems = backupData.clients.filter(c => !existingIds.has(c.id));
          const merged = [...clients, ...newItems];
          setClients(merged);
          await saveClientsToDB(merged);
        }
        if (backupData.savedItems && backupData.savedItems.length > 0) {
          const existingIds = new Set(savedItems.map(s => s.id));
          const newItems = backupData.savedItems.filter(s => !existingIds.has(s.id));
          const merged = [...savedItems, ...newItems];
          setSavedItems(merged);
          await saveSavedItemsToDB(merged);
        }
      }
    } catch (err) {
      console.error('Failed to restore database in App.tsx:', err);
      throw err;
    }
  };

  const handleRecordPayment = (method: string = 'Cash') => {
    const generatedTxn = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const { grandTotal } = calculateInvoiceTotals(draft.items, draft.discountType, draft.discountValue, tax);

    const updatedDraft: InvoiceDraft = {
      ...draft,
      status: 'Paid',
      paidAmount: grandTotal,
      paidDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      paymentMethod: method,
    };

    setDraft(updatedDraft);
    handleSaveInvoice(updatedDraft, profile, tax);
    setPaymentTxnId(generatedTxn);
    setPaymentMethodName(method);
    setIsPaymentModalOpen(true);
  };

  const handleConvertQuoteToInvoice = (targetOrSaved: InvoiceDraft | SavedInvoice) => {
    const quoteDraft = 'draft' in targetOrSaved ? targetOrSaved.draft : targetOrSaved;
    
    // 1. Generate new invoice number
    const nextNum = profile.nextInvoiceNumber + 1;
    setProfile(prev => ({ ...prev, nextInvoiceNumber: nextNum }));
    const newInvoiceNumber = `${profile.invoicePrefix}${nextNum}`;

    // 2. Create new linked invoice draft
    const newInvoiceDraft: InvoiceDraft = {
      ...quoteDraft,
      documentType: 'invoice',
      quotationStatus: undefined,
      status: 'Due',
      paidAmount: 0,
      originatingQuotationNumber: quoteDraft.metadata.quotationNumber || quoteDraft.metadata.invoiceNumber,
      metadata: {
        ...quoteDraft.metadata,
        invoiceNumber: newInvoiceNumber,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: quoteDraft.metadata.validUntil || 'On Receipt',
      }
    };

    // 3. Mark the original quotation as Accepted and link converted invoice number
    const updatedQuoteDraft: InvoiceDraft = {
      ...quoteDraft,
      quotationStatus: 'Accepted',
      convertedInvoiceNumber: newInvoiceNumber,
    };

    // Update original quotation in saved history
    setDraft(updatedQuoteDraft);
    handleSaveInvoice(updatedQuoteDraft, profile, tax);

    // 4. Save new invoice and switch to preview with new invoice
    setTimeout(() => {
      setDraft(newInvoiceDraft);
      setActiveInvoiceId(null);
      changeTab('preview');
    }, 100);
  };

  const handleUpdateQuoteStatus = (status: 'Draft' | 'Sent' | 'Accepted' | 'Declined') => {
    const updatedDraft: InvoiceDraft = {
      ...draft,
      quotationStatus: status,
    };
    setDraft(updatedDraft);
    handleSaveInvoice(updatedDraft, profile, tax);
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-clip bg-[#F7F8FA] dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-150 pb-20">
      
      {/* Responsive Header Navigation with Adaptive Dropdown */}
      <HeaderNavigation
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchToStaff={handleSwitchToStaff}
        teamMembers={teamMembers}
        profile={profile}
        isDark={isDark}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 max-w-full min-w-0" id="app-main-content">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabTransitionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="w-full h-full max-w-full min-w-0"
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                invoices={savedInvoices}
                profile={profile}
                clients={clients}
                onNewInvoice={handleNewInvoice}
                onSelectInvoice={handleSelectInvoiceFromDashboard}
                onGoToClients={() => changeTab('clients')}
                onGoToHistory={() => changeTab('history')}
                onGoToSettings={() => changeTab('settings')}
              />
            )}

            {activeTab === 'editor' && (
              <InvoiceEditorView
                draft={draft}
                setDraft={setDraftWithHistory}
                profile={profile}
                setProfile={setProfile}
                tax={tax}
                onPreview={() => handleTabChange('preview')}
                onNewInvoice={handleNewInvoice}
                clients={clients}
                setClients={setClients}
                canUndo={past.length > 0}
                canRedo={future.length > 0}
                onUndo={handleUndo}
                onRedo={handleRedo}
                savedItems={savedItems}
                setSavedItems={setSavedItems}
              />
            )}

            {activeTab === 'preview' && (
              <InvoicePreviewView
                draft={draft}
                profile={profile}
                tax={tax}
                onEdit={() => changeTab('editor')}
                onNewInvoice={handleNewInvoice}
                onSaveToHistory={handleSaveInvoice}
                onRecordPayment={handleRecordPayment}
                onOpenReceipt={() => changeTab('receipt')}
                onConvertQuoteToInvoice={() => handleConvertQuoteToInvoice(draft)}
                onUpdateQuoteStatus={handleUpdateQuoteStatus}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                savedInvoices={savedInvoices}
                profile={profile}
                currentUser={currentUser}
                onSelectInvoice={handleSelectInvoiceFromDashboard}
                onEditInvoice={handleEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onNewInvoice={handleNewInvoice}
                onDuplicateInvoice={handleDuplicateInvoice}
                onRecordPaymentForInvoice={(inv) => {
                  setDraft(inv.draft);
                  setProfile(inv.profile);
                  setTax(inv.tax);
                  setActiveInvoiceId(inv.id);
                  handleRecordPayment('Cash');
                }}
                onConvertQuoteToInvoice={handleConvertQuoteToInvoice}
                onBack={handleBack}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                invoices={savedInvoices}
                profile={profile}
                clients={clients}
                currentUser={currentUser}
                onSelectInvoice={handleSelectInvoiceFromDashboard}
                onGoToClients={() => changeTab('clients')}
                onBack={handleBack}
              />
            )}

            {activeTab === 'receipt' && (
              <ReceiptView
                draft={draft}
                profile={profile}
                tax={tax}
                transactionId={paymentTxnId || 'TXN-88219'}
                paymentMethod={paymentMethodName || 'Cash'}
                onBack={() => changeTab('preview')}
              />
            )}

            {activeTab === 'clients' && (
              <ClientsView
                clients={clients}
                setClients={setClients}
                invoices={savedInvoices}
                profile={profile}
                currentUser={currentUser}
                onCreateInvoiceForClient={handleCreateInvoiceForClient}
                onSelectInvoice={handleSelectInvoiceFromDashboard}
                onBack={handleBack}
              />
            )}

            {activeTab === ('saved_items' as NavTab) && (
              <SavedItemsView
                savedItems={savedItems}
                setSavedItems={setSavedItems}
                currency={profile.currency}
                onBack={handleBack}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                profile={profile}
                setProfile={setProfile}
                tax={tax}
                setTax={setTax}
                onGoToSettings={handleGoToSettings}
                currentUser={currentUser}
                onBack={handleBack}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                profile={profile}
                setProfile={setProfile}
                tax={tax}
                setTax={setTax}
                isDark={isDark}
                onToggleTheme={toggleTheme}
                themeMode={themeMode}
                onThemeModeChange={setThemeMode}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                twoFactorConfig={twoFactorConfig}
                setTwoFactorConfig={setTwoFactorConfig}
                savedInvoices={savedInvoices}
                clients={clients}
                savedItems={savedItems}
                draft={draft}
                onRestoreDatabase={handleRestoreDatabase}
                onGoToProfile={() => changeTab('profile')}
                initialSection={settingsInitialSection}
                onBack={handleBack}
                teamMembers={teamMembers}
                setTeamMembers={setTeamMembers}
                workspaceConfig={workspaceConfig}
                setWorkspaceConfig={setWorkspaceConfig}
                onSwitchToStaff={handleSwitchToStaff}
                onOpenPinModal={() => setIsStaffPinModalOpen(true)}
              />
            )}

            {activeTab === 'login' && (
              <LoginPage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                twoFactorConfig={twoFactorConfig}
                workspaceConfig={workspaceConfig}
                setWorkspaceConfig={setWorkspaceConfig}
                teamMembers={teamMembers}
                setTeamMembers={setTeamMembers}
                onSuccessRedirect={() => changeTab('dashboard')}
                onBack={handleBack}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Standard Application Footer & Developer Credit */}
        <footer className="mt-14 pt-6 pb-2 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 no-print" id="fastinvo-app-footer">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-black p-0.5 rounded-lg border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={FASTINVO_ICON_MARK}
                alt="FastInvo Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-black text-slate-800 dark:text-slate-200 text-xs">
                Fast<span className="text-emerald-500">Invo</span>
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1.5 font-medium">
                © {new Date().getFullYear()} • Enterprise Invoicing & Billing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Developed by</span>
            <a
              href="mailto:fastinvoicd@gmail.com"
              className="font-extrabold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2"
            >
              Ashraful Islam
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
              v2.4 Pro
            </span>
          </div>
        </footer>
      </main>

      {/* Staff PIN Keypad Login Modal */}
      <StaffPinLoginModal
        isOpen={isStaffPinModalOpen}
        onClose={() => {
          setIsStaffPinModalOpen(false);
          setSelectedStaffForPin(null);
        }}
        teamMembers={teamMembers}
        onStaffLoginSuccess={handleStaffPinSuccess}
        initialMember={selectedStaffForPin}
      />

      {/* Payment Complete Modal */}
      <PaymentCompleteModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        draft={draft}
        profile={profile}
        tax={tax}
        transactionId={paymentTxnId}
        paymentMethod={paymentMethodName}
        onOpenReceipt={() => changeTab('receipt')}
        onShareReceipt={() => changeTab('receipt')}
      />

      {/* Auth & Security Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        twoFactorConfig={twoFactorConfig}
        onOpenTwoFactorModal={() => setIsTwoFactorModalOpen(true)}
      />

      {/* Two-Factor Authentication Modal */}
      <TwoFactorModal
        isOpen={isTwoFactorModalOpen}
        onClose={() => setIsTwoFactorModalOpen(false)}
        config={twoFactorConfig}
        onSaveConfig={setTwoFactorConfig}
      />

      {/* Floating Pinned Mobile/Desktop Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={changeTab}
        onNewInvoice={handleNewInvoice}
      />

    </div>
  );
}

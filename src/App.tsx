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
  Sparkles,
  Receipt,
  Sun,
  Moon,
  History
} from 'lucide-react';
import { BusinessProfile, TaxConfig, InvoiceDraft, Client, SavedInvoice } from './types';
import { 
  DEFAULT_PROFILE, 
  DEFAULT_TAX_CONFIG, 
  DEFAULT_INVOICE_DRAFT 
} from './constants';
import SettingsView from './components/SettingsView';
import InvoiceEditorView from './components/InvoiceEditorView';
import InvoicePreviewView from './components/InvoicePreviewView';
import HistoryView from './components/HistoryView';

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
  const tabOrder = ['editor', 'preview', 'history', 'settings'] as const;
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'history' | 'settings'>('editor');
  const [direction, setDirection] = useState<number>(0);

  const changeTab = (tab: 'editor' | 'preview' | 'history' | 'settings') => {
    const prevIndex = tabOrder.indexOf(activeTab);
    const nextIndex = tabOrder.indexOf(tab);
    setDirection(nextIndex > prevIndex ? 1 : -1);
    setActiveTab(tab);
  };

  // Theme State Management (Loads from localStorage or defaults)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('fastinvo_theme');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fastinvo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fastinvo_theme', 'light');
    }

    // Dynamic theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', isDark ? '#020617' : '#f8fafc');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // 2. Profile State Management (Loads from localStorage or defaults)
  const [profile, setProfile] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem('fastinvo_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved profile, resetting to default', e);
      }
    }
    return DEFAULT_PROFILE;
  });

  // 3. Tax Config State Management (Loads from localStorage or defaults)
  const [tax, setTax] = useState<TaxConfig>(() => {
    const saved = localStorage.getItem('fastinvo_tax');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved tax config, resetting to default', e);
      }
    }
    return DEFAULT_TAX_CONFIG;
  });

  // 4. Draft State Management (Loads from localStorage or creates empty)
  const [draft, setDraft] = useState<InvoiceDraft>(() => {
    const saved = localStorage.getItem('fastinvo_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved draft invoice, resetting to default', e);
      }
    }
    // Fallback to fresh draft matching current business details
    const initialProfile = localStorage.getItem('fastinvo_profile')
      ? JSON.parse(localStorage.getItem('fastinvo_profile')!)
      : DEFAULT_PROFILE;
    return DEFAULT_INVOICE_DRAFT(`${initialProfile.invoicePrefix}${initialProfile.nextInvoiceNumber}`);
  });

  // 5. Client State Management (Loads from localStorage or defaults)
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('fastinvo_clients');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved clients, resetting to default', e);
      }
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

  // 7. Sync to Local Storage on State Change
  useEffect(() => {
    localStorage.setItem('fastinvo_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('fastinvo_tax', JSON.stringify(tax));
  }, [tax]);

  useEffect(() => {
    localStorage.setItem('fastinvo_draft', JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    localStorage.setItem('fastinvo_clients', JSON.stringify(clients));
  }, [clients]);

  // Saved Invoices History (Loads from localStorage)
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>(() => {
    const saved = localStorage.getItem('fastinvo_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved invoices history', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('fastinvo_history', JSON.stringify(savedInvoices));
  }, [savedInvoices]);

  const handleSaveInvoice = (invoiceDraft: InvoiceDraft, customProfile?: BusinessProfile, customTax?: TaxConfig) => {
    const invoiceNum = invoiceDraft.metadata.invoiceNumber || 'DRAFT';
    const profileToUse = customProfile || profile;
    const taxToUse = customTax || tax;

    setSavedInvoices(prev => {
      // Check if invoice number already exists
      const existingIndex = prev.findIndex(item => item.draft.metadata.invoiceNumber === invoiceNum);
      const newInvoice: SavedInvoice = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `inv-${Date.now()}`,
        draft: invoiceDraft,
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
    setSavedInvoices(prev => prev.filter(item => item.id !== id));
  };

  const handleRestoreInvoice = (invoice: SavedInvoice) => {
    setDraft(invoice.draft);
    setProfile(invoice.profile);
    setTax(invoice.tax);
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
    setPast([]);
    setFuture([]);
    
    changeTab('editor');
  };

  const handleTabChange = (tab: 'editor' | 'preview' | 'history' | 'settings') => {
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

  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-150">
      
      {/* Sleek App Navigation Header (Omitted on print) */}
      <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm" id="app-chrome-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Minimal logo / understated wordmark */}
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-slate-900 dark:bg-slate-800 text-white rounded flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
                  FastInvo
                </span>
              </div>

              {/* View Switcher / Tab Bar */}
              <nav className="flex space-x-1" id="app-view-tabs" aria-label="Tabs">
                <button
                  onClick={() => handleTabChange('editor')}
                  id="tab-btn-editor"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all cursor-pointer border-b-2 min-h-[40px] ${
                    activeTab === 'editor'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>

                 <button
                  onClick={() => handleTabChange('preview')}
                  id="tab-btn-preview"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all cursor-pointer border-b-2 min-h-[40px] ${
                    activeTab === 'preview'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <button
                  onClick={() => handleTabChange('history')}
                  id="tab-btn-history"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all cursor-pointer border-b-2 min-h-[40px] ${
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                </button>

                <button
                  onClick={() => handleTabChange('settings')}
                  id="tab-btn-settings"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all cursor-pointer border-b-2 min-h-[40px] ${
                    activeTab === 'settings'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>

            {/* Theme Toggle & Indicators */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                id="theme-toggle-btn"
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border border-slate-150 dark:border-slate-800"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-500 animate-fadeIn" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700 animate-fadeIn" />
                )}
              </button>

              <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Local Autosave
                </span>
                <span className="text-slate-300">|</span>
                <span>Currency: {profile.currency.code} ({profile.currency.symbol})</span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8" id="app-main-content">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabTransitionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full h-full"
          >
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
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                invoices={savedInvoices}
                onDeleteInvoice={handleDeleteInvoice}
                onRestoreInvoice={handleRestoreInvoice}
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
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Subtle Footer (Omitted on print) */}
      <footer className="no-print bg-white dark:bg-slate-900 border-t border-gray-200/60 dark:border-slate-800 py-5 text-center text-xs text-gray-400 dark:text-slate-500" id="app-footer">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} FastInvo. Fast, private, and offline-first invoice builder.</p>
        </div>
      </footer>

    </div>
  );
}

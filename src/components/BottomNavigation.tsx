import React from 'react';
import { 
  Home, 
  FileText, 
  Plus, 
  BarChart3, 
  User,
  Settings as SettingsIcon
} from 'lucide-react';

export type NavTab = 'dashboard' | 'editor' | 'preview' | 'history' | 'reports' | 'clients' | 'profile' | 'settings' | 'login' | 'receipt';

interface BottomNavigationProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  onNewInvoice: () => void;
}

export default function BottomNavigation({
  activeTab,
  onChangeTab,
  onNewInvoice,
}: BottomNavigationProps) {
  return (
    <div className="no-print fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none flex justify-center md:hidden">
      <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-900/10 px-4 py-2.5 flex items-center justify-between gap-1 sm:gap-3 max-w-md w-full mx-auto">
        
        {/* 1. Home (Dashboard) */}
        <button
          onClick={() => onChangeTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-[#0F3D2E] dark:text-emerald-400 font-extrabold bg-emerald-50/80 dark:bg-emerald-950/50'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title="Home"
        >
          <Home className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Home</span>
        </button>

        {/* 2. Invoices (History/List) */}
        <button
          onClick={() => onChangeTab('history')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'history'
              ? 'text-[#0F3D2E] dark:text-emerald-400 font-extrabold bg-emerald-50/80 dark:bg-emerald-950/50'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title="Invoices"
        >
          <FileText className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Invoices</span>
        </button>

        {/* 3. Center Solid Black Circular FAB (+) */}
        <div className="flex-1 flex items-center justify-center -mt-7">
          <button
            onClick={onNewInvoice}
            className="w-13 h-13 rounded-full bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-900/30 flex items-center justify-center transition-transform cursor-pointer active:scale-90 hover:scale-105 border-2 border-white dark:border-slate-950"
            title="Create Invoice"
            aria-label="Create Invoice"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Reports (Analytics / Dashboard Charts) */}
        <button
          onClick={() => onChangeTab('reports')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'reports'
              ? 'text-[#0F3D2E] dark:text-emerald-400 font-extrabold bg-emerald-50/80 dark:bg-emerald-950/50'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title="Reports"
        >
          <BarChart3 className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Reports</span>
        </button>

        {/* 5. Settings */}
        <button
          onClick={() => onChangeTab('settings')}
          id="mobile-nav-settings-btn"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'settings' || activeTab === 'profile'
              ? 'text-[#0F3D2E] dark:text-emerald-400 font-extrabold bg-emerald-50/80 dark:bg-emerald-950/50'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title="Settings"
        >
          <SettingsIcon className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Settings</span>
        </button>

      </div>
    </div>
  );
}

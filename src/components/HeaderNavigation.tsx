import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Eye, 
  Settings as SettingsIcon, 
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
  LogOut,
  ChevronDown,
  Check,
  MoreHorizontal
} from 'lucide-react';
import { AuthUser, BusinessProfile, TeamMember } from '../types';
import { NavTab } from './BottomNavigation';
import { FASTINVO_ICON_MARK } from '../assets/logo';

export interface HeaderNavigationProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onSwitchToStaff: (member?: TeamMember) => void;
  teamMembers: TeamMember[];
  profile: BusinessProfile;
  isDark: boolean;
  themeMode: 'system' | 'light' | 'dark';
  toggleTheme: () => void;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  description: string;
}

const ALL_TABS: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, description: 'Overview, analytics & metrics' },
  { id: 'editor', label: 'Editor', shortLabel: 'Editor', icon: FileText, description: 'Create & edit invoice draft' },
  { id: 'preview', label: 'Preview', shortLabel: 'Preview', icon: Eye, description: 'Live printable document preview' },
  { id: 'history', label: 'Invoices', shortLabel: 'Invoices', icon: History, description: 'Invoice history & records' },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: BarChart3, description: 'Income & tax breakdown' },
  { id: 'clients', label: 'Clients', shortLabel: 'Clients', icon: Users, description: 'Client directory & records' },
  { id: 'saved_items' as NavTab, label: 'Saved Items', shortLabel: 'Items', icon: Bookmark, description: 'Catalog items & price presets' },
  { id: 'profile', label: 'Profile', shortLabel: 'Profile', icon: User, description: 'Business & company profile' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: SettingsIcon, description: 'App preferences & workspace' },
];

export default function HeaderNavigation({
  activeTab,
  onChangeTab,
  currentUser,
  onLogout,
  onSwitchToStaff,
  teamMembers,
  profile,
  isDark,
  themeMode,
  toggleTheme,
}: HeaderNavigationProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectTab = (tab: NavTab) => {
    onChangeTab(tab);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Determine active item info
  const activeTabInfo = ALL_TABS.find(t => t.id === activeTab) || ALL_TABS[0];
  const ActiveIcon = activeTabInfo.icon;

  // Check if active tab is in secondary dropdown group
  const isDropdownTabActive = ['reports', 'clients', 'saved_items', 'profile', 'settings'].includes(activeTab);

  return (
    <header 
      className="no-print bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 sticky top-0 z-40 shadow-xs w-full max-w-full min-w-0" 
      id="app-chrome-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Brand Logo & Mobile View Selector */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-8 min-w-0 overflow-visible">
            {/* Brand Wordmark */}
            <div 
              onClick={() => handleSelectTab('dashboard')} 
              className="flex items-center gap-2.5 shrink-0 cursor-pointer active:scale-95 transition-transform"
              title="FastInvo - Go to Dashboard"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs border border-emerald-900/30 flex items-center justify-center shrink-0 bg-black">
                <img 
                  src={FASTINVO_ICON_MARK} 
                  alt="FastInvo Logo" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-sans shrink-0">
                Fast<span className="text-emerald-500">Invo</span>
              </span>
            </div>

            {/* Mobile View Selector Dropdown (Shown on mobile & small tablet < md) */}
            <div className="relative md:hidden" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                id="mobile-view-selector-btn"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-2xs cursor-pointer active:scale-95 transition-all"
                aria-expanded={isMobileMenuOpen}
                aria-label="Select View"
              >
                <ActiveIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2]" />
                <span className="max-w-[75px] truncate text-[11px] font-extrabold">{activeTabInfo.label}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180 text-emerald-500' : ''}`} />
              </button>

              {/* Mobile View Dropdown Popover */}
              {isMobileMenuOpen && (
                <div 
                  className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/15 py-2 z-50 animate-fadeIn divide-y divide-slate-100 dark:divide-slate-800/60"
                  id="mobile-tabs-dropdown-menu"
                >
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Workspace Navigation
                  </div>
                  <div className="p-1 space-y-0.5">
                    {ALL_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleSelectTab(tab.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 stroke-[2] ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop View Switcher Header Tabs (Adaptive with Dropdown) */}
            <nav className="hidden md:flex items-center space-x-1 min-w-0 py-1" id="app-view-tabs" aria-label="Tabs">
              {/* 1. Dashboard (Always Visible) */}
              <button
                onClick={() => handleSelectTab('dashboard')}
                id="tab-btn-dashboard"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 stroke-[2]" />
                <span>Dashboard</span>
              </button>

              {/* 2. Editor (Always Visible) */}
              <button
                onClick={() => handleSelectTab('editor')}
                id="tab-btn-editor"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  activeTab === 'editor'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 stroke-[2]" />
                <span>Editor</span>
              </button>

              {/* 3. Preview (Always Visible) */}
              <button
                onClick={() => handleSelectTab('preview')}
                id="tab-btn-preview"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  activeTab === 'preview'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Eye className="w-3.5 h-3.5 stroke-[2]" />
                <span>Preview</span>
              </button>

              {/* 4. Invoices History (Always Visible) */}
              <button
                onClick={() => handleSelectTab('history')}
                id="tab-btn-history"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  activeTab === 'history'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <History className="w-3.5 h-3.5 stroke-[2]" />
                <span>Invoices</span>
              </button>

              {/* 5. Reports (Visible on Large Screens lg+) */}
              <button
                onClick={() => handleSelectTab('reports')}
                id="tab-btn-reports"
                className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  activeTab === 'reports'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 stroke-[2]" />
                <span>Reports</span>
              </button>

              {/* 6. Clients (Visible on Large Screens lg+) */}
              <button
                onClick={() => handleSelectTab('clients')}
                id="tab-btn-clients"
                className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  activeTab === 'clients'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 stroke-[2]" />
                <span>Clients</span>
              </button>

              {/* 7. Saved Items (Visible on Extra Large Screens xl+) */}
              <button
                onClick={() => handleSelectTab('saved_items' as NavTab)}
                id="tab-btn-saved-items"
                className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  activeTab === ('saved_items' as NavTab)
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 stroke-[2]" />
                <span>Saved Items</span>
              </button>

              {/* 8. Profile (Visible on Extra Large Screens xl+) */}
              <button
                onClick={() => handleSelectTab('profile')}
                id="tab-btn-profile"
                className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  activeTab === 'profile'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <User className="w-3.5 h-3.5 stroke-[2]" />
                <span>Profile</span>
              </button>

              {/* 9. Dropdown Menu for Hidden / Secondary Tabs */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  id="tab-dropdown-btn"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                    isDropdownTabActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold border-emerald-300 dark:border-emerald-800 shadow-2xs'
                      : isDropdownOpen
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border-transparent'
                  }`}
                  aria-expanded={isDropdownOpen}
                  aria-label="More Navigation Tabs"
                  title="More Sections & Tools"
                >
                  {isDropdownTabActive ? (
                    <>
                      <ActiveIcon className="w-3.5 h-3.5 stroke-[2] text-emerald-600 dark:text-emerald-400" />
                      <span className="max-w-[85px] truncate font-extrabold">
                        {activeTabInfo.label}
                      </span>
                    </>
                  ) : (
                    <>
                      <MoreHorizontal className="w-3.5 h-3.5 stroke-[2]" />
                      <span>More</span>
                    </>
                  )}
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                </button>

                {/* Dropdown Menu Popover */}
                {isDropdownOpen && (
                  <div 
                    className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/15 p-1.5 z-50 animate-fadeIn"
                    id="header-tabs-dropdown-menu"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                      <span>More Tabs & Tools</span>
                      <span className="text-[9px] lowercase font-normal bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                        esc to close
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {/* Reports - visible in dropdown when screen < lg */}
                      <div className="lg:hidden">
                        <button
                          type="button"
                          onClick={() => handleSelectTab('reports')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'reports'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <BarChart3 className="w-4 h-4 text-slate-500 dark:text-slate-400 stroke-[1.8]" />
                            <div className="text-left">
                              <div>Reports</div>
                              <div className="text-[10px] font-normal text-slate-400">Income & tax breakdown</div>
                            </div>
                          </div>
                          {activeTab === 'reports' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                        </button>
                      </div>

                      {/* Clients - visible in dropdown when screen < lg */}
                      <div className="lg:hidden">
                        <button
                          type="button"
                          onClick={() => handleSelectTab('clients')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'clients'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400 stroke-[1.8]" />
                            <div className="text-left">
                              <div>Clients</div>
                              <div className="text-[10px] font-normal text-slate-400">Client directory & records</div>
                            </div>
                          </div>
                          {activeTab === 'clients' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                        </button>
                      </div>

                      {/* Saved Items - visible in dropdown when screen < xl */}
                      <div className="xl:hidden">
                        <button
                          type="button"
                          onClick={() => handleSelectTab('saved_items' as NavTab)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === ('saved_items' as NavTab)
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Bookmark className="w-4 h-4 text-slate-500 dark:text-slate-400 stroke-[1.8]" />
                            <div className="text-left">
                              <div>Saved Items</div>
                              <div className="text-[10px] font-normal text-slate-400">Item catalog & pricing</div>
                            </div>
                          </div>
                          {activeTab === ('saved_items' as NavTab) && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                        </button>
                      </div>

                      {/* Profile - visible in dropdown when screen < xl */}
                      <div className="xl:hidden">
                        <button
                          type="button"
                          onClick={() => handleSelectTab('profile')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'profile'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <User className="w-4 h-4 text-slate-500 dark:text-slate-400 stroke-[1.8]" />
                            <div className="text-left">
                              <div>Business Profile</div>
                              <div className="text-[10px] font-normal text-slate-400">Company & billing info</div>
                            </div>
                          </div>
                          {activeTab === 'profile' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

                      {/* Settings - Always in Dropdown & Accessible */}
                      <button
                        type="button"
                        onClick={() => handleSelectTab('settings')}
                        id="dropdown-tab-settings"
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activeTab === 'settings'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <SettingsIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2]" />
                          <div className="text-left">
                            <div>Settings</div>
                            <div className="text-[10px] font-normal text-slate-400">Workspace, team & backup</div>
                          </div>
                        </div>
                        {activeTab === 'settings' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Theme Toggle & Auth / Account Button Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentUser?.role === 'staff' ? (
              <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-xl px-2.5 py-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-emerald-900 dark:text-emerald-300 max-w-[90px] truncate text-[11px]">
                  {currentUser.displayName} (Staff)
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Switch / Logout Staff"
                  className="ml-1 p-0.5 text-emerald-700 dark:text-emerald-400 hover:text-rose-600 rounded cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : currentUser ? (
              <button
                type="button"
                onClick={() => handleSelectTab('login')}
                id="header-auth-btn"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer border ${
                  activeTab === 'login'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700'
                }`}
                title="Owner Account & Workspace Settings"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline max-w-[100px] truncate font-extrabold">
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                </span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.2 bg-emerald-600 text-white rounded-md">
                  Owner
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectTab('login')}
                  id="header-auth-btn"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer border ${
                    activeTab === 'login'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700'
                  }`}
                  title="Account Login (Google / PIN)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Account</span>
                </button>

                {teamMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSwitchToStaff()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900 transition-colors cursor-pointer"
                    title="Staff PIN Quick Login"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-[11px]">Staff PIN</span>
                  </button>
                )}
              </div>
            )}

            {/* Direct Header Settings Button */}
            <button
              type="button"
              onClick={() => handleSelectTab('settings')}
              id="header-settings-btn"
              className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center border ${
                activeTab === 'settings'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800'
              }`}
              title="Settings & Workspace Configuration"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              id="theme-toggle-btn"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center border border-slate-200/80 dark:border-slate-800"
              title={`Theme: ${themeMode === 'system' ? 'System Default' : themeMode === 'dark' ? 'Dark' : 'Light'} (Click to cycle)`}
            >
              {themeMode === 'system' ? (
                <Monitor className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-fadeIn stroke-[2]" />
              ) : isDark ? (
                <Moon className="w-4 h-4 text-indigo-400 animate-fadeIn stroke-[2]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500 animate-fadeIn stroke-[2]" />
              )}
            </button>

            {/* Autosaved status & Currency badge */}
            <div className="hidden lg:flex items-center gap-2.5 text-xs text-slate-400 font-medium pl-1">
              <span className="flex items-center gap-1.5 font-bold text-[11px]">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Autosaved
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {profile?.currency?.code || 'USD'} ({profile?.currency?.symbol || '$'})
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}

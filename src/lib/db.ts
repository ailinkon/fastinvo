import Dexie, { Table } from 'dexie';
import { SavedInvoice, Client, SavedItem, BusinessProfile, TaxConfig, AuthUser, TwoFactorConfig, InvoiceDraft, TeamMember, WorkspaceConfig } from '../types';

export interface KeyValueSetting {
  key: string;
  value: any;
}

export interface FastInvoDatabaseBackup {
  version: number;
  appName: string;
  exportedAt: string;
  summary: {
    invoicesCount: number;
    clientsCount: number;
    savedItemsCount: number;
    companyName: string;
    currencyCode: string;
  };
  data: {
    invoices: SavedInvoice[];
    clients: Client[];
    savedItems: SavedItem[];
    profile: BusinessProfile;
    tax: TaxConfig;
    draft?: InvoiceDraft;
    themeMode?: 'light' | 'dark' | 'system';
    twoFactorConfig?: TwoFactorConfig;
    currentUser?: AuthUser | null;
    teamMembers?: TeamMember[];
    workspaceConfig?: WorkspaceConfig;
    rawSettings?: Record<string, any>;
  };
}

export class FastInvoDatabase extends Dexie {
  invoices!: Table<SavedInvoice, string>;
  clients!: Table<Client, string>;
  savedItems!: Table<SavedItem, string>;
  settings!: Table<KeyValueSetting, string>;

  constructor() {
    super('FastInvoDatabase');
    this.version(1).stores({
      invoices: 'id, createdAt',
      clients: 'id, name, email',
      savedItems: 'id, name',
      settings: 'key'
    });
  }
}

export const db = new FastInvoDatabase();

/**
 * Migration helper to move legacy localStorage data into Dexie IndexedDB
 */
export async function initAndMigrateIndexedDB(): Promise<void> {
  try {
    // 1. Check if IndexedDB tables already have data
    const invoiceCount = await db.invoices.count();
    const clientCount = await db.clients.count();
    const itemCount = await db.savedItems.count();

    // Migrate Invoices
    if (invoiceCount === 0) {
      const rawInvoices = localStorage.getItem('fastinvo_history');
      if (rawInvoices) {
        try {
          const parsed: SavedInvoice[] = JSON.parse(rawInvoices);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await db.invoices.bulkPut(parsed);
          }
        } catch (e) {
          console.error('Error migrating localStorage invoices:', e);
        }
      }
    }

    // Migrate Clients
    if (clientCount === 0) {
      const rawClients = localStorage.getItem('fastinvo_clients');
      if (rawClients) {
        try {
          const parsed: Client[] = JSON.parse(rawClients);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await db.clients.bulkPut(parsed);
          }
        } catch (e) {
          console.error('Error migrating localStorage clients:', e);
        }
      }
    }

    // Migrate Saved Items
    if (itemCount === 0) {
      const rawItems = localStorage.getItem('fastinvo_saved_items');
      if (rawItems) {
        try {
          const parsed: SavedItem[] = JSON.parse(rawItems);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await db.savedItems.bulkPut(parsed);
          }
        } catch (e) {
          console.error('Error migrating localStorage saved items:', e);
        }
      }
    }

    // Migrate Settings (Profile, Tax, Draft, AuthUser, TwoFactor, ThemeMode, TeamMembers, WorkspaceConfig)
    const settingsKeys = [
      'fastinvo_profile',
      'fastinvo_tax',
      'fastinvo_draft',
      'fastinvo_auth_user',
      'fastinvo_2fa_config',
      'fastinvo_theme_mode',
      'fastinvo_team_members',
      'fastinvo_workspace_config',
    ];

    for (const key of settingsKeys) {
      const existing = await db.settings.get(key);
      if (!existing) {
        const rawVal = localStorage.getItem(key);
        if (rawVal) {
          try {
            const parsedVal = JSON.parse(rawVal);
            await db.settings.put({ key, value: parsedVal });
          } catch {
            await db.settings.put({ key, value: rawVal });
          }
        }
      }
    }
  } catch (err) {
    console.error('IndexedDB migration failed:', err);
  }
}

// Storage operations wrappers
export async function saveInvoicesToDB(invoices: SavedInvoice[]): Promise<void> {
  try {
    await db.invoices.clear();
    await db.invoices.bulkPut(invoices);
    localStorage.setItem('fastinvo_history', JSON.stringify(invoices));
  } catch (e) {
    console.error('Error saving invoices to IndexedDB:', e);
  }
}

export async function saveClientsToDB(clients: Client[]): Promise<void> {
  try {
    await db.clients.clear();
    await db.clients.bulkPut(clients);
    localStorage.setItem('fastinvo_clients', JSON.stringify(clients));
  } catch (e) {
    console.error('Error saving clients to IndexedDB:', e);
  }
}

export async function saveSavedItemsToDB(items: SavedItem[]): Promise<void> {
  try {
    await db.savedItems.clear();
    await db.savedItems.bulkPut(items);
    localStorage.setItem('fastinvo_saved_items', JSON.stringify(items));
  } catch (e) {
    console.error('Error saving items to IndexedDB:', e);
  }
}

export async function saveSettingToDB(key: string, value: any): Promise<void> {
  try {
    await db.settings.put({ key, value });
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, String(value));
    }
  } catch (e) {
    console.error(`Error saving setting ${key} to IndexedDB:`, e);
  }
}

/**
 * Builds the complete export JSON object for the entire local database
 */
export async function exportDatabaseBackup(currentState?: {
  invoices?: SavedInvoice[];
  clients?: Client[];
  savedItems?: SavedItem[];
  profile?: BusinessProfile;
  tax?: TaxConfig;
  draft?: InvoiceDraft;
  themeMode?: 'light' | 'dark' | 'system';
  twoFactorConfig?: TwoFactorConfig;
  currentUser?: AuthUser | null;
}): Promise<FastInvoDatabaseBackup> {
  // Pull from DB tables with fallback to passed state or localStorage
  let invoices = currentState?.invoices;
  if (!invoices || invoices.length === 0) {
    try {
      invoices = await db.invoices.toArray();
    } catch {
      invoices = [];
    }
  }
  if ((!invoices || invoices.length === 0) && localStorage.getItem('fastinvo_history')) {
    try {
      invoices = JSON.parse(localStorage.getItem('fastinvo_history') || '[]');
    } catch {
      invoices = [];
    }
  }

  let clients = currentState?.clients;
  if (!clients || clients.length === 0) {
    try {
      clients = await db.clients.toArray();
    } catch {
      clients = [];
    }
  }
  if ((!clients || clients.length === 0) && localStorage.getItem('fastinvo_clients')) {
    try {
      clients = JSON.parse(localStorage.getItem('fastinvo_clients') || '[]');
    } catch {
      clients = [];
    }
  }

  let savedItems = currentState?.savedItems;
  if (!savedItems || savedItems.length === 0) {
    try {
      savedItems = await db.savedItems.toArray();
    } catch {
      savedItems = [];
    }
  }
  if ((!savedItems || savedItems.length === 0) && localStorage.getItem('fastinvo_saved_items')) {
    try {
      savedItems = JSON.parse(localStorage.getItem('fastinvo_saved_items') || '[]');
    } catch {
      savedItems = [];
    }
  }

  const profile = currentState?.profile || 
    (localStorage.getItem('fastinvo_profile') ? JSON.parse(localStorage.getItem('fastinvo_profile')!) : undefined);
  const tax = currentState?.tax || 
    (localStorage.getItem('fastinvo_tax') ? JSON.parse(localStorage.getItem('fastinvo_tax')!) : undefined);
  const draft = currentState?.draft || 
    (localStorage.getItem('fastinvo_draft') ? JSON.parse(localStorage.getItem('fastinvo_draft')!) : undefined);
  const themeMode = currentState?.themeMode || 
    (localStorage.getItem('fastinvo_theme_mode') as 'light' | 'dark' | 'system') || 'system';
  const twoFactorConfig = currentState?.twoFactorConfig || 
    (localStorage.getItem('fastinvo_2fa_config') ? JSON.parse(localStorage.getItem('fastinvo_2fa_config')!) : undefined);
  const currentUser = currentState?.currentUser !== undefined ? currentState.currentUser : 
    (localStorage.getItem('fastinvo_auth_user') ? JSON.parse(localStorage.getItem('fastinvo_auth_user')!) : null);
  const teamMembers = (currentState as any)?.teamMembers ||
    (localStorage.getItem('fastinvo_team_members') ? JSON.parse(localStorage.getItem('fastinvo_team_members')!) : undefined);
  const workspaceConfig = (currentState as any)?.workspaceConfig ||
    (localStorage.getItem('fastinvo_workspace_config') ? JSON.parse(localStorage.getItem('fastinvo_workspace_config')!) : undefined);

  const backup: FastInvoDatabaseBackup = {
    version: 1,
    appName: 'FastInvo',
    exportedAt: new Date().toISOString(),
    summary: {
      invoicesCount: (invoices || []).length,
      clientsCount: (clients || []).length,
      savedItemsCount: (savedItems || []).length,
      companyName: profile?.companyName || 'My Business',
      currencyCode: profile?.currency?.code || 'USD',
    },
    data: {
      invoices: invoices || [],
      clients: clients || [],
      savedItems: savedItems || [],
      profile: profile || {} as BusinessProfile,
      tax: tax || {} as TaxConfig,
      draft,
      themeMode,
      twoFactorConfig,
      currentUser,
      teamMembers,
      workspaceConfig,
    }
  };

  return backup;
}

/**
 * Downloads a JavaScript object as a .json file directly in the browser
 */
export function downloadDatabaseJsonFile(backup: FastInvoDatabaseBackup, customFileName?: string): void {
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = customFileName || `fastinvo_database_backup_${dateStr}_${timeStr}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and extracts database backup payload from parsed JSON
 */
export function parseAndValidateBackupJson(rawJson: any): {
  isValid: boolean;
  error?: string;
  backupData?: FastInvoDatabaseBackup['data'];
  summary?: {
    invoicesCount: number;
    clientsCount: number;
    savedItemsCount: number;
    companyName?: string;
    currencyCode?: string;
    exportedAt?: string;
  };
} {
  if (!rawJson || typeof rawJson !== 'object') {
    return { isValid: false, error: 'File content is not a valid JSON object.' };
  }

  // Check if it's our standard format with { appName, data } or a direct object { invoices, clients, profile, tax }
  let dataObj: any = null;
  let exportedAt: string | undefined = undefined;

  if (rawJson.data && typeof rawJson.data === 'object') {
    dataObj = rawJson.data;
    exportedAt = rawJson.exportedAt;
  } else if (rawJson.invoices || rawJson.clients || rawJson.profile || rawJson.tax) {
    dataObj = rawJson;
    exportedAt = rawJson.exportedAt || rawJson.createdAt;
  } else {
    return {
      isValid: false,
      error: 'Invalid database backup structure: Missing invoices, clients, or settings.'
    };
  }

  const invoices = Array.isArray(dataObj.invoices) ? dataObj.invoices : [];
  const clients = Array.isArray(dataObj.clients) ? dataObj.clients : [];
  const savedItems = Array.isArray(dataObj.savedItems) ? dataObj.savedItems : [];
  const profile = dataObj.profile && typeof dataObj.profile === 'object' ? dataObj.profile : null;
  const tax = dataObj.tax && typeof dataObj.tax === 'object' ? dataObj.tax : null;

  return {
    isValid: true,
    backupData: {
      invoices,
      clients,
      savedItems,
      profile: profile || ({} as BusinessProfile),
      tax: tax || ({} as TaxConfig),
      draft: dataObj.draft,
      themeMode: dataObj.themeMode,
      twoFactorConfig: dataObj.twoFactorConfig,
      currentUser: dataObj.currentUser,
      teamMembers: Array.isArray(dataObj.teamMembers) ? dataObj.teamMembers : undefined,
      workspaceConfig: dataObj.workspaceConfig && typeof dataObj.workspaceConfig === 'object' ? dataObj.workspaceConfig : undefined,
      rawSettings: dataObj.rawSettings,
    },
    summary: {
      invoicesCount: invoices.length,
      clientsCount: clients.length,
      savedItemsCount: savedItems.length,
      companyName: profile?.companyName || 'Business Profile',
      currencyCode: profile?.currency?.code || profile?.currency?.symbol || 'USD',
      exportedAt,
    }
  };
}


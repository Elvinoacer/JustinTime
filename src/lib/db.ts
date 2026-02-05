import Dexie, { Table } from 'dexie';

export interface SyncItem {
  id?: number;
  actionName: string; // e.g., 'createExpense'
  payload: any;
  createdAt: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
}

export interface LocalExpense {
    id: string; // UUID
    amount: number;
    merchant?: string;
    category: string;
    date: Date;
    description?: string;
    status: string;
    syncStatus?: 'Synced' | 'Pending'; // UI Helper
}

export class JustinTimeDB extends Dexie {
  syncQueue!: Table<SyncItem>;
  expenses!: Table<LocalExpense>;

  constructor() {
    super('JustinTimeDB');
    this.version(1).stores({
      syncQueue: '++id, status, createdAt', // Indexed by status for fast lookup
      expenses: 'id, date, syncStatus' // Local cache
    });
  }
}

export const db = new JustinTimeDB();


export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  isBought: boolean;
  addedAt: number;
}

export interface PurchaseRecord {
  id: string;
  name: string;
  price?: number;
  date: number;
  category: string;
}

export interface Suggestion {
  name: string;
  confidence: number;
  reason: string;
  category: string;
}

export interface ParsedReceipt {
  items: Array<{
    name: string;
    price: number;
    quantity: string;
  }>;
  total: number;
  date?: string;
}

export enum ViewMode {
  LIST = 'list',
  HISTORY = 'history',
  PREDICTIONS = 'predictions',
  SCAN = 'scan'
}

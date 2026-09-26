export type Player = {
  id: string;
  name: string;
  email: string | null;
  guest: boolean;
  coins: number;
  opened: number;
  dailyAt: string | null;
  promoClaimed: boolean;
  createdAt: string;
};

export type InventoryEntry = {
  id: string;
  itemId: string;
  caseId: string;
  createdAt: string;
};

export type HistoryEntry = {
  id: string;
  type: string;
  title: string;
  itemId: string | null;
  amount: number;
  createdAt: string;
};

export type GameState = {
  user: Player;
  inventory: InventoryEntry[];
  history: HistoryEntry[];
};

export type GameResponse = GameState & {
  drops?: InventoryEntry[];
  won?: boolean;
  chance?: number;
  roll?: number;
  message?: string;
};

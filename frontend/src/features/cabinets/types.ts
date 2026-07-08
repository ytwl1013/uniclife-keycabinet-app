export type CabinetListItem = {
  id: string;
  name: string;
  location: string;
  floor: string;
  model: string;
  capacity: number;
  status: CabinetStatus;
  metrics: CabinetMetrics;
};

export type CabinetStatus = 'online' | 'offline' | 'maintenance';

export type CabinetMetrics = {
  available: number;
  checkedOut: number;
  overdue: number;
};

export type KeySlotStatus = 'available' | 'checkedOut' | 'overdue' | 'empty';

export type KeySlot = {
  number: number;
  status: KeySlotStatus;
  holder?: string;
};

export type CabinetDetail = CabinetListItem & {
  serialNumber: string;
  slots: KeySlot[];
};

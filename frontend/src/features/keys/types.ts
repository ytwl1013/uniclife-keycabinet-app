export type KeyListItem = {
  code: string;
  name: string;
  cabinetCode: string;
  slotCode: string;
  status: 'available' | 'borrowed' | 'lost' | 'disabled';
};

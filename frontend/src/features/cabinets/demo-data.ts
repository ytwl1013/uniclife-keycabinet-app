import { CabinetDetail, CabinetListItem, KeySlot } from './types';

export const demoCabinets: CabinetListItem[] = [
  {
    id: 'main-office',
    name: 'Main Office Cabinet',
    location: 'Headquarters',
    floor: '1st Floor',
    model: 'UC-3000',
    capacity: 60,
    status: 'online',
    metrics: { available: 48, checkedOut: 9, overdue: 3 },
  },
  {
    id: 'property-a',
    name: 'Property A Key Cabinet',
    location: 'Property A',
    floor: 'Building 1',
    model: 'UC-2000',
    capacity: 40,
    status: 'online',
    metrics: { available: 28, checkedOut: 7, overdue: 5 },
  },
  {
    id: 'garage',
    name: 'Garage Key Cabinet',
    location: 'Headquarters',
    floor: 'Basement',
    model: 'UC-1000',
    capacity: 20,
    status: 'offline',
    metrics: { available: 14, checkedOut: 4, overdue: 2 },
  },
];

export const demoSlots: KeySlot[] = Array.from({ length: 20 }, (_, index) => {
  const number = index + 1;
  const known: Record<number, Partial<KeySlot>> = {
    3: { status: 'checkedOut', holder: 'Emma' },
    5: { status: 'overdue' },
    7: { status: 'checkedOut', holder: 'David' },
    10: { status: 'empty' },
    12: { status: 'overdue' },
    15: { status: 'checkedOut', holder: 'Sarah' },
    18: { status: 'empty' },
  };

  return {
    number,
    status: 'available',
    ...known[number],
  };
});

export const mainCabinetDetail: CabinetDetail = {
  ...demoCabinets[0],
  serialNumber: 'MOC-00123',
  slots: demoSlots,
};

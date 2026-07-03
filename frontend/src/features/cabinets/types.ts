export type CabinetListItem = {
  code: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
};

export const en = {
  common: {
    brandName: 'UnicLife',
    appName: 'Key Cabinet',
    online: 'Online',
    offline: 'Offline',
    maintenance: 'Maintenance',
    demoDataOnly: 'Demo data only',
    locationFloor: '%{location} · %{floor}',
    cabinetMeta: '%{slots} key slots · %{overdue} overdue · %{status}',
    modelCapacity: 'Model: %{model} · Capacity: %{count} Keys',
  },
  navigation: {
    home: 'Home',
    cabinets: 'Cabinets',
    scan: 'Scan',
    activity: 'Activity',
    team: 'Team',
    actionModal: 'Action confirmation',
  },
  home: {
    searchPlaceholder: 'Search keys, cabinets, or slots',
    summaryCabinets: 'Cabinets',
    summaryAvailable: 'Available',
    summaryOverdue: 'Overdue',
    scanKey: 'Scan key',
    returnKey: 'Return',
    authorize: 'Authorize',
    audit: 'Audit',
  },
  cabinets: {
    title: 'Cabinets',
    searchPlaceholder: 'Search cabinets',
    scanToAdd: 'Scan to add',
    count: '%{count} cabinets',
    sortByName: 'Sort by: Name',
    securityTitle: 'Keep your cabinets secure',
    securityDescription: 'All cabinets are encrypted and activity is fully logged for your security.',
    available: 'Available',
    checkedOut: 'Checked Out',
    overdue: 'Overdue',
  },
  activity: {
    title: 'Activity',
    exportCsv: 'Export CSV',
    thisWeek: 'This Week',
    all: 'All',
    checkOut: 'Check-Out',
    return: 'Return',
    overdue: 'Overdue',
    admin: 'Admin',
  },
  scan: {
    title: 'Scan',
    description: 'Scan a cabinet or key QR code to identify it and start the correct workflow.',
  },
  team: {
    title: 'Team',
    description: 'Manage access groups, roles, and user authorization workflows.',
  },
  cabinetDetail: {
    all: 'All',
    available: 'Available',
    checkedOut: 'Checked Out',
    overdue: 'Overdue',
    empty: 'Empty',
    searchPlaceholder: 'Search keys by number or name',
    location: 'Location',
    capacity: 'Capacity',
    serialNumber: 'Serial Number',
    capacityValue: '%{count}\nKeys',
    slotsTitle: 'Key Slots (%{count})',
    viewMore: 'View more (%{range})',
  },
  modal: {
    title: 'Action confirmation',
    description: 'Confirm critical key cabinet actions here before they are submitted.',
    goHome: 'Go to home screen',
  },
  demo: {
    cabinets: {
      mainOffice: 'Main Office Cabinet',
      headquarters: 'Headquarters',
      firstFloor: '1st Floor',
      propertyAName: 'Property A Key Cabinet',
      propertyA: 'Property A',
      buildingOne: 'Building 1',
      garage: 'Garage Key Cabinet',
      basement: 'Basement',
    },
    activity: {
      today: 'Today',
      yesterday: 'Yesterday',
      mayTwelve: 'May 12',
      checkoutStorage: 'Emma checked out Storage Room Key',
      storageRoom: 'Storage Room',
      returnedMailbox: 'David returned Mailbox Key',
      mailbox: 'Mailbox',
      overdueBackDoor: 'Back Door Key marked overdue',
      overdueBackDoorDetail: 'Checked out by Michael · Due May 12, 5:00 PM',
      checkoutMeetingRoom: 'Sophia checked out Meeting Room Key',
      meetingRoom: 'Meeting Room',
      returnedParking: 'James returned Parking Gate Key',
      parking: 'Parking',
      updatedSettings: 'Admin updated Cabinet 2 settings',
      updatedSettingsDetail: 'Auto-lock enabled · Access restricted to 5 users',
      addedKey: 'Olivia added a new key',
      addedKeyDetail: 'Front Door Key · Front Office',
    },
  },
  errors: {
    sessionExpired: 'Your session has expired. Please sign in again.',
    forbidden: 'You do not have permission to perform this action.',
    requestFailed: 'The request failed.',
    network: 'Network error. Please try again later.',
  },
} as const;

type DeepWiden<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Record<string, unknown> ? DeepWiden<T[K]> : never;
};

type LeafPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? LeafPaths<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type TranslationSchema = DeepWiden<typeof en>;
export type TranslationKey = LeafPaths<TranslationSchema>;

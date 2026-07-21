import { TranslationSchema } from './en';

export const de = {
  common: {
    brandName: 'UnicLife', appName: 'Schlüsselschrank', online: 'Online', offline: 'Offline', maintenance: 'Wartung', demoDataOnly: 'Nur Demodaten',
    locationFloor: '%{location} · %{floor}', cabinetMeta: '%{slots} Schlüsselfächer · %{overdue} überfällig · %{status}', modelCapacity: 'Modell: %{model} · Kapazität: %{count} Schlüssel',
  },
  navigation: { home: 'Start', cabinets: 'Schränke', scan: 'Scannen', activity: 'Aktivitäten', team: 'Team', actionModal: 'Aktion bestätigen' },
  home: { searchPlaceholder: 'Schlüssel, Schränke oder Fächer suchen', summaryCabinets: 'Schränke', summaryAvailable: 'Verfügbar', summaryOverdue: 'Überfällig', scanKey: 'Schlüssel scannen', returnKey: 'Rückgabe', authorize: 'Autorisieren', audit: 'Prüfen' },
  cabinets: {
    title: 'Schränke', searchPlaceholder: 'Schränke suchen', scanToAdd: 'Scannen und hinzufügen', count: '%{count} Schränke', sortByName: 'Sortieren: Name',
    securityTitle: 'Schützen Sie Ihre Schränke', securityDescription: 'Alle Schränke sind verschlüsselt und sämtliche Aktivitäten werden zu Ihrer Sicherheit protokolliert.', available: 'Verfügbar', checkedOut: 'Ausgegeben', overdue: 'Überfällig',
  },
  activity: { title: 'Aktivitäten', exportCsv: 'CSV exportieren', thisWeek: 'Diese Woche', all: 'Alle', checkOut: 'Ausgabe', return: 'Rückgabe', overdue: 'Überfällig', admin: 'Admin' },
  scan: { title: 'Scannen', description: 'Scannen Sie den QR-Code eines Schranks oder Schlüssels, um ihn zu identifizieren und den passenden Ablauf zu starten.' },
  team: { title: 'Team', description: 'Verwalten Sie Zugriffsgruppen, Rollen und Benutzerberechtigungen.' },
  cabinetDetail: {
    all: 'Alle', available: 'Verfügbar', checkedOut: 'Ausgegeben', overdue: 'Überfällig', empty: 'Leer', searchPlaceholder: 'Schlüssel nach Nummer oder Name suchen', location: 'Standort', capacity: 'Kapazität', serialNumber: 'Seriennummer', capacityValue: '%{count}\nSchlüssel', slotsTitle: 'Schlüsselfächer (%{count})', viewMore: 'Mehr anzeigen (%{range})',
  },
  modal: { title: 'Aktion bestätigen', description: 'Bestätigen Sie hier kritische Schlüsselschrank-Aktionen, bevor sie gesendet werden.', goHome: 'Zur Startseite' },
  demo: {
    cabinets: { mainOffice: 'Schrank im Hauptbüro', headquarters: 'Hauptsitz', firstFloor: '1. Stock', propertyAName: 'Schlüsselschrank Objekt A', propertyA: 'Objekt A', buildingOne: 'Gebäude 1', garage: 'Garagen-Schlüsselschrank', basement: 'Untergeschoss' },
    activity: {
      today: 'Heute', yesterday: 'Gestern', mayTwelve: '12. Mai', checkoutStorage: 'Emma hat den Lagerraumschlüssel ausgegeben', storageRoom: 'Lagerraum', returnedMailbox: 'David hat den Briefkastenschlüssel zurückgegeben', mailbox: 'Briefkasten', overdueBackDoor: 'Hintertürschlüssel als überfällig markiert', overdueBackDoorDetail: 'Ausgegeben an Michael · Fällig am 12. Mai, 17:00 Uhr', checkoutMeetingRoom: 'Sophia hat den Besprechungsraumschlüssel ausgegeben', meetingRoom: 'Besprechungsraum', returnedParking: 'James hat den Parkplatzschlüssel zurückgegeben', parking: 'Parkplatz', updatedSettings: 'Admin hat die Einstellungen von Schrank 2 aktualisiert', updatedSettingsDetail: 'Automatische Sperre aktiviert · Zugriff auf 5 Benutzer beschränkt', addedKey: 'Olivia hat einen neuen Schlüssel hinzugefügt', addedKeyDetail: 'Haupteingangsschlüssel · Empfangsbüro',
    },
  },
  errors: { sessionExpired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.', forbidden: 'Sie sind für diese Aktion nicht berechtigt.', requestFailed: 'Die Anfrage ist fehlgeschlagen.', network: 'Netzwerkfehler. Bitte versuchen Sie es später erneut.' },
} satisfies TranslationSchema;

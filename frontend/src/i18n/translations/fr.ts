import { TranslationSchema } from './en';

export const fr = {
  common: {
    brandName: 'UnicLife', appName: 'Armoire à clés', online: 'En ligne', offline: 'Hors ligne', maintenance: 'Maintenance', demoDataOnly: 'Données de démonstration uniquement',
    locationFloor: '%{location} · %{floor}', cabinetMeta: '%{slots} emplacements · %{overdue} en retard · %{status}', modelCapacity: 'Modèle : %{model} · Capacité : %{count} clés',
  },
  navigation: { home: 'Accueil', cabinets: 'Armoires', scan: 'Scanner', activity: 'Activité', team: 'Équipe', actionModal: "Confirmation de l'action" },
  home: { searchPlaceholder: 'Rechercher des clés, armoires ou emplacements', summaryCabinets: 'Armoires', summaryAvailable: 'Disponibles', summaryOverdue: 'En retard', scanKey: 'Scanner une clé', returnKey: 'Restituer', authorize: 'Autoriser', audit: 'Auditer' },
  cabinets: {
    title: 'Armoires', searchPlaceholder: 'Rechercher des armoires', scanToAdd: 'Scanner pour ajouter', count: '%{count} armoires', sortByName: 'Trier par : Nom',
    securityTitle: 'Sécurisez vos armoires', securityDescription: 'Toutes les armoires sont chiffrées et chaque activité est journalisée pour votre sécurité.', available: 'Disponibles', checkedOut: 'Empruntées', overdue: 'En retard',
  },
  activity: { title: 'Activité', exportCsv: 'Exporter en CSV', thisWeek: 'Cette semaine', all: 'Tout', checkOut: 'Emprunt', return: 'Restitution', overdue: 'En retard', admin: 'Admin' },
  scan: { title: 'Scanner', description: "Scannez le code QR d'une armoire ou d'une clé pour l'identifier et lancer le bon processus." },
  team: { title: 'Équipe', description: "Gérez les groupes d'accès, les rôles et les autorisations des utilisateurs." },
  cabinetDetail: {
    all: 'Tout', available: 'Disponibles', checkedOut: 'Empruntées', overdue: 'En retard', empty: 'Vide', searchPlaceholder: 'Rechercher une clé par numéro ou nom', location: 'Emplacement', capacity: 'Capacité', serialNumber: 'Numéro de série', capacityValue: '%{count}\nclés', slotsTitle: 'Emplacements de clés (%{count})', viewMore: 'Afficher plus (%{range})',
  },
  modal: { title: "Confirmation de l'action", description: "Confirmez ici les opérations critiques avant de les envoyer.", goHome: "Retour à l'accueil" },
  demo: {
    cabinets: { mainOffice: 'Armoire du bureau principal', headquarters: 'Siège', firstFloor: '1er étage', propertyAName: 'Armoire du site A', propertyA: 'Site A', buildingOne: 'Bâtiment 1', garage: 'Armoire du garage', basement: 'Sous-sol' },
    activity: {
      today: "Aujourd'hui", yesterday: 'Hier', mayTwelve: '12 mai', checkoutStorage: "Emma a emprunté la clé de la réserve", storageRoom: 'Réserve', returnedMailbox: 'David a rendu la clé de la boîte aux lettres', mailbox: 'Boîte aux lettres', overdueBackDoor: 'La clé de la porte arrière est en retard', overdueBackDoorDetail: 'Empruntée par Michael · Échéance le 12 mai à 17:00', checkoutMeetingRoom: 'Sophia a emprunté la clé de la salle de réunion', meetingRoom: 'Salle de réunion', returnedParking: 'James a rendu la clé du portail du parking', parking: 'Parking', updatedSettings: "L'administrateur a mis à jour l'armoire 2", updatedSettingsDetail: "Verrouillage automatique activé · Accès limité à 5 utilisateurs", addedKey: 'Olivia a ajouté une nouvelle clé', addedKeyDetail: "Clé de l'entrée principale · Bureau d'accueil",
    },
  },
  errors: { sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.', forbidden: "Vous n'êtes pas autorisé à effectuer cette action.", requestFailed: 'La requête a échoué.', network: 'Erreur réseau. Veuillez réessayer plus tard.' },
} satisfies TranslationSchema;

import { TranslationSchema } from './en';

export const es = {
  common: {
    brandName: 'UnicLife', appName: 'Armario de llaves', online: 'En línea', offline: 'Sin conexión', maintenance: 'Mantenimiento', demoDataOnly: 'Solo datos de demostración',
    locationFloor: '%{location} · %{floor}', cabinetMeta: '%{slots} espacios · %{overdue} vencidas · %{status}', modelCapacity: 'Modelo: %{model} · Capacidad: %{count} llaves',
  },
  navigation: { home: 'Inicio', cabinets: 'Armarios', scan: 'Escanear', activity: 'Actividad', team: 'Equipo', actionModal: 'Confirmar acción' },
  home: { searchPlaceholder: 'Buscar llaves, armarios o espacios', summaryCabinets: 'Armarios', summaryAvailable: 'Disponibles', summaryOverdue: 'Vencidas', scanKey: 'Escanear llave', returnKey: 'Devolver', authorize: 'Autorizar', audit: 'Auditar' },
  cabinets: {
    title: 'Armarios', searchPlaceholder: 'Buscar armarios', scanToAdd: 'Escanear para añadir', count: '%{count} armarios', sortByName: 'Ordenar por: Nombre',
    securityTitle: 'Mantén seguros tus armarios', securityDescription: 'Todos los armarios están cifrados y cada actividad queda registrada para tu seguridad.', available: 'Disponibles', checkedOut: 'Prestadas', overdue: 'Vencidas',
  },
  activity: { title: 'Actividad', exportCsv: 'Exportar CSV', thisWeek: 'Esta semana', all: 'Todo', checkOut: 'Préstamo', return: 'Devolución', overdue: 'Vencida', admin: 'Admin' },
  scan: { title: 'Escanear', description: 'Escanea el código QR de un armario o una llave para identificarlo e iniciar el flujo correcto.' },
  team: { title: 'Equipo', description: 'Gestiona grupos de acceso, roles y flujos de autorización de usuarios.' },
  cabinetDetail: {
    all: 'Todo', available: 'Disponibles', checkedOut: 'Prestadas', overdue: 'Vencidas', empty: 'Vacío', searchPlaceholder: 'Buscar llaves por número o nombre', location: 'Ubicación', capacity: 'Capacidad', serialNumber: 'Número de serie', capacityValue: '%{count}\nllaves', slotsTitle: 'Espacios para llaves (%{count})', viewMore: 'Ver más (%{range})',
  },
  modal: { title: 'Confirmar acción', description: 'Confirma aquí las acciones críticas del armario antes de enviarlas.', goHome: 'Ir al inicio' },
  demo: {
    cabinets: { mainOffice: 'Armario de la oficina principal', headquarters: 'Sede central', firstFloor: '1.er piso', propertyAName: 'Armario de la propiedad A', propertyA: 'Propiedad A', buildingOne: 'Edificio 1', garage: 'Armario del garaje', basement: 'Sótano' },
    activity: {
      today: 'Hoy', yesterday: 'Ayer', mayTwelve: '12 de mayo', checkoutStorage: 'Emma retiró la llave del almacén', storageRoom: 'Almacén', returnedMailbox: 'David devolvió la llave del buzón', mailbox: 'Buzón', overdueBackDoor: 'La llave de la puerta trasera está vencida', overdueBackDoorDetail: 'Retirada por Michael · Vence el 12 de mayo a las 17:00', checkoutMeetingRoom: 'Sophia retiró la llave de la sala de reuniones', meetingRoom: 'Sala de reuniones', returnedParking: 'James devolvió la llave de la barrera del aparcamiento', parking: 'Aparcamiento', updatedSettings: 'El administrador actualizó el armario 2', updatedSettingsDetail: 'Bloqueo automático activado · Acceso limitado a 5 usuarios', addedKey: 'Olivia añadió una llave nueva', addedKeyDetail: 'Llave de la puerta principal · Oficina de recepción',
    },
  },
  errors: { sessionExpired: 'Tu sesión ha caducado. Inicia sesión de nuevo.', forbidden: 'No tienes permiso para realizar esta acción.', requestFailed: 'La solicitud ha fallado.', network: 'Error de red. Inténtalo de nuevo más tarde.' },
} satisfies TranslationSchema;

import { TranslationSchema } from './en';

export const pt = {
  common: {
    brandName: 'UnicLife', appName: 'Armário de chaves', online: 'Online', offline: 'Offline', maintenance: 'Em manutenção', demoDataOnly: 'Apenas dados de demonstração',
    locationFloor: '%{location} · %{floor}', cabinetMeta: '%{slots} espaços · %{overdue} atrasadas · %{status}', modelCapacity: 'Modelo: %{model} · Capacidade: %{count} chaves',
  },
  navigation: { home: 'Início', cabinets: 'Armários', scan: 'Digitalizar', activity: 'Atividade', team: 'Equipe', actionModal: 'Confirmar ação' },
  home: { searchPlaceholder: 'Buscar chaves, armários ou espaços', summaryCabinets: 'Armários', summaryAvailable: 'Disponíveis', summaryOverdue: 'Atrasadas', scanKey: 'Digitalizar chave', returnKey: 'Devolver', authorize: 'Autorizar', audit: 'Auditar' },
  cabinets: {
    title: 'Armários', searchPlaceholder: 'Buscar armários', scanToAdd: 'Digitalizar para adicionar', count: '%{count} armários', sortByName: 'Ordenar por: Nome',
    securityTitle: 'Mantenha seus armários seguros', securityDescription: 'Todos os armários são criptografados e cada atividade é registrada para sua segurança.', available: 'Disponíveis', checkedOut: 'Retiradas', overdue: 'Atrasadas',
  },
  activity: { title: 'Atividade', exportCsv: 'Exportar CSV', thisWeek: 'Esta semana', all: 'Tudo', checkOut: 'Retirada', return: 'Devolução', overdue: 'Atrasada', admin: 'Admin' },
  scan: { title: 'Digitalizar', description: 'Digitalize o código QR de um armário ou chave para identificá-lo e iniciar o fluxo correto.' },
  team: { title: 'Equipe', description: 'Gerencie grupos de acesso, funções e fluxos de autorização de usuários.' },
  cabinetDetail: {
    all: 'Tudo', available: 'Disponíveis', checkedOut: 'Retiradas', overdue: 'Atrasadas', empty: 'Vazio', searchPlaceholder: 'Buscar chaves por número ou nome', location: 'Local', capacity: 'Capacidade', serialNumber: 'Número de série', capacityValue: '%{count}\nchaves', slotsTitle: 'Espaços para chaves (%{count})', viewMore: 'Ver mais (%{range})',
  },
  modal: { title: 'Confirmar ação', description: 'Confirme aqui as ações críticas do armário antes de enviá-las.', goHome: 'Ir para o início' },
  demo: {
    cabinets: { mainOffice: 'Armário do escritório principal', headquarters: 'Sede', firstFloor: '1º andar', propertyAName: 'Armário da propriedade A', propertyA: 'Propriedade A', buildingOne: 'Edifício 1', garage: 'Armário da garagem', basement: 'Subsolo' },
    activity: {
      today: 'Hoje', yesterday: 'Ontem', mayTwelve: '12 de maio', checkoutStorage: 'Emma retirou a chave do depósito', storageRoom: 'Depósito', returnedMailbox: 'David devolveu a chave da caixa de correio', mailbox: 'Caixa de correio', overdueBackDoor: 'A chave da porta dos fundos está atrasada', overdueBackDoorDetail: 'Retirada por Michael · Vence em 12 de maio às 17:00', checkoutMeetingRoom: 'Sophia retirou a chave da sala de reunião', meetingRoom: 'Sala de reunião', returnedParking: 'James devolveu a chave do portão do estacionamento', parking: 'Estacionamento', updatedSettings: 'O administrador atualizou o armário 2', updatedSettingsDetail: 'Bloqueio automático ativado · Acesso limitado a 5 usuários', addedKey: 'Olivia adicionou uma nova chave', addedKeyDetail: 'Chave da entrada principal · Recepção',
    },
  },
  errors: { sessionExpired: 'Sua sessão expirou. Entre novamente.', forbidden: 'Você não tem permissão para realizar esta ação.', requestFailed: 'A solicitação falhou.', network: 'Erro de rede. Tente novamente mais tarde.' },
} satisfies TranslationSchema;

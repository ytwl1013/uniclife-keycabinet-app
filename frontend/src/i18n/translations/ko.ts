import { TranslationSchema } from './en';

export const ko = {
  common: {
    brandName: 'UnicLife', appName: '키 캐비닛', online: '온라인', offline: '오프라인', maintenance: '유지보수 중', demoDataOnly: '데모 데이터 전용',
    locationFloor: '%{location} · %{floor}', cabinetMeta: '키 슬롯 %{slots}개 · 연체 %{overdue}개 · %{status}', modelCapacity: '모델: %{model} · 용량: 키 %{count}개',
  },
  navigation: { home: '홈', cabinets: '캐비닛', scan: '스캔', activity: '활동', team: '팀', actionModal: '작업 확인' },
  home: { searchPlaceholder: '키, 캐비닛 또는 슬롯 검색', summaryCabinets: '캐비닛', summaryAvailable: '사용 가능', summaryOverdue: '연체', scanKey: '키 스캔', returnKey: '반납', authorize: '권한 부여', audit: '감사' },
  cabinets: {
    title: '캐비닛', searchPlaceholder: '캐비닛 검색', scanToAdd: '스캔하여 추가', count: '캐비닛 %{count}개', sortByName: '정렬: 이름',
    securityTitle: '캐비닛을 안전하게 보호하세요', securityDescription: '모든 캐비닛은 암호화되며 보안을 위해 모든 활동이 기록됩니다.', available: '사용 가능', checkedOut: '대여 중', overdue: '연체',
  },
  activity: { title: '활동', exportCsv: 'CSV 내보내기', thisWeek: '이번 주', all: '전체', checkOut: '대여', return: '반납', overdue: '연체', admin: '관리' },
  scan: { title: '스캔', description: '캐비닛 또는 키의 QR 코드를 스캔하여 식별하고 올바른 작업을 시작하세요.' },
  team: { title: '팀', description: '액세스 그룹, 역할 및 사용자 권한 부여 작업을 관리하세요.' },
  cabinetDetail: {
    all: '전체', available: '사용 가능', checkedOut: '대여 중', overdue: '연체', empty: '비어 있음', searchPlaceholder: '번호 또는 이름으로 키 검색', location: '위치', capacity: '용량', serialNumber: '일련번호', capacityValue: '%{count}\n개', slotsTitle: '키 슬롯(%{count})', viewMore: '더 보기(%{range})',
  },
  modal: { title: '작업 확인', description: '중요한 키 캐비닛 작업을 제출하기 전에 여기에서 확인하세요.', goHome: '홈으로 이동' },
  demo: {
    cabinets: { mainOffice: '본사 사무실 캐비닛', headquarters: '본사', firstFloor: '1층', propertyAName: 'A 시설 키 캐비닛', propertyA: 'A 시설', buildingOne: '1동', garage: '차고 키 캐비닛', basement: '지하층' },
    activity: {
      today: '오늘', yesterday: '어제', mayTwelve: '5월 12일', checkoutStorage: 'Emma가 창고 키를 대여했습니다', storageRoom: '창고', returnedMailbox: 'David가 우편함 키를 반납했습니다', mailbox: '우편함', overdueBackDoor: '뒷문 키가 연체로 표시되었습니다', overdueBackDoorDetail: '대여자: Michael · 기한: 5월 12일 오후 5:00', checkoutMeetingRoom: 'Sophia가 회의실 키를 대여했습니다', meetingRoom: '회의실', returnedParking: 'James가 주차 게이트 키를 반납했습니다', parking: '주차장', updatedSettings: '관리자가 캐비닛 2 설정을 업데이트했습니다', updatedSettingsDetail: '자동 잠금 활성화 · 사용자 5명으로 액세스 제한', addedKey: 'Olivia가 새 키를 추가했습니다', addedKeyDetail: '정문 키 · 프런트 오피스',
    },
  },
  errors: { sessionExpired: '세션이 만료되었습니다. 다시 로그인하세요.', forbidden: '이 작업을 수행할 권한이 없습니다.', requestFailed: '요청에 실패했습니다.', network: '네트워크 오류입니다. 나중에 다시 시도하세요.' },
} satisfies TranslationSchema;

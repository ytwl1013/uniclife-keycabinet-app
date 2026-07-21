import { TranslationSchema } from './en';

export const ja = {
  common: {
    brandName: 'UnicLife', appName: 'キ―キャビネット', online: 'オンライン', offline: 'オフライン', maintenance: 'メンテナンス中', demoDataOnly: 'デモデータのみ',
    locationFloor: '%{location} · %{floor}', cabinetMeta: 'キースロット %{slots} 個 · 期限超過 %{overdue} 件 · %{status}', modelCapacity: 'モデル：%{model} · 容量：キー %{count} 本',
  },
  navigation: { home: 'ホーム', cabinets: 'キャビネット', scan: 'スキャン', activity: 'アクティビティ', team: 'チーム', actionModal: '操作の確認' },
  home: { searchPlaceholder: 'キー、キャビネット、スロットを検索', summaryCabinets: 'キャビネット', summaryAvailable: '利用可能', summaryOverdue: '期限超過', scanKey: 'キーをスキャン', returnKey: '返却', authorize: '権限付与', audit: '監査' },
  cabinets: {
    title: 'キャビネット', searchPlaceholder: 'キャビネットを検索', scanToAdd: 'スキャンして追加', count: '%{count} 台のキャビネット', sortByName: '並び替え：名前',
    securityTitle: 'キャビネットを安全に保つ', securityDescription: 'すべてのキャビネットは暗号化され、操作履歴はセキュリティのため完全に記録されます。', available: '利用可能', checkedOut: '貸出中', overdue: '期限超過',
  },
  activity: { title: 'アクティビティ', exportCsv: 'CSV を出力', thisWeek: '今週', all: 'すべて', checkOut: '貸出', return: '返却', overdue: '期限超過', admin: '管理' },
  scan: { title: 'スキャン', description: 'キャビネットまたはキーの QR コードをスキャンして識別し、適切な操作を開始します。' },
  team: { title: 'チーム', description: 'アクセスグループ、ロール、ユーザー権限のワークフローを管理します。' },
  cabinetDetail: {
    all: 'すべて', available: '利用可能', checkedOut: '貸出中', overdue: '期限超過', empty: '空き', searchPlaceholder: '番号または名前でキーを検索', location: '場所', capacity: '容量', serialNumber: 'シリアル番号', capacityValue: '%{count}\n本', slotsTitle: 'キースロット（%{count}）', viewMore: 'さらに表示（%{range}）',
  },
  modal: { title: '操作の確認', description: '重要なキーキャビネット操作を送信する前に、ここで内容を確認してください。', goHome: 'ホームに戻る' },
  demo: {
    cabinets: { mainOffice: '本社オフィスキャビネット', headquarters: '本社', firstFloor: '1階', propertyAName: '物件 A キーキャビネット', propertyA: '物件 A', buildingOne: '1号棟', garage: 'ガレージキーキャビネット', basement: '地下' },
    activity: {
      today: '今日', yesterday: '昨日', mayTwelve: '5月12日', checkoutStorage: 'Emma が倉庫のキーを借り出しました', storageRoom: '倉庫', returnedMailbox: 'David がメールボックスのキーを返却しました', mailbox: 'メールボックス', overdueBackDoor: '裏口のキーが期限超過になりました', overdueBackDoorDetail: '貸出先：Michael · 期限：5月12日 17:00', checkoutMeetingRoom: 'Sophia が会議室のキーを借り出しました', meetingRoom: '会議室', returnedParking: 'James が駐車ゲートのキーを返却しました', parking: '駐車場', updatedSettings: '管理者がキャビネット 2 の設定を更新しました', updatedSettingsDetail: '自動ロック有効 · 5 ユーザーのみにアクセス制限', addedKey: 'Olivia が新しいキーを追加しました', addedKeyDetail: '正面玄関キー · フロントオフィス',
    },
  },
  errors: { sessionExpired: 'セッションの有効期限が切れました。再度サインインしてください。', forbidden: 'この操作を実行する権限がありません。', requestFailed: 'リクエストに失敗しました。', network: 'ネットワークエラーです。後でもう一度お試しください。' },
} satisfies TranslationSchema;

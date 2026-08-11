import { createTranslation } from './create';
import { zhCN } from './zh-cn';

export const zhTW = createTranslation({
  ...zhCN,
  navigation: { ...zhCN.navigation, home: '首頁', cabinets: '箱子', scan: '掃碼', activity: '活動', account: '帳戶', team: '帳戶' },
  home: { ...zhCN.home, greeting: '你好，%{name}', scanTitle: '掃描箱子', scanDescription: '直接開啟相機並連接支援的箱子', contactSupport: '聯絡客服', userGuide: '使用說明', cabinetsTitle: '你的箱子', quickActionsTitle: '快速操作', loanNoDue: '%{cabinet} · 暫無預計歸還時間', supportUnavailableTitle: '客服服務升級中', supportUnavailableDescription: '請稍後再試。', guideBack: '上一步', guideNext: '下一步', guideDone: '完成', guideSkip: '略過' },
  cabinet: { ...zhCN.cabinet, searchPlaceholder: '依名稱、位置或 SKU 搜尋', membersTitle: '已綁定管理員', renameTitle: '箱子名稱', renameDescription: '修改所有管理員看到的箱子名稱。', renameAction: '修改名稱', clearKeysAction: '刪除所有鑰匙資訊', clearSectionDescription: '永久刪除所有鑰匙資訊；箱體、借出歷史和不可變稽核記錄會保留。', deleteAllConfirmTitle: '永久刪除所有鑰匙資訊？', deleteAllConfirmDescription: '將永久刪除 %{count} 筆鑰匙資訊。箱體、借出歷史和不可變稽核記錄會保留，且無法復原。', deleteAllCountdown: '%{seconds} 秒後可刪除', deleteAllConfirm: '永久刪除' },
  key: { ...zhCN.key, gridTitle: '鑰匙槽位', searchPlaceholder: '依鑰匙名稱或槽位搜尋', detailsTitle: '鑰匙詳情', nameLabel: '鑰匙名稱', noteLabel: '備註', saveChanges: '儲存修改', deleteAction: '刪除鑰匙資訊', deleteBlockedTitle: '鑰匙正在借出', deleteBlockedDescription: '請先歸還鑰匙再刪除。', deleteTitle: '刪除此鑰匙資訊？', deleteDescription: '將永久刪除「%{key}」的資訊，借出歷史和稽核記錄仍會保留。', deleteConfirm: '永久刪除' },
  loan: { ...zhCN.loan, checkOutAction: '借出鑰匙', returnAction: '歸還鑰匙', borrowerName: '借用人姓名', checkedOutAt: '借出時間', expectedReturnAt: '預計歸還時間', noExpectedReturn: '暫無預計歸還時間', noExpectedReturnOption: '暫無預計歸還時間', confirmCheckout: '確認借出' },
  activity: { ...zhCN.activity, title: '活動', subtitle: '搜尋和篩選不可變的箱子事件', filtersTitle: '篩選', operatorFilter: '操作人', timeFilter: '時間範圍', filter: { ...zhCN.activity.filter, keyUpdated: '鑰匙更新' } },
  scan: { ...zhCN.scan, title: '掃描產品 QR Code', description: '掃描箱子 QR Code 並確認產品。', requestPermission: '允許使用相機', deviceUuid: '箱體 UUID', unboundDevice: '新箱體 · 尚未綁定', cabinetName: '箱子名稱', cabinetNamePlaceholder: '輸入箱子名稱', modeOwner: '初始化為管理員', modeMember: '以管理員身分加入', bindAction: '綁定箱子' },
  auth: { ...zhCN.auth, fields: { ...zhCN.auth.fields, adminName: '管理員姓名', adminNamePlaceholder: '請輸入真實姓名', email: '電子郵件', password: '密碼', confirmPassword: '確認密碼' }, validation: { ...zhCN.auth.validation, adminName: '必須填寫管理員姓名。' }, signUp: { ...zhCN.auth.signUp, title: '建立帳戶', description: '填寫管理員姓名和工作信箱。', submit: '建立帳戶' } },
  onboarding: { ...zhCN.onboarding, title: '設定工作區', initializeTitle: '初始化新箱子', initializeDescription: '掃描新箱子並成為管理員。', joinTitle: '加入現有箱子', joinDescription: '確認產品並以管理員身分加入。' },
  account: { ...zhCN.account, title: '帳戶', subtitle: '個人資料、語言與安全', profileTitle: '個人資料', languageTitle: '語言與地區', systemLanguage: '跟隨系統', securityTitle: '安全', deleteAccount: '刪除帳戶', deleteTitle: '刪除帳戶？', deleteDescription: '帳戶將被停用，並移除其所有箱子管理員權限；其他管理員仍可存取。', deleteConfirm: '刪除帳戶' },
});

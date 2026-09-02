import type { FeedbackDeliveryStatus, FeedbackThreadSummary, FeedbackType } from '@uniclife/shared';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useApp } from '@/app-state';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText, type AppTextTone } from '@/components/ui/app-text';
import {
  AuthErrorNotice,
  AuthSecondaryButton,
} from '@/features/auth/components/auth-ui';
import {
  AccountLoading,
  AccountPage,
  FeedbackBanner,
} from '@/features/account/components/account-ui';
import { useTranslation } from '@/i18n';
import { useAppTheme } from '@/styles/theme';

const statusTone: Record<FeedbackDeliveryStatus, AppTextTone> = {
  failed: 'danger',
  sending: 'warning',
  sent: 'success',
};

const statusBackground: Record<FeedbackDeliveryStatus, string> = {
  failed: 'bg-danger-soft',
  sending: 'bg-warning-soft',
  sent: 'bg-success-soft',
};

function typeKey(type: FeedbackType): 'support.typeApplication' | 'support.typeProduct' {
  return type === 'product' ? 'support.typeProduct' : 'support.typeApplication';
}

function statusKey(
  status: FeedbackDeliveryStatus,
): 'support.historyStatusFailed' | 'support.historyStatusSending' | 'support.historyStatusSent' {
  if (status === 'failed') return 'support.historyStatusFailed';
  if (status === 'sending') return 'support.historyStatusSending';
  return 'support.historyStatusSent';
}

export function FeedbackHistoryScreen() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const { palette } = useAppTheme();
  const { actions, currentUser, state } = useApp();
  const [items, setItems] = useState<FeedbackThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  const load = useCallback(async (refresh = false) => {
    if (state.sessionStatus !== 'authenticated') return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setItems(await actions.listFeedbackHistory());
    } catch {
      setError(t('support.historyLoadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actions, state.sessionStatus, t]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.replace('/(auth)/sign-in')}
        title={t('support.historyTitle')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  return (
    <AccountPage
      backLabel={t('support.back')}
      description={t('support.historyDescription')}
      onBack={() => router.back()}
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      title={t('support.historyTitle')}>
      {error ? (
        <View className="gap-3">
          <FeedbackBanner message={error} tone="danger" />
          <AuthSecondaryButton
            icon="history"
            label={t('common.retry')}
            onPress={() => void load()}
          />
        </View>
      ) : null}

      {loading ? (
        <View className="items-center gap-3 rounded-card border border-line bg-surface p-8 shadow-card">
          <ActivityIndicator color={palette.brand} />
          <AppText variant="caption" tone="muted">
            {t('support.historyLoading')}
          </AppText>
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <View className="items-center gap-3 rounded-card border border-line bg-surface p-8 shadow-card">
          <View className="h-12 w-12 items-center justify-center rounded-pill bg-brand-soft">
            <AppIcon name="history" size={24} tone="brand" />
          </View>
          <AppText variant="title" tone="foreground">
            {t('support.historyEmptyTitle')}
          </AppText>
          <AppText className="text-center" variant="caption" tone="muted">
            {t('support.historyEmptyDescription')}
          </AppText>
        </View>
      ) : null}

      {!loading && !error
        ? items.map((item) => (
            <Pressable
              accessibilityRole="button"
              className="gap-4 rounded-card border border-line bg-surface p-card shadow-card"
              key={item.id}
              onPress={() => router.push(`/(details)/account/feedback/${item.id}` as Href)}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1">
                  <AppText variant="caption" tone="brand">
                    {t(typeKey(item.type))}
                  </AppText>
                  <AppText selectable variant="title" tone="foreground">
                    {item.title || t('support.historyUntitled')}
                  </AppText>
                </View>
                <View className={`rounded-pill px-2.5 py-1 ${statusBackground[item.status]}`}>
                  <AppText variant="caption" tone={statusTone[item.status]}>
                    {t(statusKey(item.status))}
                  </AppText>
                </View>
              </View>

              <AppText selectable tone="content">
                {item.lastMessagePreview}
              </AppText>

              <View className="flex-row items-center justify-between gap-3 rounded-control bg-background px-3 py-2.5">
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <AppIcon name="support" size={17} tone="brand" />
                  <AppText numberOfLines={1} variant="caption" tone="brand">
                    {t('support.historyOpen')}
                  </AppText>
                  {item.unreadMessageCount > 0 ? (
                    <View className="rounded-pill bg-danger-soft px-2 py-0.5">
                      <AppText variant="caption" tone="danger">
                        {t('support.historyUnread', { count: item.unreadMessageCount })}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppIcon name="chevronRight" size={17} tone="muted" />
              </View>

              <View className="gap-1 border-t border-line pt-3">
                <AppText selectable variant="caption" tone="muted">
                  {t('support.historySubmittedAt', {
                    date: formatter.format(new Date(item.submittedAt)),
                  })}
                </AppText>
                <AppText selectable variant="caption" tone="muted">
                  {t('support.historyReference', { id: item.id })}
                </AppText>
                <AppText selectable variant="caption" tone="muted">
                  {t('support.historyImages', { count: item.imageCount })}
                </AppText>
                <AppText selectable variant="caption" tone="muted">
                  {t('support.historyAccount', {
                    email: item.userEmail,
                    name: item.userDisplayName,
                  })}
                </AppText>
              </View>
            </Pressable>
          ))
        : null}
    </AccountPage>
  );
}

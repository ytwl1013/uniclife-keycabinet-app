import type { FeedbackConversationStatus, FeedbackThread } from '@uniclife/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, View } from 'react-native';

import { isApiError } from '@/api/client';
import { useApp } from '@/app-state';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import {
  AccountLoading,
  AccountPage,
  FeedbackBanner,
} from '@/features/account/components/account-ui';
import {
  AuthField,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '@/features/auth/components/auth-ui';
import { useTranslation } from '@/i18n';
import { useAppTheme } from '@/styles/theme';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

const statusTone: Record<FeedbackConversationStatus, 'warning' | 'brand' | 'muted'> = {
  waiting_for_support: 'warning',
  waiting_for_user: 'brand',
  resolved: 'muted',
};

const statusBackground: Record<FeedbackConversationStatus, string> = {
  waiting_for_support: 'bg-warning-soft',
  waiting_for_user: 'bg-brand-soft',
  resolved: 'bg-background',
};

export function FeedbackConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ feedbackId?: string | string[] }>();
  const feedbackId = firstParam(params.feedbackId);
  const { actions, currentUser, state } = useApp();
  const { formatDateTime, t } = useTranslation();
  const { palette } = useAppTheme();
  const [thread, setThread] = useState<FeedbackThread | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const statusLabel = useMemo(() => ({
    waiting_for_support: t('support.waitingForSupport'),
    waiting_for_user: t('support.waitingForUser'),
    resolved: t('support.resolved'),
  }), [t]);

  const load = useCallback(async (refresh = false) => {
    if (!feedbackId || state.sessionStatus !== 'authenticated') {
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      await actions.markFeedbackThreadRead({ feedbackId }).catch(() => undefined);
      setThread(await actions.getFeedbackThread({ feedbackId }));
    } catch (caught) {
      setThread(null);
      setError(
        isApiError(caught) && caught.code === 'FEEDBACK_NOT_FOUND'
          ? t('support.conversationNotFound')
          : t('support.conversationLoadFailed'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actions, feedbackId, state.sessionStatus, t]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  if (!state.hydrated) return <AccountLoading label={t('common.loading')} />;
  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.replace('/(auth)/sign-in')}
        title={t('support.historyTitle')}>
        <FeedbackBanner message={t('auth.errors.sessionExpired')} tone="danger" />
      </AccountPage>
    );
  }

  const submit = async () => {
    const normalized = content.trim();
    if (!normalized) {
      setError(t('support.replyRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const updated = await actions.replyToFeedback({ content: normalized, feedbackId });
      setThread(updated);
      setContent('');
      setSuccess(t('support.replySent'));
    } catch {
      setError(t('support.replyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
      keyboardVerticalOffset={8}>
      <AccountPage
        backLabel={t('support.back')}
        description={t('support.conversationDescription')}
        onBack={() => router.back()}
        onRefresh={() => void load(true)}
        refreshing={refreshing}
        title={thread?.title || t('support.historyUntitled')}>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}
        {success ? <FeedbackBanner message={success} tone="success" /> : null}
        {!state.online ? <FeedbackBanner message={t('auth.errors.offline')} tone="warning" /> : null}

        {loading ? (
          <View className="items-center gap-3 rounded-card border border-line bg-surface p-8 shadow-card">
            <ActivityIndicator color={palette.brand} />
            <AppText variant="caption" tone="muted">{t('support.conversationLoading')}</AppText>
          </View>
        ) : null}

        {!loading && !thread && error ? (
          <AuthSecondaryButton icon="history" label={t('common.retry')} onPress={() => void load()} />
        ) : null}

        {thread ? (
          <>
            <View className="flex-row flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface px-4 py-3">
              <View className="min-w-0 flex-1 gap-1">
                <AppText variant="caption" tone="muted">{t('support.historyReference', { id: thread.id })}</AppText>
                <AppText variant="caption" tone="muted">{t('support.historySubmittedAt', { date: formatDateTime(thread.submittedAt) })}</AppText>
              </View>
              <View className={`rounded-pill px-3 py-1.5 ${statusBackground[thread.conversationStatus]}`}>
                <AppText variant="caption" tone={statusTone[thread.conversationStatus]}>
                  {statusLabel[thread.conversationStatus]}
                </AppText>
              </View>
            </View>

            <View className="gap-4">
              {thread.messages.map((message) => {
                const support = message.sender === 'support';
                return (
                  <View className={`flex-row ${support ? 'justify-start' : 'justify-end'}`} key={message.id}>
                    <View className={`max-w-[86%] gap-2 rounded-card border p-card ${support ? 'border-line bg-surface' : 'border-brand bg-brand-soft'}`}>
                      <View className="flex-row items-center gap-2">
                        <View className={`h-8 w-8 items-center justify-center rounded-pill ${support ? 'bg-brand-soft' : 'bg-surface'}`}>
                          <AppIcon name={support ? 'support' : 'person'} size={16} tone="brand" />
                        </View>
                        <View className="min-w-0 flex-1">
                          <AppText numberOfLines={1} variant="caption" tone="foreground">
                            {support ? t('support.senderSupport') : t('support.senderYou')}
                          </AppText>
                          <AppText variant="caption" tone="muted">{formatDateTime(message.createdAt)}</AppText>
                        </View>
                      </View>
                      <AppText selectable tone="content">{message.content}</AppText>
                      {message.imageCount > 0 ? (
                        <AppText variant="caption" tone="muted">
                          {t('support.historyImages', { count: message.imageCount })}
                        </AppText>
                      ) : null}
                      {message.status === 'failed' ? (
                        <AppText variant="caption" tone="warning">{t('support.emailDeliveryFailed')}</AppText>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="gap-4 rounded-card border border-line bg-surface p-card shadow-card">
              <AuthField
                className="min-h-32"
                editable={!submitting && state.online}
                label={t('support.replyPlaceholder')}
                maxLength={5000}
                multiline
                onChangeText={(value) => {
                  setContent(value);
                  setError('');
                  setSuccess('');
                }}
                placeholder={t('support.replyPlaceholder')}
                textAlignVertical="top"
                value={content}
              />
              <AppText className="-mt-3 self-end" variant="caption" tone="muted">
                {t('support.contentCount', { count: content.length })}
              </AppText>
              <AuthPrimaryButton
                busy={submitting}
                busyLabel={t('support.replying')}
                disabled={!state.online || !content.trim()}
                label={t('support.replySend')}
                onPress={() => void submit()}
              />
            </View>
          </>
        ) : null}
      </AccountPage>
    </KeyboardAvoidingView>
  );
}

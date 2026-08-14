import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { useTranslation } from '@/i18n';
import { useAppTheme } from '@/styles/theme';

type ChatMessage = {
  id: string;
  body: string;
  sender: 'support' | 'user';
  sentAt: Date;
};

export function SupportChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale, t } = useTranslation();
  const { palette } = useAppTheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', body: t('support.welcomeMessage'), sender: 'support', sentAt: new Date() },
  ]);
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    [locale],
  );

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, body, sender: 'user', sentAt: new Date() },
    ]);
    setDraft('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={8}>
        <View className="border-b border-line bg-background">
          <View className="mx-auto w-full max-w-content px-screen py-3">
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityLabel={t('support.back')}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface active:opacity-70"
                onPress={() => router.back()}>
                <AppIcon name="back" size={22} tone="foreground" />
              </Pressable>
              <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-soft">
                <AppIcon name="support" size={22} tone="brand" />
              </View>
              <View className="min-w-0 flex-1">
                <AppText numberOfLines={1} variant="title" tone="foreground">{t('support.title')}</AppText>
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-pill bg-success" />
                  <AppText numberOfLines={1} variant="caption" tone="muted">{t('support.onlineStatus')}</AppText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="mx-auto min-w-0 w-full max-w-content flex-1">
          <FlatList
            ref={listRef}
            automaticallyAdjustKeyboardInsets
            className="min-w-0 flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 20, rowGap: 14 }}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View className={`max-w-[82%] gap-1 ${item.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                <View className={`rounded-[20px] px-4 py-3 ${item.sender === 'user' ? 'rounded-br-[6px] bg-brand' : 'rounded-bl-[6px] border border-line bg-surface'}`}>
                  <AppText tone={item.sender === 'user' ? 'onBrand' : 'content'}>{item.body}</AppText>
                </View>
                <AppText className="px-1" variant="caption" tone="muted">{timeFormatter.format(item.sentAt)}</AppText>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View className="border-t border-line bg-surface px-screen pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <View className="mx-auto w-full max-w-content flex-row items-end gap-2">
            <TextInput
              accessibilityLabel={t('support.inputLabel')}
              className="max-h-28 min-h-12 flex-1 rounded-[22px] border border-line bg-background px-4 py-3 text-body text-content focus:border-brand"
              multiline
              onChangeText={setDraft}
              onSubmitEditing={send}
              placeholder={t('support.inputPlaceholder')}
              placeholderTextColor={palette.muted}
              returnKeyType="send"
              value={draft}
            />
            <Pressable
              accessibilityLabel={t('support.send')}
              accessibilityRole="button"
              accessibilityState={{ disabled: !draft.trim() }}
              className={`h-12 w-12 items-center justify-center rounded-pill bg-brand active:opacity-75 ${draft.trim() ? '' : 'opacity-40'}`}
              disabled={!draft.trim()}
              onPress={send}>
              <AppIcon name="send" size={21} tone="onBrand" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

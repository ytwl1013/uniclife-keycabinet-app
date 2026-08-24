import { Image } from 'expo-image';
import {
  manipulateAsync,
  SaveFormat,
  type Action as ImageManipulatorAction,
} from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  feedbackImageMaxBase64Length,
  feedbackMaxImages,
  type FeedbackImage,
  type FeedbackType,
} from '@uniclife/shared';
import { useRouter } from 'expo-router';
import { useToast } from 'heroui-native/toast';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, View } from 'react-native';

import { useApp } from '@/app-state';
import { isApiError } from '@/api/client';
import { AppIcon } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import {
  AuthErrorNotice,
  AuthField,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '@/features/auth/components/auth-ui';
import { useTranslation } from '@/i18n';
import {
  AccountLoading,
  AccountPage,
  ChoiceChip,
} from '@/features/account/components/account-ui';

type PreparedFeedbackImage = FeedbackImage & {
  id: string;
  uri: string;
};

const primaryImageDimension = 1600;
const fallbackImageDimension = 1200;

function resizeActions(
  width: number,
  height: number,
  maxDimension: number,
): ImageManipulatorAction[] {
  if (Math.max(width, height) <= maxDimension) return [];
  return width >= height
    ? [{ resize: { width: maxDimension } }]
    : [{ resize: { height: maxDimension } }];
}

async function compressImage(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
): Promise<PreparedFeedbackImage> {
  let result = await manipulateAsync(
    asset.uri,
    resizeActions(asset.width, asset.height, primaryImageDimension),
    { base64: true, compress: 0.65, format: SaveFormat.JPEG },
  );

  if ((result.base64?.length ?? 0) > feedbackImageMaxBase64Length) {
    result = await manipulateAsync(
      result.uri,
      resizeActions(result.width, result.height, fallbackImageDimension),
      { base64: true, compress: 0.42, format: SaveFormat.JPEG },
    );
  }

  if (!result.base64 || result.base64.length > feedbackImageMaxBase64Length) {
    throw new Error('FEEDBACK_IMAGE_TOO_LARGE');
  }

  const id = `${Date.now()}-${index}`;
  return {
    data: result.base64,
    fileName: `feedback-${id}.jpg`,
    id,
    mimeType: 'image/jpeg',
    uri: result.uri,
  };
}

function attachmentSizeLabel(base64: string): string {
  const kilobytes = Math.max(1, Math.round((base64.length * 0.75) / 1024));
  return `${kilobytes} KB`;
}

export function FeedbackFormScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { actions, currentUser, state } = useApp();
  const [salutation, setSalutation] = useState(currentUser?.displayName ?? '');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('application');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<PreparedFeedbackImage[]>([]);
  const [preparingImages, setPreparingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!state.hydrated) {
    return <AccountLoading label={t('common.loading')} />;
  }

  if (!currentUser || state.sessionStatus !== 'authenticated') {
    return (
      <AccountPage
        backLabel={t('auth.common.back')}
        description={t('auth.errors.sessionExpired')}
        onBack={() => router.replace('/(auth)/sign-in')}
        title={t('support.title')}>
        <AuthErrorNotice text={t('auth.errors.sessionExpired')} />
        <AuthSecondaryButton
          icon="person"
          label={t('auth.welcome.signIn')}
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </AccountPage>
    );
  }

  const chooseImages = async () => {
    const remaining = feedbackMaxImages - images.length;
    if (remaining <= 0) {
      setError(t('support.imageLimit'));
      return;
    }

    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t('support.photoPermissionDenied'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        orderedSelection: true,
        quality: 0.8,
        selectionLimit: remaining,
      });
      if (result.canceled) return;

      setPreparingImages(true);
      const selected = result.assets.slice(0, remaining);
      const prepared: PreparedFeedbackImage[] = [];
      for (const [index, asset] of selected.entries()) {
        prepared.push(await compressImage(asset, images.length + index));
      }
      setImages((current) => [...current, ...prepared].slice(0, feedbackMaxImages));
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'FEEDBACK_IMAGE_TOO_LARGE'
          ? t('support.imageTooLarge')
          : t('support.imageProcessFailed'),
      );
    } finally {
      setPreparingImages(false);
    }
  };

  const submit = async () => {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      setError(t('support.contentRequired'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await actions.submitFeedback({
        content: normalizedContent,
        images: images.map(({ data, fileName, mimeType }) => ({ data, fileName, mimeType })),
        salutation: salutation.trim(),
        title: title.trim(),
        type: feedbackType,
      });
      setTitle('');
      setContent('');
      setImages([]);
      toast.show({
        duration: 4000,
        id: `feedback-sent-${result.submissionId}`,
        label: t('support.sentSuccess', { submissionId: result.submissionId }),
        placement: 'top',
        variant: 'success',
      });
    } catch (caught) {
      let message: string;
      if (isApiError(caught) && caught.code === 'FEEDBACK_UNAVAILABLE') {
        message = t('support.unavailable');
      } else if (isApiError(caught) && caught.code === 'FEEDBACK_SEND_FAILED') {
        message = t('support.sendFailed');
      } else if (isApiError(caught) && caught.code === 'OFFLINE') {
        message = t('auth.errors.offline');
      } else {
        message = t('support.sendFailed');
      }
      toast.show({
        duration: 4000,
        id: 'feedback-send-error',
        label: message,
        placement: 'top',
        variant: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || preparingImages || !state.online;

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
      keyboardVerticalOffset={8}>
      <AccountPage
        backLabel={t('support.back')}
        description={t('support.description')}
        onBack={() => router.back()}
        title={t('support.title')}>
        {error ? <AuthErrorNotice text={error} /> : null}
        {!state.online ? <AuthErrorNotice text={t('auth.errors.offline')} /> : null}

        <View className="gap-5 rounded-card border border-line bg-surface p-card shadow-card">
          <AuthField
            autoCapitalize="words"
            label={t('support.salutation')}
            maxLength={128}
            onChangeText={(value) => {
              setSalutation(value);
            }}
            placeholder={t('support.salutationPlaceholder')}
            value={salutation}
          />

          <View className="gap-2" accessibilityRole="radiogroup">
            <AppText variant="label" tone="foreground">
              {t('support.feedbackType')}
            </AppText>
            <View className="gap-2">
              <ChoiceChip
                label={t('support.typeApplication')}
                onPress={() => {
                  setFeedbackType('application');
                }}
                selected={feedbackType === 'application'}
              />
              <ChoiceChip
                label={t('support.typeProduct')}
                onPress={() => {
                  setFeedbackType('product');
                }}
                selected={feedbackType === 'product'}
              />
            </View>
          </View>

          <AuthField
            label={t('support.feedbackTitle')}
            maxLength={200}
            onChangeText={(value) => {
              setTitle(value);
            }}
            placeholder={t('support.titlePlaceholder')}
            value={title}
          />

          <AuthField
            className="min-h-36"
            label={t('support.content')}
            maxLength={5000}
            multiline
            onChangeText={(value) => {
              setContent(value);
              setError('');
            }}
            placeholder={t('support.contentPlaceholder')}
            textAlignVertical="top"
            value={content}
          />
          <AppText className="-mt-4 self-end" variant="caption" tone="muted">
            {t('support.contentCount', { count: content.length })}
          </AppText>
        </View>

        <View className="gap-4 rounded-card border border-line bg-surface p-card shadow-card">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <AppText variant="label" tone="foreground">
                {t('support.images')}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('support.imageHint', { count: feedbackMaxImages })}
              </AppText>
            </View>
            <AppText selectable variant="caption" tone="muted">
              {images.length}/{feedbackMaxImages}
            </AppText>
          </View>

          {images.length ? (
            <View className="flex-row flex-wrap gap-3">
              {images.map((image, index) => (
                <View
                  className="w-[47%] min-w-32 gap-2 overflow-hidden rounded-control border border-line bg-background p-2"
                  key={image.id}>
                  <Image
                    accessibilityLabel={t('support.imagePreview', { index: index + 1 })}
                    contentFit="cover"
                    source={{ uri: image.uri }}
                    style={{ aspectRatio: 1.35, borderRadius: 12, width: '100%' }}
                    transition={120}
                  />
                  <View className="flex-row items-center justify-between gap-2">
                    <AppText numberOfLines={1} variant="caption" tone="muted">
                      {attachmentSizeLabel(image.data)}
                    </AppText>
                    <Pressable
                      accessibilityLabel={t('support.removeImage', { index: index + 1 })}
                      accessibilityRole="button"
                      className="min-h-9 flex-row items-center gap-1 rounded-control px-2 active:opacity-60"
                      onPress={() => {
                        setImages((current) => current.filter((item) => item.id !== image.id));
                      }}>
                      <AppIcon name="error" size={16} tone="danger" />
                      <AppText variant="caption" tone="danger">
                        {t('support.remove')}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <AuthSecondaryButton
            icon="download"
            label={preparingImages ? t('support.compressingImages') : t('support.addImages')}
            onPress={() => {
              if (!preparingImages) void chooseImages();
            }}
          />
        </View>

        <View className="gap-3 pb-2">
          <AuthPrimaryButton
            busy={submitting}
            busyLabel={t('support.sending')}
            disabled={disabled}
            label={t('support.submit')}
            onPress={() => void submit()}
          />
          <AppText className="text-center" variant="caption" tone="muted">
            {t('support.identityNotice', { email: currentUser.email })}
          </AppText>
        </View>
      </AccountPage>
    </KeyboardAvoidingView>
  );
}

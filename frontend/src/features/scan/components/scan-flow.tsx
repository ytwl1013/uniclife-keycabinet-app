import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';

import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { ProductImage } from '@/components/ui/product-image';
import {
  ActionButton,
  Notice,
  ScreenHeader,
  SectionCard,
  StatePanel,
} from '@/features/cabinet-prototype/components/prototype-ui';
import { useTranslation } from '@/i18n';
import {
  BindCabinetResult,
  isMockAppError,
  QrResolution,
  useMockApp,
} from '@/mocks';

export type ScanMode = 'initialize' | 'join';

type ScanErrorKind = 'invalid' | 'offline' | 'session' | 'generic';

function ProductDatum({
  className = '',
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <View
      className={`min-w-0 gap-1 rounded-control bg-background px-controlX py-controlY ${className}`}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText numberOfLines={2} variant="label" tone="foreground">
        {value}
      </AppText>
    </View>
  );
}

function ScannerPreview({
  active,
  onCode,
  onMountError,
}: {
  active: boolean;
  onCode: (code: string) => void;
  onMountError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);

  return (
    <View className="aspect-[4/5] w-full overflow-hidden rounded-card border border-line bg-foreground shadow-card">
      <CameraView
        active={active}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        facing="back"
        onBarcodeScanned={active ? ({ data }) => onCode(data) : undefined}
        onCameraReady={() => setReady(true)}
        onMountError={({ message }) => onMountError(message)}
        style={StyleSheet.absoluteFill}
        testID="product-qr-camera"
      />

      <View
        accessibilityElementsHidden
        className="absolute inset-0 items-center justify-center bg-foreground/25 px-screen"
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none">
        <View className="aspect-square w-3/4 rounded-card border-2 border-on-brand" />
        <View className="absolute inset-x-screen bottom-screen items-center gap-1 rounded-control bg-foreground/70 px-controlX py-controlY">
          <AppText className="text-center" variant="label" tone="onBrand">
            {t('scan.alignCode')}
          </AppText>
          <AppText className="text-center" variant="caption" tone="onBrand">
            {ready ? t('scan.scanning') : t('common.loading')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function ProductConfirmation({
  alreadyBound,
  binding,
  expectedOwner,
  onBind,
  onOpen,
  onReset,
  resolution,
}: {
  alreadyBound: boolean;
  binding: boolean;
  expectedOwner: boolean;
  onBind: () => void;
  onOpen: () => void;
  onReset: () => void;
  resolution: QrResolution;
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-section">
      <SectionCard>
        <View className="items-center rounded-card bg-background py-2">
          <ProductImage
            accessibilityLabel={resolution.sku.name}
            assetKey={resolution.sku.imageAsset}
            variant="scan"
          />
        </View>
        <View className="flex-row items-start gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <AppText variant="title" tone="foreground">
              {resolution.sku.name}
            </AppText>
            <AppText variant="caption" tone="muted">
              {resolution.cabinet.name}
            </AppText>
            {!alreadyBound ? (
              <View className="self-start pt-1">
                <Pill tone={expectedOwner ? 'blue' : 'purple'}>
                  {expectedOwner ? t('scan.modeOwner') : t('scan.modeMember')}
                </Pill>
              </View>
            ) : null}
          </View>
        </View>

        <View className="flex-row gap-2">
          <ProductDatum className="flex-1" label={t('scan.sku')} value={resolution.sku.sku} />
          <ProductDatum
            className="flex-1"
            label={t('scan.model')}
            value={resolution.sku.model}
          />
        </View>
        <ProductDatum label={t('scan.color')} value={resolution.sku.color} />

        <View className="self-start">
          <Pill tone="green">
            {t('scan.capacity', { count: resolution.sku.capacity })}
          </Pill>
        </View>
      </SectionCard>

      {alreadyBound ? (
        <Notice
          description={t('scan.alreadyBoundDescription')}
          title={t('scan.alreadyBoundTitle')}
          tone="success"
        />
      ) : null}

      <View className="gap-3">
        <ActionButton
          disabled={binding}
          icon={alreadyBound ? 'arrowForward' : 'shield'}
          label={
            alreadyBound
              ? t('scan.openCabinet')
              : binding
                ? t('scan.binding')
                : t('scan.bindAction')
          }
          onPress={alreadyBound ? onOpen : onBind}
        />
        <ActionButton
          disabled={binding}
          label={t('scan.scanAnother')}
          onPress={onReset}
          tone="neutral"
        />
      </View>
    </View>
  );
}

function ConnectedSummary({
  result,
  onOpen,
  onReset,
}: {
  result: BindCabinetResult;
  onOpen: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-section">
      <StatePanel
        action={
          <View className="w-full gap-3 pt-2">
            <ActionButton
              icon="arrowForward"
              label={t('scan.openCabinet')}
              onPress={onOpen}
            />
            <ActionButton
              label={t('scan.scanAnother')}
              onPress={onReset}
              tone="neutral"
            />
          </View>
        }
        description={t('scan.boundDescription', { cabinet: result.cabinet.name })}
        icon="shield"
        title={t('scan.boundTitle')}
      />
    </View>
  );
}

export function ScanFlow({ mode, sample = false }: { mode: ScanMode; sample?: boolean }) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const { actions, currentUser, selectors, state } = useMockApp();
  const { t } = useTranslation();
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [cameraMountError, setCameraMountError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<QrResolution | null>(null);
  const [bindResult, setBindResult] = useState<BindCabinetResult | null>(null);
  const [errorKind, setErrorKind] = useState<ScanErrorKind | null>(null);
  const [resolving, setResolving] = useState(false);
  const [binding, setBinding] = useState(false);
  const scanLockRef = useRef(false);
  const systemScannerSubscriptionRef = useRef<ReturnType<typeof CameraView.onModernBarcodeScanned> | undefined>(undefined);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setCameraAvailable(true);
      return undefined;
    }

    let active = true;
    void CameraView.isAvailableAsync()
      .then((available) => {
        if (active) {
          setCameraAvailable(available);
        }
      })
      .catch(() => {
        if (active) {
          setCameraAvailable(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => systemScannerSubscriptionRef.current?.remove(), []);

  const demoCode = useMemo(() => {
    const unboundQr = state.qrs.find(
      (qr) => qr.status === 'active' && !selectors.membershipForCurrentUser(qr.cabinetId),
    );
    return unboundQr?.code ?? state.qrs.find((qr) => qr.status === 'active')?.code;
  }, [selectors, state.qrs]);
  const alreadyBound = resolution
    ? Boolean(selectors.membershipForCurrentUser(resolution.cabinet.id))
    : false;
  const expectedOwner = resolution
    ? !state.memberships.some(
        (membership) =>
          membership.cabinetId === resolution.cabinet.id && membership.active,
      )
    : mode === 'initialize';

  const openCabinet = useCallback(
    (cabinetId: string) => {
      router.replace({
        pathname: '/cabinets/[cabinetId]',
        params: { cabinetId },
      } as never);
    },
    [router],
  );

  const resetScanner = useCallback(() => {
    scanLockRef.current = false;
    setResolution(null);
    setBindResult(null);
    setCameraMountError(null);
    setErrorKind(null);
    setResolving(false);
    setBinding(false);
  }, []);

  useEffect(() => {
    if (errorKind !== 'invalid') return undefined;
    const retryTimer = setTimeout(resetScanner, 1800);
    return () => clearTimeout(retryTimer);
  }, [errorKind, resetScanner]);

  const classifyError = useCallback((error: unknown): ScanErrorKind => {
    if (!isMockAppError(error)) {
      return 'generic';
    }
    if (error.code === 'OFFLINE') {
      return 'offline';
    }
    if (error.code === 'SESSION_EXPIRED' || error.code === 'SESSION_REQUIRED') {
      return 'session';
    }
    if (
      error.code === 'QR_NOT_FOUND' ||
      error.code === 'QR_DISABLED' ||
      error.code === 'SKU_NOT_FOUND' ||
      error.code === 'CABINET_NOT_FOUND'
    ) {
      return 'invalid';
    }
    return 'generic';
  }, []);

  const resolveCode = useCallback(
    async (code: string) => {
      if (scanLockRef.current || resolving || binding) {
        return;
      }
      scanLockRef.current = true;
      setErrorKind(null);
      setResolving(true);

      try {
        const nextResolution = await actions.resolveQr({ code });
        setResolution(nextResolution);
      } catch (error) {
        setErrorKind(classifyError(error));
      } finally {
        setResolving(false);
      }
    },
    [actions, binding, classifyError, resolving],
  );

  const launchSystemScanner = useCallback(async () => {
    if (Platform.OS === 'web' || resolving || binding) return;
    if (!CameraView.isModernBarcodeScannerAvailable) {
      setCameraMountError('system-scanner-unavailable');
      return;
    }
    scanLockRef.current = false;
    setErrorKind(null);
    setCameraMountError(null);

    systemScannerSubscriptionRef.current?.remove();
    try {
      systemScannerSubscriptionRef.current = CameraView.onModernBarcodeScanned(({ data }) => {
        systemScannerSubscriptionRef.current?.remove();
        systemScannerSubscriptionRef.current = undefined;
        void CameraView.dismissScanner();
        void resolveCode(data);
      });
      await CameraView.launchScanner({ barcodeTypes: ['qr'] });
    } catch {
      systemScannerSubscriptionRef.current?.remove();
      systemScannerSubscriptionRef.current = undefined;
      setCameraMountError('system-scanner');
    }
  }, [binding, resolveCode, resolving]);

  const bindCabinet = useCallback(async () => {
    if (!resolution || binding) {
      return;
    }
    setBinding(true);
    setErrorKind(null);
    requestSequenceRef.current += 1;

    try {
      const result = await actions.bindCabinet({
        expectedVersion: state.version,
        qrCode: resolution.qr.code,
        requestId: `scan-bind-${resolution.qr.id}-${requestSequenceRef.current}`,
      });
      setBindResult(result);
      openCabinet(result.cabinet.id);
    } catch (error) {
      setErrorKind(classifyError(error));
    } finally {
      setBinding(false);
    }
  }, [actions, binding, classifyError, openCabinet, resolution, state.version]);

  const sessionUnavailable =
    state.sessionStatus !== 'authenticated' || currentUser === null;

  useEffect(() => {
    if (!sample || !demoCode || !state.hydrated || !state.online || sessionUnavailable || resolution || bindResult || resolving || binding) {
      return;
    }
    void resolveCode(demoCode);
  }, [bindResult, binding, demoCode, resolution, resolveCode, resolving, sample, sessionUnavailable, state.hydrated, state.online]);

  let mainContent;
  if (!state.hydrated) {
    mainContent = (
      <StatePanel
        description={t('scan.cameraPurpose')}
        loading
        title={t('common.loading')}
      />
    );
  } else if (!state.online || errorKind === 'offline') {
    mainContent = (
      <StatePanel
        description={t('scan.offlineDescription')}
        icon="error"
        title={t('scan.offlineTitle')}
      />
    );
  } else if (sessionUnavailable || errorKind === 'session') {
    mainContent = (
      <StatePanel
        description={t('scan.sessionExpiredDescription')}
        icon="error"
        title={t('scan.sessionExpiredTitle')}
      />
    );
  } else if (bindResult) {
    mainContent = (
      <ConnectedSummary
        onOpen={() => openCabinet(bindResult.cabinet.id)}
        onReset={resetScanner}
        result={bindResult}
      />
    );
  } else if (errorKind) {
    mainContent = (
      <StatePanel
        action={
          <ActionButton
            icon="scan"
            label={t('common.retry')}
            onPress={resetScanner}
            tone="neutral"
          />
        }
        description={
          errorKind === 'invalid' ? t('scan.invalidDescription') : t('scan.actionFailed')
        }
        icon="error"
        title={errorKind === 'invalid' ? t('scan.invalidTitle') : t('scan.title')}
      />
    );
  } else if (resolution) {
    mainContent = (
      <ProductConfirmation
        alreadyBound={alreadyBound}
        binding={binding}
        expectedOwner={expectedOwner}
        onBind={() => void bindCabinet()}
        onOpen={() => openCabinet(resolution.cabinet.id)}
        onReset={resetScanner}
        resolution={resolution}
      />
    );
  } else if (resolving) {
    mainContent = (
      <StatePanel
        description={t('scan.scanning')}
        loading
        title={t('common.loading')}
      />
    );
  } else if (!permission || cameraAvailable === null) {
    mainContent = (
      <StatePanel
        description={t('scan.cameraPurpose')}
        loading
        title={t('common.loading')}
      />
    );
  } else if (!cameraAvailable || cameraMountError) {
    mainContent = (
      <StatePanel
        action={Platform.OS === 'web' ? (
          <ActionButton icon="scan" label={t('common.retry')} onPress={resetScanner} tone="neutral" />
        ) : (
          <View className="w-full gap-3 pt-2">
            <ActionButton icon="scan" label={t('scan.systemScanner')} onPress={() => void launchSystemScanner()} />
            <ActionButton label={t('common.retry')} onPress={resetScanner} tone="neutral" />
          </View>
        )}
        description={cameraMountError ? t('scan.cameraMountError') : t('scan.cameraUnavailableDescription')}
        icon="scan"
        title={t('scan.cameraUnavailableTitle')}
      />
    );
  } else if (!permission.granted) {
    mainContent = (
      <StatePanel
        action={permission.canAskAgain ? (
            <ActionButton
              icon="scan"
              label={t('scan.requestPermission')}
              onPress={() => void requestPermission()}
            />
          ) : (
            <ActionButton
              icon="settings"
              label={t('scan.openSettings')}
              onPress={() => void Linking.openSettings()}
              tone="neutral"
            />
          )}
        description={
          permission.canAskAgain ? t('scan.permissionDescription') : t('scan.permissionDenied')
        }
        icon="scan"
        title={t('scan.permissionTitle')}
      />
    );
  } else if (!isFocused) {
    mainContent = null;
  } else {
    mainContent = (
      <ScannerPreview
        active={isFocused && !scanLockRef.current}
        onCode={(code) => void resolveCode(code)}
        onMountError={(message) => setCameraMountError(message)}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="bg-background">
        <View className="mx-auto w-full max-w-content px-screen py-3">
          <ScreenHeader title={t('scan.title')} />
        </View>
      </View>

      <ScrollView
        className="min-w-0 flex-1"
        contentContainerClassName="mx-auto w-full max-w-content gap-section px-screen pb-screen pt-screen"
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {mainContent}
      </ScrollView>
    </SafeAreaView>
  );
}

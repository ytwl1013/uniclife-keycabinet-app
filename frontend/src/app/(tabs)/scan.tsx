import { useLocalSearchParams } from 'expo-router';

import { ScanFlow, ScanMode } from '@/features/scan/components/scan-flow';

export default function ScanRoute() {
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string | string[] }>();
  const rawMode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const mode: ScanMode = rawMode === 'initialize' ? 'initialize' : 'join';

  return <ScanFlow mode={mode} />;
}

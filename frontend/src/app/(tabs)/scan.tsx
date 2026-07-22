import { useLocalSearchParams } from 'expo-router';

import { ScanFlow, ScanMode } from '@/features/scan/components/scan-flow';

export default function ScanRoute() {
  const { mode: modeParam, sample: sampleParam } = useLocalSearchParams<{ mode?: string | string[]; sample?: string | string[] }>();
  const rawMode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const rawSample = Array.isArray(sampleParam) ? sampleParam[0] : sampleParam;
  const mode: ScanMode = rawMode === 'initialize' ? 'initialize' : 'join';

  return <ScanFlow mode={mode} sample={rawSample === '1'} />;
}
